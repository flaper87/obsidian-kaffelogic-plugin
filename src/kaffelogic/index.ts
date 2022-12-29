import type {IFileSystemHandler} from "../fileSystem";
import type KaffelogicPlugin from "../main";
import {
  LOG_KEYS,
  LOG_NUMBER_KEYS,
  LOG_TIME_KEYS
} from "./constants"
import path from "path";

export interface IKLLog {
  title: string;
  file: string;
  data: Map<string, string|number>;

  import_and_read(): Promise<string>;
  parse(): Promise<Map<string, string|number>>;
}

export class KLLog implements IKLLog {
  title: string;
  file: string;
  data: Map<string, string|number>;

  plugin: KaffelogicPlugin;

  constructor(file: string, plugin: KaffelogicPlugin) {
    this.title = path.basename(file);
    this.file = file;
    this.data = new Map();
    this.plugin = plugin;
  }

  get(): string { return this.file; }

  attachment_path(): string {
    let attachmentDir =
        (this.plugin.app.vault as any).getConfig("attachmentFolderPath");
    let fName = path.basename(this.file);
    // return
    // this.plugin.app.vault.getAbstractFileByPath(path.join(this.settings.roastPathObsidian,
    // attachmentDir, fname));
    return path.join(this.plugin.settings.roastPathObsidian, attachmentDir,
                     fName);
  }

  async import_and_read(): Promise<string> {
    let content = await this.plugin.filesystem.read(this.file);
    await this.plugin.filesystem.write(this.attachment_path(), content);

    let parsedPath = path.parse(this.file);
    let pdfFName = parsedPath.name + ".pdf";
    let pdfPath = path.join(parsedPath.dir, pdfFName);
    if (await this.plugin.filesystem.exists(pdfPath)) {
      let attachmentDir = path.parse(this.attachment_path()).dir;
      await this.plugin.filesystem.copy(pdfPath,
                                        path.join(attachmentDir, pdfFName));
    }

    return content;
  }

  async data_for_group(group: string): Promise<Map<string, string|number>> {
    let data = await this.parse();
    let group_data = new Map();

    Object.entries(this.plugin.settings.groups).forEach(([ key, value ]) => {
      if (key !== group) {
        return;
      }
      for (let kvar of this.plugin.settings.groups[key]) {
        let val = data.get(kvar);
        // This likely means the variable has been disabled
        // in the settings
        if (val === undefined) {
          continue;
        }
        group_data.set(kvar, val);
      }
    });

    return group_data;
  }

  async parse(): Promise<Map<string, string|number>> {
    if (this.data.size > 0) {
      return this.data
    }

    let content = await this.import_and_read();

    let plot = false;
    for (var l of content.split(/\r?\n/)) {
      // This is a new, empty, line that separates
      // the profile data from the plot data
      if (!l) {
        plot = true;
        continue;
      }

      if (plot && !l.startsWith("!")) {
        continue;
      }

      if (l.startsWith("!")) {
        l = l.substring(1);
      }

      let key: string;
      let value: string|number;
      [key, value] = l.split(':');

      if (!this.plugin.settings.keysToImport.includes(key)) {
        continue;
      }

      if (LOG_NUMBER_KEYS.includes(key)) {
        let numValue = Number.parseFloat(value);
        if (!Number.isNaN(numValue)) {
          value = numValue.toFixed(3);
        }
      }

      if (LOG_TIME_KEYS.includes(key)) {
        let numValue = Number.parseFloat(value);
        let mins = Math.floor((value as unknown as number) / 60);
        let secs = Math.floor((value as unknown as number) - (mins * 60))
        value = mins + ":" + secs;
      }
      this.data.set(key, value);
    }

    return this.data;
  }
}
