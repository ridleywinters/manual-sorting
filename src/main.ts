import { Menu, MenuItem, Plugin, Keymap, TFolder, TAbstractFile } from 'obsidian';
import { FileTreeItem, TreeItem, FileExplorerView } from 'obsidian-typings';
import { around } from 'monkey-around';
import Sortable, { SortableEvent } from 'sortablejs';
import { ResetOrderConfirmationModal } from './ResetOrderConfirmationModal';
import { OrderManager } from './OrderManager';



export default class ManualSortingPlugin extends Plugin {
	private _manualSortingEnabled: boolean = false;
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
		this._manualSortingEnabled = true;
		this.reloadExplorerPlugin();
		
		this.registerEvent(this.app.vault.on('create', (treeItem) => {
			if (this._manualSortingEnabled && (treeItem instanceof TFolder)) {
				console.log('Manually created folder:', treeItem);
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
		const fileExplorerView = this.app.workspace.getLeavesOfType("file-explorer")[0].view as FileExplorerView;
		const thisPlugin = this;

		this._explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf((fileExplorerView.tree?.infinityScroll.rootEl as { childrenEl: HTMLElement }).childrenEl), {
				setChildrenInPlace: (original) => function (newChildren: HTMLElement[]) {
					const isInExplorer = !!this.closest('[data-type="file-explorer"]');
					const isTreeItem = this.classList.value.includes("tree-item");

					const parentLeafContent = this.closest('.workspace-leaf-content');
					const parentLeafContentType = parentLeafContent?.getAttribute('data-type');
					const isNotInExplorerLeaf = parentLeafContentType !== 'file-explorer';

					if (!thisPlugin._manualSortingEnabled || (parentLeafContent && isNotInExplorerLeaf) || !isTreeItem && !isInExplorer) {
						return original.apply(this, [newChildren]);
					}

					const currentChildren = Array.from(this.children);
					const newChildrenSet = new Set(newChildren);

					for (const child of currentChildren) {
						const childElement = child as HTMLElement;
						if (!newChildrenSet.has(childElement)) {
							const childPath = (childElement.firstChild as HTMLElement)?.getAttribute("data-path");
							if (childPath && childElement.classList.contains("tree-item")) {
								const itemObject = thisPlugin.app.vault.getAbstractFileByPath(childPath);
								
								if (!itemObject) {
									childPath && thisPlugin._orderManager.updateOrder();
								} else {
									continue;
								}
							}

							this.removeChild(child);
						}
					}

					const processNewItem = (addedItem: HTMLElement) => {
						const path = (addedItem.firstChild as HTMLElement)?.getAttribute("data-path");
						console.log(`Adding`, addedItem, path);
						const itemContainer: HTMLElement = this;
						const elementFolderPath = path?.substring(0, path.lastIndexOf('/')) || "/";
						console.log(`Item container:`, itemContainer, elementFolderPath);

						thisPlugin._orderManager.updateOrder();
						if (thisPlugin._folderBeingCreatedManually) {
							console.log('Folder is being created manually');
							thisPlugin._folderBeingCreatedManually = false;
						} else {
							thisPlugin._orderManager.restoreOrder(itemContainer, elementFolderPath);
						}

						function makeSortable(container: HTMLElement) {
							if (Sortable.get(container)) return;
							console.log(`Initiating Sortable on`, container);

							const minSwapThreshold = 0.3;
							const maxSwapThreshold = 2;
							let origSetCollapsed: (collapsed: boolean, check: boolean) => Promise<undefined>;

							function adjustSwapThreshold(item: HTMLElement) {
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
											makeSortable(childrenContainer as HTMLElement);
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
								onChoose: (evt: SortableEvent) => {
									console.log("Sortable: onChoose");
									const dragged = evt.item;
									adjustSwapThreshold(dragged);
								},
								onStart: (evt: SortableEvent) => {
									console.log("Sortable: onStart");
									const itemPath = (evt.item.firstChild as HTMLElement)?.getAttribute("data-path") || "";
									const itemObject = thisPlugin.app.vault.getAbstractFileByPath(itemPath);
									if (itemObject instanceof TFolder) {
										const fileTreeItem = (thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view as FileExplorerView).fileItems[itemPath] as TreeItem<FileTreeItem>;
										fileTreeItem.setCollapsed(true, true);
										origSetCollapsed || (origSetCollapsed = fileTreeItem.setCollapsed);
										fileTreeItem.setCollapsed = async () => undefined;
									}
								},
								onChange: (evt: SortableEvent) => {
									console.log("Sortable: onChange");
									const dragged = evt.item;
									adjustSwapThreshold(dragged);
								},
								onEnd: (evt: SortableEvent) => {
									console.log("Sortable: onEnd");
									const draggedOverElement = document.querySelector(".is-being-dragged-over");
									const draggedItemPath = (evt.item.firstChild as HTMLElement)?.getAttribute("data-path") || "";
									const draggedOverElementPath = (draggedOverElement?.firstChild as HTMLElement)?.getAttribute("data-path");
									const destinationPath = draggedOverElementPath || evt.to?.previousElementSibling?.getAttribute("data-path") || "/";

									const movedItem = thisPlugin.app.vault.getAbstractFileByPath(draggedItemPath) as TAbstractFile;
									const targetFolder = thisPlugin.app.vault.getFolderByPath(destinationPath);
									const itemDestPath = `${(!targetFolder?.isRoot()) ? (destinationPath + '/') : ''}${movedItem?.name}`;
									const previousItem = evt.item.previousElementSibling;
									const previousItemPath = draggedOverElementPath ? "" : (previousItem?.firstChild as HTMLElement)?.getAttribute("data-path") || "";

									thisPlugin._orderManager.moveFile(draggedItemPath, itemDestPath, previousItemPath);
									thisPlugin.app.fileManager.renameFile(movedItem, itemDestPath);

									const fileExplorerView = thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view as FileExplorerView;

									// Obsidian doesn't automatically call onRename in some cases - needed here to ensure the DOM reflects file structure changes
									if (movedItem?.path === itemDestPath) {
										fileExplorerView.onRename(movedItem, draggedItemPath);
									}

									if (movedItem instanceof TFolder) {
										const fileTreeItem = fileExplorerView.fileItems[draggedItemPath] as TreeItem<FileTreeItem>;
										fileTreeItem.setCollapsed = origSetCollapsed;
									}
								},
								onUnchoose: () => {
									console.log("Sortable: onUnchoose");
									try {
										const dropEvent = new DragEvent("drop", { 
											bubbles: true, 
											cancelable: true, 
											dataTransfer: new DataTransfer()
										});
									
										document.dispatchEvent(dropEvent);
									} catch {}
								},
							});
						}
						makeSortable(itemContainer);
					}

					for (const child of newChildren) {
						if (!this.contains(child)) {
							this.prepend(child);
							if (child.classList.contains("tree-item")) {
								if (!(child.firstChild as HTMLElement)?.hasAttribute("data-path")) {
									new MutationObserver((mutations, obs) => {
										for (const mutation of mutations) {
											if (mutation.attributeName === "data-path") {
												processNewItem(child);
												obs.disconnect();
												return;
											}
										}
									}).observe(child.firstChild as Node, { attributes: true, attributeFilter: ["data-path"] });
								} else {
									processNewItem(child);
								}
							}
						}
					}
				},
				detach: (original) => function (...args: any) {
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
			around(Object.getPrototypeOf(fileExplorerView), {
				onRename: (original) => function (file: TAbstractFile, oldPath: string) {
					original.apply(this, [file, oldPath]);
					if (thisPlugin._manualSortingEnabled) {
						thisPlugin._orderManager.renameItem(oldPath, file.path);
					}
				},
				setSortOrder: (original) => function (...args: any) {
					original.apply(this, args);
					if (thisPlugin._manualSortingEnabled) {
						thisPlugin._manualSortingEnabled = false;
						thisPlugin.reloadExplorerPlugin();
					}
				},
				sort: (original) => function (...args: any) {
					thisPlugin._recentExplorerAction = 'sort';
					original.apply(this, args);
				}
			})
		);

		this._explorerUnpatchFunctions.push(
			around(Object.getPrototypeOf(fileExplorerView.tree), {
				setFocusedItem: (original) => function (...args: any) {
					thisPlugin._recentExplorerAction = 'setFocusedItem';
					original.apply(this, args);
				},
				handleItemSelection: (original) => function (e: PointerEvent, t: TreeItem<FileTreeItem>) {
					if (!thisPlugin._manualSortingEnabled) {
						return original.apply(this, [e, t]);
					}

					function getItemsBetween(allPaths: string[], path1: string, path2: string) {
						const index1 = allPaths.indexOf(path1);
						const index2 = allPaths.indexOf(path2);

						if (index1 === -1 || index2 === -1) {
							return [];
						}

						const startIndex = Math.min(index1, index2);
						const endIndex = Math.max(index1, index2);

						return allPaths.slice(startIndex, endIndex + 1).map(path =>
							(thisPlugin.app.workspace.getLeavesOfType("file-explorer")[0].view as FileExplorerView).fileItems[path]
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
			around(Object.getPrototypeOf(fileExplorerView.tree?.infinityScroll), {
				scrollIntoView: (original) => function (...args: any) {
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
			let scrollInterval: number | null = null;
			const explorer = await this.waitForExplorer();
			if (!explorer) return;

			explorer.removeEventListener("dragover", handleDragOver);

			if(!this._manualSortingEnabled) return; 
			explorer.addEventListener("dragover", handleDragOver);

			function handleDragOver(event: DragEvent) {
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

			function startScrolling(speed: number) {
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
									await thisPlugin._orderManager.updateOrder();
									thisPlugin.reloadExplorerPlugin();
								}
							});
					});
					menu.addItem((item: MenuItem) => {
						item.setTitle('🗑️ Reset order')
							.setSection(sortingMenuSection)
							.onClick(async () => {
								new ResetOrderConfirmationModal(thisPlugin.app, async () => {
									thisPlugin._orderManager.resetOrder();
									await thisPlugin._orderManager.updateOrder();
									if (thisPlugin._manualSortingEnabled) {
										thisPlugin.reloadExplorerPlugin();
									}
								}).open();
							});
					});
					let menuItems = menu.items;
					let menuSeparator = menuItems.splice(8, 1)[0];
					menuItems.splice(0, 0, menuSeparator);
				}
				return original.apply(this, args);
			}
		});
	}
}
