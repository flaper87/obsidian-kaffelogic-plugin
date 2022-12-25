import type { IFileSystemHandler } from "./fileSystem";
import type KaffelogicPlugin from "main";
import path from "path";

export interface KLLog {
  title: string;
  file: string;
}

export class KLLogManager implements KLLog {
	title: string;
	file: string;
	data: Map<string, string>;

	plugin: KaffelogicPlugin;

    constructor(file: string, plugin: KaffelogicPlugin) {
		this.title = path.basename(file);
		this.file = file;
		this.data = new Map();
		this.plugin = plugin;
    }

    get(): string {
        return this.file;
    }

	attachment_path(): string {
		let attachmentDir = this.plugin.app.vault.config.attachmentFolderPath;
		let fName = path.basename(this.file);
		//return this.plugin.app.vault.getAbstractFileByPath(path.join(this.settings.roastPathObsidian, attachmentDir, fname));
		return path.join(this.plugin.settings.roastPathObsidian, attachmentDir, fName);
	}

	async import_and_read(): Promise<string> {
		let content = await this.plugin.filesystem.read(this.file);
		await this.plugin.filesystem.write(this.attachment_path(), content);

		let parsedPath = path.parse(this.file);
		let pdfFName = parsedPath.name + ".pdf";
		let pdfPath = path.join(parsedPath.dir, pdfFName);
		if (await this.plugin.filesystem.exists(pdfPath)) {
			let attachmentDir = path.parse(this.attachment_path()).dir;
			await this.plugin.filesystem.copy(pdfPath, path.join(attachmentDir, pdfFName));
		}

		return content;
	}

	async parse(): Promise<Map<string, string>> {
		let content = await this.import_and_read();

		let plot = false;
		for (var l of content.split(/\r?\n/)) {
			// This is a new, empty, line that separates
			// the profile data from the plot data
			if (!l) { plot = true; continue;}

			if (plot && !l.startsWith("!")) { continue; }

			if (l.startsWith("!")) { l = l.substring(1); }

			let [key, value] = l.split(':');

			if (key == "first_crack" || key == "expect_fc") {
				let fValue = Number.parseFloat(value);
				let mins = Math.floor(fValue / 60);
				let secs = Math.floor(fValue - (mins * 60))
				value = mins + ":" + secs;
			}
			this.data.set(key, value);
		}
		return this.data;
	}
}
