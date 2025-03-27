import type { i18n } from "i18next";

declare global {
	const i18next: i18n;
}

export interface CustomFileOrder {
	[folderPath: string]: string[];
}
