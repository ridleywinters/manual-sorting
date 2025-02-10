import { Plugin } from 'obsidian';


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
		debugLog("Initializing Manual Sorting Plugin");
	}
}
