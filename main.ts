import { Plugin } from 'obsidian';
import { around } from 'monkey-around';


function debugLog(...args: any[]) {
	if(process.env.NODE_ENV === "development") {
		console.log(...args);
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

		around(explorerView.tree.infinityScroll.rootEl.childrenEl.__proto__, {
			setChildrenInPlace: (original) => function (...args) {
				const newChildren = args[0];
				const currentChildren = Array.from(this.children);
				const newChildrenSet = new Set(newChildren);

				for (const child of currentChildren) {
					if (!newChildrenSet.has(child)) {
						this.removeChild(child);
						if (child.classList.contains("tree-item")) {
							debugLog(`Removing`, child, child.firstChild.getAttribute("data-path"));
						}
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
											debugLog(`Adding`, child, child.firstChild.getAttribute("data-path"));
											obs.disconnect();
											return;
										}
									}
								}).observe(child.firstChild, { attributes: true, attributeFilter: ["data-path"] });
							} else {
								debugLog(`Adding`, child, child.firstChild.getAttribute("data-path"));
							}
						}
					}
				}
			}
		})
	}
}
