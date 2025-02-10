import { Notice, Plugin } from 'obsidian';


function debugLog(...args: any[]) {
	if(process.env.NODE_ENV === "development") {
		console.log(...args);
	}
}

export default class ManualSortingPlugin extends Plugin {
	async onload() {
		this.addRibbonIcon('dice', 'Manual Sorting Plugin', () => {
			new Notice('This is a notice!');
		});
	}
}
