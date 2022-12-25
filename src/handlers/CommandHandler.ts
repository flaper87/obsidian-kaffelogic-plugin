import type KaffelogicPlugin from "main";

export class CommandHandler {
    constructor(private plugin: KaffelogicPlugin) {}

    setup(): void {
        this.plugin.addCommand({
            id: "import-log",
			name: "Import a Kaffelogic Roast",
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "k",
                },
            ],
            callback: () => {
				this.plugin.importer.open();
            },
        });
    }
}
