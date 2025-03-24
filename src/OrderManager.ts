import { Plugin } from 'obsidian';


export class OrderManager {
    private _operationQueue: Promise<unknown> = Promise.resolve();
	private _cachedData: object | null = null;

    constructor(private plugin: Plugin) {}

	private async _queueOperation<T>(operation: () => Promise<T>): Promise<T> {
		let result!: T;
		this._operationQueue = this._operationQueue.finally(async () => {
			result = await operation();
		});
		await this._operationQueue;
		return result;
	}

	private async saveData(data: object) {
		this._cachedData = data;
		await this.plugin.saveData(data);
	}
	
	private async loadData() {
		if (this._cachedData) {
			return this._cachedData;
		}
		this._cachedData = await this.plugin.loadData();
		return this._cachedData;
	}

    async initOrder() {
        return this._queueOperation(async () => {
			const savedOrder = await this.loadData();
			const savedOrderExists = savedOrder && Object.keys(savedOrder).length > 0;
			const currentOrder = await this._getCurrentOrder();

			if (savedOrderExists) {
				this.updateOrder(currentOrder, savedOrder);
			} else {
				await this.saveData(currentOrder);
			}
		});
    }

	async resetOrder() {
		return this._queueOperation(async () => {
            await this.saveData({});
        });
	}

	async updateOrder(currentOrderParam?: object, savedOrderParam?: object) {
		return this._queueOperation(async () => {
			const currentOrder = currentOrderParam || await this._getCurrentOrder();
			const savedOrder = savedOrderParam || await this.loadData();
			const newOrder = await this._matchSavedOrder(currentOrder, savedOrder);
			await this.saveData(newOrder);
			this.plugin.app.workspace.getLeavesOfType("file-explorer")[0].view.tree.infinityScroll.updateVirtualDisplay();
			this.plugin.app.workspace.getLeavesOfType("file-explorer")[0].view.updateShowUnsupportedFiles();
			console.log("Order updated");
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
                result[folder] = [...newFiles, ...existingFiles, ];
            } else {
                result[folder] = currentOrder[folder];
            }
        }

        return result;
    }

	async moveFile(oldPath: string, newPath: string, beforePath: string) {
		return this._queueOperation(async () => {
			console.log(`Moving "${oldPath}" to "${newPath}" after "${beforePath}"`);
			const data = await this.loadData();

			const oldDir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
			data[oldDir] = data[oldDir].filter(item => item !== oldPath);

			const newDir = newPath.substring(0, newPath.lastIndexOf("/")) || "/";

			if (beforePath && !data[newDir].includes(newPath)) {
				const beforeIndex = data[newDir].indexOf(beforePath);
				data[newDir].splice(beforeIndex + 1, 0, newPath);
			} else {
				data[newDir].unshift(newPath);
			}

			await this.saveData(data);
			this.updateOrder();
		});
	}

    async renameItem(oldPath: string, newPath: string) {
        return this._queueOperation(async () => {
            console.log(`Renaming "${oldPath}" to "${newPath}"`);
            const data = await this.loadData();

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

            await this.saveData(data);
			this.updateOrder();
        });
    }

	async restoreOrder(container: Element) {
        return this._queueOperation(async () => {
            const savedData = await this.loadData();
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

			const explorer = await this.plugin.waitForExplorer();
			const scrollTop = explorer.scrollTop;

            const fragment = document.createDocumentFragment();
            savedOrder.forEach((path: string) => {
                const element = itemsByPath.get(path);
                if (element) {
                    fragment.appendChild(element);
                }
            });

            container.appendChild(fragment);
			explorer.scrollTop = scrollTop;
            console.log(`Order restored for "${folderPath}"`);
        });
	}

	getFlattenPaths() {
		function flattenPaths(obj: { [key: string]: string[] }, path: string = "/"): string[] {
			let result = [];
			
			if (obj[path]) {
				for (const item of obj[path]) {
					result.push(item);
					if (obj[item]) {
						result.push(...flattenPaths(obj, item));
					}
				}
			}
			
			return result;
		}
		const savedData = this._cachedData;
		const result = flattenPaths(savedData);
		return result;
	}
}

