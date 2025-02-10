import { Notice, Plugin } from 'obsidian';


export default class ManualSortingPlugin extends Plugin {
	async onload() {
		this.addRibbonIcon('dice', 'Manual Sorting Plugin', () => {
			new Notice('This is a notice!');
		});
	}
}
