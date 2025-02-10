import { Notice, Plugin } from 'obsidian';


function debugLog(...args: any[]) {
	if(process.env.NODE_ENV === "development") {
		console.log(...args);
	}
}

export default class ManualSortingPlugin extends Plugin {
	async onload() {
		this.addRibbonIcon('dice', 'Manual Sorting Plugin', () => {
			this.initialize();
		});
	}

	async initialize() {
		debugLog("Initializing Manual Sorting Plugin");
	}
}
