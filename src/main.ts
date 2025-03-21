import { Menu, MenuItem, Plugin, Keymap } from 'obsidian';
import Sortable from 'sortablejs';
import { around } from 'monkey-around';
import { ResetOrderConfirmationModal } from './ResetOrderConfirmationModal';
import { OrderManager } from './OrderManager';



export default class ManualSortingPlugin extends Plugin {
	private manualSortingEnabled: boolean = true;
	private orderManager = new OrderManager(this);
	private explorerUnpatchFunctions: Function[] = [];
	private unpatchMenu: Function | null = null;
	private folderBeingCreatedManually: boolean = false;
	
	async onload() {
		this.app.workspace.onLayoutReady(() => {
			this.initialize();
		});
	}

	async onunload() {
		this.explorerUnpatchFunctions.forEach(unpatch => unpatch());
		this.explorerUnpatchFunctions = [];
		this.reloadExplorerPlugin();
		this.unpatchMenu && this.unpatchMenu() && (this.unpatchMenu = null);
	}

	async initialize() {
		this.patchSortOrderMenu();
		await this.patchFileExplorer();
		await this.orderManager.initOrder();
		this.reloadExplorerPlugin();
		
		this.registerEvent(this.app.vault.on('create', (treeItem) => {
			console.log('Manually created item:', treeItem);
			const itemIsFolder = !!treeItem.children;
			if (itemIsFolder) {
				this.folderBeingCreatedManually = true;
			}
		}));
	}

	async patchFileExplorer() {
		
		const waitForExplorer = () => {
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
		};

		await waitForExplorer();
		const explorerView = this.app.workspace.getLeavesOfType("file-explorer")[0].view;
		const thisPlugin = this;

		this.explorerUnpatchFunctions.push(
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
									childPath && thisPlugin.orderManager.updateOrder();

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
						console.log(`Adding`, addedItem, addedItem.firstChild.getAttribute("data-path"));
						const itemContainer = this;

						thisPlugin.orderManager.updateOrder();
						if (thisPlugin.folderBeingCreatedManually) {
							console.log('Folder is being created manually');
							thisPlugin.folderBeingCreatedManually = false;
						} else {
							thisPlugin.orderManager.restoreOrder(itemContainer);
						}

						if (!Sortable.get(itemContainer)) {
							console.log(`Initiating Sortable on`, itemContainer);
							new Sortable(itemContainer, {
								group: "nested",
								draggable: ".tree-item",
								chosenClass: "manual-sorting-chosen",
								ghostClass: "manual-sorting-ghost",
								animation: 100,
								swapThreshold: 0.18,
								fallbackOnBody: true,
								delay: 10,
								delayOnTouchOnly: true,
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

									const previousItem = evt.item.previousElementSibling;
									let previousItemPath = previousItem?.firstChild?.getAttribute("data-path");

									if (draggedOverElementPath) {
										previousItemPath = null;
									}
									thisPlugin.orderManager.moveFile(draggedItemPath, itemDestPath, previousItemPath);
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
							this.prepend(child);
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
				},
				detach: (original) => function (...args) {
					if (!thisPlugin.manualSortingEnabled) {
						return original.apply(this, args);
					}
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

		this.explorerUnpatchFunctions.push(
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

		this.explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf(explorerView.tree), {
				setFocusedItem: (original) => function (e, t) {
					if (!thisPlugin.manualSortingEnabled) {
						return original.apply(this, [e, t]);
					}
					void 0 === t && (t = !0),
					e !== this.root && (this.isItem(this.focusedItem) && this.focusedItem.selfEl.removeClass("has-focus"),
					this.focusedItem = e,
					e && this.isItem(e) && (e.selfEl.addClass("has-focus")));
					// t && this.infinityScroll.scrollIntoView(e)))
				},
				handleItemSelection: (original) => function (e, t) {
					if (!thisPlugin.manualSortingEnabled) {
						return original.apply(this, [e, t]);
					}

					function getItemsBetween(allPaths, path1, path2) {
						const index1 = allPaths.indexOf(path1);
						const index2 = allPaths.indexOf(path2);

						if (index1 === -1 || index2 === -1) {
							return [];
						}

						const startIndex = Math.min(index1, index2);
						const endIndex = Math.max(index1, index2);

						return allPaths.slice(startIndex, endIndex + 1).map(path =>
							thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view.fileItems[path]
						);
					}

					var n = this
						, i = n.selectedDoms
						, r = n.activeDom
						, o = n.view;
					if (!Keymap.isModEvent(e)) {
						if (e.altKey && !e.shiftKey)
							return this.app.workspace.setActiveLeaf(o.leaf, {
								focus: !0
							}),
								i.has(t) ? this.deselectItem(t) : (this.selectItem(t),
									this.setFocusedItem(t, !1),
									this.activeDom = t),
								!0;
						if (e.shiftKey) {
							this.app.workspace.setActiveLeaf(o.leaf, {
								focus: !0
							});
							const flattenPaths = thisPlugin.orderManager.getFlattenPaths();
							const itemsBetween = getItemsBetween(flattenPaths, r.file.path, t.file.path);
							for (var a = 0, s = r ? itemsBetween : [t]; a < s.length; a++) {
								var l = s[a];
								this.selectItem(l)
							}
							return !0
						}
						if (t.selfEl.hasClass("is-being-renamed"))
							return !0;
						if (t.selfEl.hasClass("is-active"))
							return this.app.workspace.setActiveLeaf(o.leaf, {
								focus: !0
							}),
								this.setFocusedItem(t, !1),
								!0
					}
					return this.clearSelectedDoms(),
						this.setFocusedItem(null),
						this.activeDom = t,
						!1
				}
			})
		);
	}

	async reloadExplorerPlugin() {
        const fileExplorerPlugin = this.app.internalPlugins.plugins['file-explorer'];
        fileExplorerPlugin.disable();
        await fileExplorerPlugin.enable();
		console.log("File Explorer plugin reloaded");

		if (this.app.plugins.getPlugin('folder-notes')) {
			console.log('Reloading Folder Notes plugin');
			await this.app.plugins.disablePlugin('folder-notes');
			this.app.plugins.enablePlugin('folder-notes');
		}
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
