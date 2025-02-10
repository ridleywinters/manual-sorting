import { Plugin } from 'obsidian';
import Sortable from 'sortablejs';
import { around } from 'monkey-around';


function debugLog(...args: any[]) {
	if(process.env.NODE_ENV === "development") {
		console.log(...args);
	}
}


declare module 'obsidian' {
	interface TFolder {
		allChildrenRendered?: boolean;
		prevActualChildrenCount?: number;
	}
}


export default class ManualSortingPlugin extends Plugin {
	async onload() {
		if (this.app.workspace.layoutReady) {
			this.initialize();
		} else {
			this.registerEvent(this.app.workspace.on("layout-ready", this.initialize.bind(this)));
		}
	}

	async initialize() {
		await this.patchFileExplorer();
	}

	async patchFileExplorer() {
		const explorerView = this.app.workspace.getLeavesOfType("file-explorer")[0].view;
		const thisPlugin = this;

		around(explorerView.tree.infinityScroll.rootEl.childrenEl.__proto__, {
			setChildrenInPlace: (original) => function (...args) {
				const newChildren = args[0];
				const currentChildren = Array.from(this.children);
				const newChildrenSet = new Set(newChildren);

				for (const child of currentChildren) {
					if (!newChildrenSet.has(child)) {
						const container = child.parentElement;
						this.removeChild(child);
						if (child.classList.contains("tree-item")) {
							debugLog(`Removing`, child, child.firstChild.getAttribute("data-path"));
							const itemContainerPath = container.previousElementSibling?.getAttribute("data-path") || "/";
							const itemContainer = thisPlugin.app.vault.getFolderByPath(itemContainerPath);
							itemContainer.prevActualChildrenCount = itemContainer?.children.length;
						}
					}
				}

				const processNewItem = (addedItem) => {
					debugLog(`Adding`, addedItem, addedItem.firstChild.getAttribute("data-path"));
					const itemContainer = this;

					const renderedChildrenCount = itemContainer.querySelectorAll(':scope > .tree-item').length;
					const itemInstance = thisPlugin.app.vault.getAbstractFileByPath(addedItem.firstChild.getAttribute("data-path"));
					const targetFolder = itemInstance?.parent;
					const actualChildrenCount = targetFolder?.children.length;

					if (targetFolder?.prevActualChildrenCount < actualChildrenCount) {
						debugLog("New item created:", addedItem);
					}

					if (!targetFolder?.allChildrenRendered && renderedChildrenCount === actualChildrenCount) {
						debugLog("All children rendered for", itemContainer.parentElement, targetFolder?.path);
						targetFolder.allChildrenRendered = true;
						targetFolder.prevActualChildrenCount = actualChildrenCount;
					}

					targetFolder.prevActualChildrenCount = actualChildrenCount;
					if (itemInstance.children) {
						itemInstance.prevActualChildrenCount = itemInstance?.children.length;
					}

					if (!Sortable.get(itemContainer)) {
						debugLog(`Initiating Sortable on`, itemContainer.parentElement);
						new Sortable(itemContainer, {
							group: "nested",
							draggable: ".tree-item",
							animation: 100,
							fallbackOnBody: true,
						});
					}
				}

				for (const child of newChildren) {
					if (!this.contains(child)) {
						this.appendChild(child);
						if (child.classList.contains("tree-item")) {
							if (!child.firstChild.hasAttribute("data-path")) {
								new MutationObserver((mutations, obs) => {
									for (const mutation of mutations) {
										if (mutation.attributeName === "data-path") {
											processNewItem(child);
											obs.disconnect();
											return;
										}
									}
								}).observe(child.firstChild, { attributes: true, attributeFilter: ["data-path"] });
							} else {
								processNewItem(child);
							}
						}
					}
				}
			}
		})
	}
}


class OrderManager {
	constructor(private plugin: Plugin) {}

	private async saveOrder(container: Element) {
		const itemPaths = Array.from(container.children)
			.filter((item) => item.classList.contains("tree-item"))
			.map((item) => item.firstElementChild?.getAttribute("data-path"))
			.filter((item): item is string => item !== null && item !== undefined);

		const folderPath = container?.previousElementSibling?.getAttribute("data-path") || "/";
		const currentData = await this.plugin.loadData() || {};

		currentData[folderPath] = itemPaths;
		await this.plugin.saveData(currentData);

		debugLog(`Order saved for "${folderPath}":`, container, await this.plugin.loadData());
	}

	async restoreOrder(container: Element) {
		const savedData = await this.plugin.loadData();
		const folderPath = container?.previousElementSibling?.getAttribute("data-path") || "/";
		const savedOrder = savedData?.[folderPath];
		if (!savedOrder) return;

		const itemsByPath = new Map<string, Element>();
		Array.from(container.children).forEach((child: Element) => {
			const path = child.firstElementChild?.getAttribute("data-path");
			if (path) {
				itemsByPath.set(path, child);
			}
		});

		const fragment = document.createDocumentFragment();
		savedOrder.forEach((path: string) => {
			const element = itemsByPath.get(path);
			if (element) {
				fragment.appendChild(element);
			}
		});

		container.appendChild(fragment);
		debugLog(`Order restored for "${folderPath}":`, container, savedOrder);
	}
}
