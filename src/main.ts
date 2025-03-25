import { Menu, MenuItem, Plugin, Keymap } from 'obsidian';
import Sortable from 'sortablejs';
import { around } from 'monkey-around';
import { ResetOrderConfirmationModal } from './ResetOrderConfirmationModal';
import { OrderManager } from './OrderManager';



export default class ManualSortingPlugin extends Plugin {
	private _manualSortingEnabled: boolean = true;
	private _orderManager = new OrderManager(this);
	private _explorerUnpatchFunctions: Function[] = [];
	private _unpatchMenu: Function | null = null;
	private _folderBeingCreatedManually: boolean = false;
	private _recentExplorerAction: string = '';

	async onload() {
		this.app.workspace.onLayoutReady(() => {
			this.initialize();
		});
	}

	async onunload() {
		this._explorerUnpatchFunctions.forEach(unpatch => unpatch());
		this._explorerUnpatchFunctions = [];
		this.reloadExplorerPlugin();
		this._unpatchMenu && this._unpatchMenu() && (this._unpatchMenu = null);
	}

	async initialize() {
		this.patchSortOrderMenu();
		await this.patchFileExplorer();
		await this._orderManager.initOrder();
		this.reloadExplorerPlugin();
		
		this.registerEvent(this.app.vault.on('create', (treeItem) => {
			console.log('Manually created item:', treeItem);
			const itemIsFolder = !!treeItem.children;
			if (itemIsFolder) {
				this._folderBeingCreatedManually = true;
			}
		}));
	}

	async waitForExplorer() {
		return new Promise<Element>((resolve) => {
			const getExplorer = () => document.querySelector('[data-type="file-explorer"] .nav-files-container');
			const explorer = getExplorer();
			if (explorer) return resolve(explorer);

			const observer = new MutationObserver((_, obs) => {
				const explorer = getExplorer();
				if (explorer) {
					obs.disconnect();
					resolve(explorer);
				}
			});
			const workspace = document.querySelector(".workspace");
			workspace && observer.observe(workspace, { childList: true, subtree: true });
		});
	};

	async patchFileExplorer() {
		await this.waitForExplorer();
		const explorerView = this.app.workspace.getLeavesOfType("file-explorer")[0].view;
		const thisPlugin = this;

		this._explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf(explorerView.tree?.infinityScroll.rootEl.childrenEl), {
				setChildrenInPlace: (original) => function (...args) {
					const isInExplorer = !!this.closest('[data-type="file-explorer"]');
					const isTreeItem = this.classList.value.includes("tree-item");

					const parentLeafContent = this.closest('.workspace-leaf-content');
					const parentLeafContentType = parentLeafContent?.getAttribute('data-type');
					const isNotInExplorerLeaf = parentLeafContentType !== 'file-explorer';

					if (!thisPlugin._manualSortingEnabled || (parentLeafContent && isNotInExplorerLeaf) || !isTreeItem && !isInExplorer) {
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
									childPath && thisPlugin._orderManager.updateOrder();

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
						const path = addedItem.firstChild.getAttribute("data-path");
						console.log(`Adding`, addedItem, path);
						const itemContainer = this;
						const elementFolderPath = path.substring(0, path.lastIndexOf('/')) || "/";
						console.log(`Item container:`, itemContainer, elementFolderPath);

						thisPlugin._orderManager.updateOrder();
						if (thisPlugin._folderBeingCreatedManually) {
							console.log('Folder is being created manually');
							thisPlugin._folderBeingCreatedManually = false;
						} else {
							thisPlugin._orderManager.restoreOrder(itemContainer, elementFolderPath);
						}

						function makeSortable(container) {
							if (Sortable.get(container)) return;

							console.log(`Initiating Sortable on`, container);
							const minSwapThreshold = 0.3;
							const maxSwapThreshold = 2;

							function adjustSwapThreshold(item) {
								const previousItem = item.previousElementSibling;
								const nextItem = item.nextElementSibling;

								let adjacentNavFolders = [];
								if (previousItem?.classList.contains("nav-folder")) {
									adjacentNavFolders.push(previousItem);
								}
								if (nextItem?.classList.contains("nav-folder")) {
									adjacentNavFolders.push(nextItem);
								}

								if (adjacentNavFolders.length > 0) {
									sortableInstance.options.swapThreshold = minSwapThreshold;

									adjacentNavFolders.forEach(navFolder => {
										let childrenContainer = navFolder.querySelector('.tree-item-children');
										if (childrenContainer) {
											makeSortable(childrenContainer);
										}
									});
								} else {
									sortableInstance.options.swapThreshold = maxSwapThreshold;
								}
							}

							const sortableInstance = new Sortable(container, {
								group: "nested",
								draggable: ".tree-item",
								chosenClass: "manual-sorting-chosen",
								ghostClass: "manual-sorting-ghost",

								animation: 100,
								swapThreshold: maxSwapThreshold,
								fallbackOnBody: true,

								delay: 100,
								delayOnTouchOnly: true,

								setData: function (dataTransfer: DataTransfer, dragEl: HTMLElement) {
									dataTransfer.setData('string', 'text/plain');
									dataTransfer.setData('string', 'text/uri-list');
									dataTransfer.effectAllowed = "all";
								},
								onChoose: (evt) => {
									console.log("Sortable: onChoose");
									const dragged = evt.item;
									adjustSwapThreshold(dragged);
								},
								onStart: (evt) => {
									console.log("Sortable: onStart");
									const itemPath = evt.item.firstChild.getAttribute("data-path");
									const itemObject = thisPlugin.app.vault.getFolderByPath(itemPath);

									if (itemObject) {
										const explorerView = thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view;
										explorerView.fileItems[itemObject.path].setCollapsed(true);
										// for some reason Obsidian expands the folder, so we simulate its expanded state
										explorerView.fileItems[itemObject.path].collapsed = false;
									}
								},
								onChange: (evt) => {
									console.log("Sortable: onChange");
									const dragged = evt.item;
									adjustSwapThreshold(dragged);
								},
								onEnd: (evt) => {
									console.log("Sortable: onEnd");
									const draggedOverElement = document.querySelector(".is-being-dragged-over");
									const draggedItemPath = evt.item.firstChild.getAttribute("data-path");
									const draggedOverElementPath = draggedOverElement?.firstChild?.getAttribute("data-path");
									const destinationPath = draggedOverElementPath || evt.to?.previousElementSibling?.getAttribute("data-path") || "/";

									const movedItem = thisPlugin.app.vault.getAbstractFileByPath(draggedItemPath);
									const targetFolder = thisPlugin.app.vault.getFolderByPath(destinationPath);
									const itemDestPath = `${(!targetFolder?.isRoot()) ? (destinationPath + '/') : ''}${movedItem?.name}`;
									thisPlugin.app.fileManager.renameFile(movedItem, itemDestPath);

									const itemIsFolder = !!movedItem?.children;
									itemIsFolder && (thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view.fileItems[movedItem.path].collapsed = true);

									const previousItem = evt.item.previousElementSibling;
									const previousItemPath = draggedOverElementPath ? null : previousItem?.firstChild?.getAttribute("data-path");
									thisPlugin._orderManager.moveFile(draggedItemPath, itemDestPath, previousItemPath);
									thisPlugin._orderManager.restoreOrder(evt.to, destinationPath);
								},
								onUnchoose: () => {
									console.log("Sortable: onUnchoose");
									document.body.classList.toggle('is-grabbing', false);
								},
							});
						}
						makeSortable(itemContainer);
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
					if (!thisPlugin._manualSortingEnabled) {
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

		this._explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf(explorerView), {
				onRename: (original) => function (...args) {
					original.apply(this, args);
					if (thisPlugin._manualSortingEnabled) {
						thisPlugin._orderManager.renameItem(args[1], args[0].path);
					}
				},
				setSortOrder: (original) => function (...args) {
					original.apply(this, args);
					if (thisPlugin._manualSortingEnabled) {
						thisPlugin._manualSortingEnabled = false;
						thisPlugin.reloadExplorerPlugin();
					}
				},
				sort: (original) => function (...args) {
					thisPlugin._recentExplorerAction = 'sort';
					original.apply(this, args);
				}
			})
		);

		this._explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf(explorerView.tree), {
				setFocusedItem: (original) => function (...args) {
					thisPlugin._recentExplorerAction = 'setFocusedItem';
					original.apply(this, args);
				},
				handleItemSelection: (original) => function (e, t) {
					if (!thisPlugin._manualSortingEnabled) {
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
							const flattenPaths = thisPlugin._orderManager.getFlattenPaths();
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

		this._explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf(explorerView.tree?.infinityScroll), {
				scrollIntoView: (original) => function (...args) {
					const targetElement = args[0].el;
					const isInExplorer = !!targetElement.closest('[data-type="file-explorer"]');

					if (!thisPlugin._manualSortingEnabled || !isInExplorer) {
						return original.apply(this, args);
					}

					if (thisPlugin._recentExplorerAction) {
						thisPlugin._recentExplorerAction = '';
						return;
					}

					const container = this.scrollEl;
					const offsetTop = targetElement.offsetTop - container.offsetTop;
					const middleAlign = offsetTop - (container.clientHeight * 0.3) + (targetElement.clientHeight / 2);

					container.scrollTo({ top: middleAlign, behavior: 'smooth' });
				}
			})
		);
	}

	async reloadExplorerPlugin() {
        const fileExplorerPlugin = this.app.internalPlugins.plugins['file-explorer'];
        fileExplorerPlugin.disable();
        await fileExplorerPlugin.enable();
		console.log("File Explorer plugin reloaded");

		const toggleSortingClass = async () => {
			const explorerEl = await this.waitForExplorer();
			explorerEl.toggleClass("manual-sorting-enabled", this._manualSortingEnabled);
		}
		toggleSortingClass();

		const configureAutoScrolling = async () =>  {
			let scrollInterval = null;
			const explorer = await this.waitForExplorer();
			if (!explorer) return;

			explorer.removeEventListener("dragover", handleDragOver);

			if(!this._manualSortingEnabled) return; 
			explorer.addEventListener("dragover", handleDragOver);

			function handleDragOver(event) {
				event.preventDefault();
				const rect = explorer.getBoundingClientRect();
				const scrollZone = 50;
				const scrollSpeed = 5;

				if (event.clientY < rect.top + scrollZone) {
					startScrolling(-scrollSpeed);
				} else if (event.clientY > rect.bottom - scrollZone) {
					startScrolling(scrollSpeed);
				} else {
					stopScrolling();
				}
			}

			document.addEventListener("dragend", stopScrolling);
			document.addEventListener("drop", stopScrolling);
			document.addEventListener("mouseleave", stopScrolling);

			function startScrolling(speed) {
				if (scrollInterval) return;

				function scrollStep() {
					explorer.scrollTop += speed;
					scrollInterval = requestAnimationFrame(scrollStep);
				}

				scrollInterval = requestAnimationFrame(scrollStep);
			}

			function stopScrolling() {
				if (scrollInterval) {
					cancelAnimationFrame(scrollInterval);
					scrollInterval = null;
				}
			}
		}
		configureAutoScrolling();

		if (this.app.plugins.getPlugin('folder-notes')) {
			console.log('Reloading Folder Notes plugin');
			await this.app.plugins.disablePlugin('folder-notes');
			this.app.plugins.enablePlugin('folder-notes');
		}
    }

	async patchSortOrderMenu() {
		const thisPlugin = this;
		this._unpatchMenu = around(Menu.prototype, {
			showAtMouseEvent: (original) => function (...args) {
				const openMenuButton = args[0].target as HTMLElement;
				if (openMenuButton.getAttribute('aria-label') === i18next.t("plugins.file-explorer.action-change-sort") &&
					openMenuButton.classList.contains('nav-action-button')
				) {
					const menu = this;
					menu.sections.unshift("custom-sorting");
					if (thisPlugin._manualSortingEnabled) {
						menu.items.find((item: { checked: boolean; }) => item.checked === true).setChecked(false);
					}
					const sortingMenuSection = "manual-sorting";
					menu.addItem((item: MenuItem) => {
						item.setTitle('📌 Manual sorting')
							.setChecked(thisPlugin._manualSortingEnabled)
							.setSection(sortingMenuSection)
							.onClick(async () => {
								if (!thisPlugin._manualSortingEnabled) {
									thisPlugin._manualSortingEnabled = true;
									await thisPlugin._orderManager.initOrder();
									thisPlugin.reloadExplorerPlugin();
								}
							});
					});
					if (thisPlugin._manualSortingEnabled) {
						menu.addItem((item: MenuItem) => {
							item.setTitle('🗑️ Reset order')
								.setSection(sortingMenuSection)
								.onClick(async () => {
									new ResetOrderConfirmationModal(thisPlugin.app, async () => {
										await thisPlugin._orderManager.resetOrder();
										await thisPlugin._orderManager.initOrder();
										thisPlugin.reloadExplorerPlugin();
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
