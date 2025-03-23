import { App, ButtonComponent, Modal } from 'obsidian';

export class ResetOrderConfirmationModal extends Modal {
    constructor(app: App, onSubmit: () => void) {
        super(app);
        this.setTitle("Manual sorting");
        this.modalEl.addClass("manual-sorting-modal");

        const modalContent = this.contentEl.createEl("div");
        modalContent.createEl("p", { text: "Are you sure you want to reset order to default?" });

        const modalButtons = modalContent.createEl("div", { cls: "modal-buttons" });
        new ButtonComponent(modalButtons)
            .setButtonText("Yep")
            .setCta()
            .onClick(() => {
                this.close();
                onSubmit();
            });

        new ButtonComponent(modalButtons)
            .setButtonText("Cancel")
            .onClick(() => this.close());
    }
}
