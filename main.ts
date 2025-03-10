import { App, ButtonComponent, Menu, MenuItem, Modal, Plugin } from 'obsidian';
import Sortable from 'sortablejs';
import { around } from 'monkey-around';
import {i18n} from "i18next";


function debugLog(...args: any[]) {
	if(process.env.NODE_ENV === "development") {
		console.log(...args);
	}
}


declare global {
	const i18next: i18n;
}


export default class ManualSortingPlugin extends Plugin {
	private manualSortingEnabled: boolean = true;
	private orderManager = new OrderManager(this);
	private explorerPatches: Function[] = [];
	private unpatchMenu: Function | null = null;
	
	async onload() {
		this.app.workspace.onLayoutReady(() => {
			this.initialize();
		});
	}

	async onunload() {
		this.explorerPatches.forEach(unpatch => unpatch());
		this.explorerPatches = [];
		this.reloadExplorerPlugin();
		this.unpatchMenu && this.unpatchMenu() && (this.unpatchMenu = null);
	}

	async initialize() {
		this.patchSortOrderMenu();
		await this.patchFileExplorer();
		await this.orderManager.initOrder();
		await this.reloadExplorerPlugin();	
	}

	async waitForExplorer() {
		return new Promise<void>((resolve) => {
			const observer = new MutationObserver((_, obs) => {
				const explorer = document.querySelector('[data-type="file-explorer"] .nav-files-container');
				if (explorer) {
					obs.disconnect();
					resolve();
				}
			});
			const workspace = document.querySelector(".workspace");
			workspace && observer.observe(workspace, { childList: true, subtree: true });
		});
	}

	async patchFileExplorer() {
		await this.waitForExplorer();
		const explorerView = this.app.workspace.getLeavesOfType("file-explorer")[0].view;
		const thisPlugin = this;

		this.explorerPatches.push(
			around(Object.getPrototypeOf(explorerView.tree?.infinityScroll.rootEl.childrenEl), {
				setChildrenInPlace: (original) => function (...args) {
					const isInExplorer = !!this.closest('[data-type="file-explorer"]');
					const isTreeItem = this.classList.value.includes("tree-item");
					if (!thisPlugin.manualSortingEnabled || !isTreeItem && !isInExplorer) {
						return original.apply(this, args);
					}

					const newChildren = args[0];
					const currentChildren = Array.from(this.children);
					const newChildrenSet = new Set(newChildren);

					for (const child of currentChildren) {
						if (!newChildrenSet.has(child)) {
							const container = child.parentElement;
							const childPath = child?.firstChild?.getAttribute("data-path");

							if (childPath && child?.classList.contains("tree-item")) {
								const itemObject = thisPlugin.app.vault.getAbstractFileByPath(childPath);
								
								if (!itemObject) {
									childPath && thisPlugin.orderManager.deleteItem(childPath);

									const itemContainerPath = container.previousElementSibling?.getAttribute("data-path") || "/";
									const itemContainer = thisPlugin.app.vault.getFolderByPath(itemContainerPath);
									itemContainer.prevActualChildrenCount = itemContainer?.children.length;
								} else {
									continue;
								}
							}

							this.removeChild(child);
						}
					}

					const processNewItem = (addedItem) => {
						debugLog(`Adding`, addedItem, addedItem.firstChild.getAttribute("data-path"));
						const itemContainer = this;

						thisPlugin.orderManager.updateOrder();
						thisPlugin.orderManager.restoreOrder(itemContainer);

						if (!Sortable.get(itemContainer)) {
							debugLog(`Initiating Sortable on`, itemContainer.parentElement);
							new Sortable(itemContainer, {
								group: "nested",
								draggable: ".tree-item",
								animation: 200,
								swapThreshold: 0.18,
								fallbackOnBody: true,
								onStart: (evt) => {
									const itemPath = evt.item.firstChild.getAttribute("data-path");
									const itemObject = thisPlugin.app.vault.getFolderByPath(itemPath);

									if (itemObject) {
										const explorerView = thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view;
										explorerView.fileItems[itemObject.path].setCollapsed(true);
										// for some reason Obsidian expands the folder, so we simulate its expanded state
										explorerView.fileItems[itemObject.path].collapsed = false;
									}
								},
								onEnd: (evt) => {
									const draggedOverElement = document.querySelector(".is-being-dragged-over");
									const draggedItemPath = evt.item.firstChild.getAttribute("data-path");
									let destinationPath = evt.to?.previousElementSibling?.getAttribute("data-path") || "/";
									
									const draggedOverElementPath = draggedOverElement?.firstChild?.getAttribute("data-path");
									if (draggedOverElementPath) {
										destinationPath = draggedOverElementPath;
									}

									const movedItem = thisPlugin.app.vault.getAbstractFileByPath(draggedItemPath);

									const targetFolder = thisPlugin.app.vault.getFolderByPath(destinationPath);
									const itemDestPath = `${(!targetFolder?.isRoot()) ? (destinationPath + '/') : ''}${movedItem?.name}`;
									evt.item.firstChild.setAttribute("data-path", itemDestPath);					

									const itemIsFolder = !!movedItem?.children;
									if (itemIsFolder || thisPlugin.app.isMobile) {
										thisPlugin.app.fileManager.renameFile(movedItem, `${(!targetFolder?.isRoot()) ? (destinationPath + '/') : ''}${movedItem?.name}`);

										const explorerView = thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view;
										explorerView.fileItems[movedItem.path].collapsed = true;
									}

									const nextItem = evt.item.nextElementSibling;
									let nextItemPath = nextItem?.firstChild?.getAttribute("data-path");
									if (draggedOverElementPath) {
										nextItemPath = null;
									}
									thisPlugin.orderManager.moveFile(draggedItemPath, itemDestPath, nextItemPath);
									thisPlugin.orderManager.restoreOrder(evt.to);
								},
								onUnchoose: () => {
									document.body.classList.toggle('is-grabbing', false);
								},
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
		);

		this.explorerPatches.push(
			around(Object.getPrototypeOf(explorerView), {
				onRename: (original) => async function (...args) {
					await original.apply(this, args);
					if (!thisPlugin.manualSortingEnabled) {
						return;
					}
					
					thisPlugin.orderManager.renameItem(args[1], args[0].path);
				},
				setSortOrder: (original) => async function (...args) {
					if (!thisPlugin.manualSortingEnabled) {
						return await original.apply(this, args);
					}
					thisPlugin.manualSortingEnabled = false;
					await original.apply(this, args);
					thisPlugin.reloadExplorerPlugin();
				},
			})
		);

		this.explorerPatches.push(
			around(Object.getPrototypeOf(explorerView.tree?.infinityScroll.rootEl.childrenEl), {
				detach: (original) => function (...args) {
					const itemNode = this;
					const itemPath = itemNode?.firstChild?.getAttribute?.("data-path");
					const itemObject = thisPlugin.app.vault.getAbstractFileByPath(itemPath);

					// Prevent detaching of existing items
					if (!itemObject) {
						return original.apply(this, args);
					}
				}
			})
		);
	}

	async reloadExplorerPlugin() {
        const fileExplorerPlugin = this.app.internalPlugins.plugins['file-explorer'];
        fileExplorerPlugin.disable();
        await fileExplorerPlugin.enable();

		const folderNotesPlugin = await this.app.plugins.getPlugin('folder-notes');
		if (folderNotesPlugin) {
			await this.reloadFolderNotesPlugin();
		}
    }

	async reloadFolderNotesPlugin() {
		await this.app.plugins.disablePlugin('folder-notes');
		await this.app.plugins.enablePlugin('folder-notes');
		debugLog('Folder Notes plugin has been reloaded.');
	}

	async patchSortOrderMenu() {
		const thisPlugin = this;
		this.unpatchMenu = around(Menu.prototype, {
			showAtMouseEvent: (original) => function (...args) {
				const openMenuButton = args[0].target as HTMLElement;
				if (openMenuButton.getAttribute('aria-label') === i18next.t("plugins.file-explorer.action-change-sort") &&
					openMenuButton.classList.contains('nav-action-button')
				) {
					const menu = this;
					menu.sections.unshift("custom-sorting");
					if (thisPlugin.manualSortingEnabled) {
						menu.items.find((item: { checked: boolean; }) => item.checked === true).setChecked(false);
					}
					const sortingMenuSection = "manual-sorting";
					menu.addItem((item: MenuItem) => {
						item.setTitle('📌 Manual sorting')
							.setChecked(thisPlugin.manualSortingEnabled)
							.setSection(sortingMenuSection)
							.onClick(async () => {
								if (!thisPlugin.manualSortingEnabled) {
									thisPlugin.manualSortingEnabled = true;
									await thisPlugin.orderManager.initOrder();
									await thisPlugin.reloadExplorerPlugin();
								}
							});
					});
					if (thisPlugin.manualSortingEnabled) {
						menu.addItem((item: MenuItem) => {
							item.setTitle('🗑️ Reset order')
								.setSection(sortingMenuSection)
								.onClick(async () => {
									new ResetOrderConfirmationModal(thisPlugin.app, async () => {
										await thisPlugin.orderManager.resetOrder();
										await thisPlugin.orderManager.initOrder();
										await thisPlugin.reloadExplorerPlugin();
									}).open();
								});
						});
					}
					let menuItems = menu.items;
					let menuSeparator = menuItems.splice(8, 1)[0];
					menuItems.splice(0, 0, menuSeparator);
				}
				original.apply(this, args);
			}
		});
	}
}


class OrderManager {
    private _operationQueue: Promise<void> = Promise.resolve();

    constructor(private plugin: Plugin) {}

    private async _queueOperation(operation: () => Promise<void>) {
        this._operationQueue = this._operationQueue.finally(operation);
        return this._operationQueue;
    }

    async initOrder() {
        return this._queueOperation(async () => {
			const savedOrder = await this.plugin.loadData();
			const savedOrderExists = savedOrder && Object.keys(savedOrder).length > 0;
			const currentOrder = await this._getCurrentOrder();

			if (savedOrderExists) {
				this.updateOrder(currentOrder, savedOrder);
			} else {
				await this.plugin.saveData(currentOrder);
			}
		});
    }

	async resetOrder() {
		return this._queueOperation(async () => {
            await this.plugin.saveData({});
        });
	}

	async updateOrder(currentOrderParam?: object, savedOrderParam?: object) {
		return this._queueOperation(async () => {
			const currentOrder = currentOrderParam || await this._getCurrentOrder();
			const savedOrder = savedOrderParam || await this.plugin.loadData();
			const newOrder = await this._matchSavedOrder(currentOrder, savedOrder);
			await this.plugin.saveData(newOrder);
			this.plugin.app.workspace.getLeavesOfType("file-explorer")[0].view.tree.infinityScroll.updateVirtualDisplay();
		});
	}

    private async _getCurrentOrder() {
        const currentData = {};
        const explorerView = this.plugin.app.workspace.getLeavesOfType("file-explorer")[0]?.view;

        const indexFolder = (folder) => {
            const sortedItems = explorerView.getSortedFolderItems(folder);
            const sortedItemPaths = sortedItems.map((item) => item.file.path);
            currentData[folder.path] = sortedItemPaths;

            for (const item of sortedItems) {
                const itemObject = item.file;
                if (itemObject.children) {
                    indexFolder(itemObject);
                }
            }
        };

        indexFolder(this.plugin.app.vault.root);
        return currentData;
    }

    private async _matchSavedOrder(currentOrder, savedOrder) {
        let result = {};

        for (let folder in currentOrder) {
            if (savedOrder[folder]) {
                let prevOrder = savedOrder[folder];
                let currentFiles = currentOrder[folder];
                // Leave the files that have already been saved
                let existingFiles = prevOrder.filter(file => currentFiles.includes(file));
                // Add new files to the end of the list
                let newFiles = currentFiles.filter(file => !prevOrder.includes(file));
                result[folder] = [...existingFiles, ...newFiles];
            } else {
                result[folder] = currentOrder[folder];
            }
        }

        return result;
    }

    async moveFile(oldPath: string, newPath: string, afterPath: string) {
        return this._queueOperation(async () => {
            debugLog(`Moving "${oldPath}" to "${newPath}" before "${afterPath}"`);
            const data = await this.plugin.loadData();

            const oldDir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
            data[oldDir] = data[oldDir].filter(item => item !== oldPath);

            const newDir = newPath.substring(0, newPath.lastIndexOf("/")) || "/";

            if (afterPath) {
                const afterIndex = data[newDir].indexOf(afterPath);
                data[newDir].splice(afterIndex, 0, newPath);
            } else {
                data[newDir].push(newPath);
            }

            await this.plugin.saveData(data);
			this.updateOrder();
        });
    }

    async renameItem(oldPath: string, newPath: string) {
        return this._queueOperation(async () => {
            debugLog(`Renaming "${oldPath}" to "${newPath}"`);
            const data = await this.plugin.loadData();

            const oldDir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
			if (data[oldDir]) {
				data[oldDir] = data[oldDir].map(item => (item === oldPath ? newPath : item));
			}

            const itemIsFolder = !!data[oldPath];
            if (itemIsFolder) {
                data[newPath] = data[oldPath];
                delete data[oldPath];
                data[newPath] = data[newPath].map(item => item.replace(oldPath, newPath));
            }

            await this.plugin.saveData(data);
			this.updateOrder();
        });
    }

    async deleteItem(path: string) {
        return this._queueOperation(async () => {
            debugLog(`Deleting "${path}"`);
            const data = await this.plugin.loadData();

            const dir = path.substring(0, path.lastIndexOf("/")) || "/";
            data[dir] = data[dir].filter(item => item !== path);

            const itemIsFolder = !!data[path];
            if (itemIsFolder) {
                delete data[path];
            }

            await this.plugin.saveData(data);
			this.updateOrder();
        });
    }

	async restoreOrder(container: Element) {
        return this._queueOperation(async () => {
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
            debugLog(`Order restored for "${folderPath}"`);
        });
    }
}


export class ResetOrderConfirmationModal extends Modal {
    constructor(app: App, onSubmit: () => void) {
        super(app);
        this.setTitle("Manual sorting");

        const modalContent = this.contentEl.createEl("div");
        modalContent.createEl("p", { text: "Are you sure you want to reset order to default?" });

        const modalButtons = modalContent.createEl("div", { cls: "modal-buttons" });
        new ButtonComponent(modalButtons)
            .setButtonText("Yep")
            .setCta()
            .onClick(() => {
                this.close();
                onSubmit();
            });

        new ButtonComponent(modalButtons)
            .setButtonText("Cancel")
            .onClick(() => this.close());
    }
}
