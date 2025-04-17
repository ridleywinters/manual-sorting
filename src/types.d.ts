import { TAbstractFile } from "obsidian";


export interface PluginSettings {
	customFileOrder: FileOrder;
	selectedSortOrder: string;
	draggingEnabled: boolean;
}

export interface FileOrder {
	[folderPath: string]: string[];
}

declare module 'obsidian-typings' {
	interface FileExplorerView {
		onRename(file: TAbstractFile, oldPath: string): void;
		updateShowUnsupportedFiles(): void;
	}
}
