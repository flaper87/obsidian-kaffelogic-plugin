import {FileSystemHandler} from "fileSystem"
import fs from "fs";
import {CommandHandler} from "handlers/CommandHandler";
import {KLLog, KLLogManager} from "kaffelogic"
import {Align, getMarkdownTable, Row} from 'markdown-table-ts';
import {
  App,
  Editor,
  FuzzySuggestModal,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";
import path from "path";
import walkSync from "walk-sync";

interface KaffelogicPluginSettings {
  roastPathObsidian: string;
  roastPathKL: string;
  roastTemplaterFile: string;
}

const DEFAULT_SETTINGS: KaffelogicPluginSettings = {
  roastPathObsidian : "default",
  roastPathKL : "default",
  roastTemplaterFile : "",
};

export default class KaffelogicPlugin extends Plugin {
  settings: KaffelogicPluginSettings;
  public command_handler: CommandHandler;
  public importer: KaffelogicImport;
  public filesystem: FileSystemHandler;

  async onload() {
    await this.loadSettings();
    this.command_handler = new CommandHandler(this);
    this.command_handler.setup();

    this.importer = new KaffelogicImport(this.app, this);
    this.filesystem = new FileSystemHandler(this.app.vault);

    // This adds a settings tab so the user can configure various aspects of the
    // plugin
    this.addSettingTab(new KaffelogicSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that
    // doesn't belong to this plugin) Using this function will automatically
    // remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click",
                          (evt: MouseEvent) => { console.log("click", evt); });

    // When registering intervals, this function will automatically clear the
    // interval when the plugin is disabled.
    this.registerInterval(
        window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));
  }

  async importKLLog(klLog: KLLogManager) {
    let templater = this.app.plugins.plugins["templater-obsidian"];
    let tf =
        this.app.vault.getAbstractFileByPath(this.settings.roastTemplaterFile);
    let template_content = await this.app.vault.read(tf as TFile);

    let tContent = await klLog.parse();
    let kLogName = path.parse(klLog.file).name;
    let dateParts =
        ((tContent.get("roast_date") || tContent.get("profile_modified"))
             .split(" ")[0])
            .split("/");
    let filename = dateParts[2] + "-" + dateParts[1] + '-' + dateParts[0] +
                   ' | ' + kLogName;
    let table = getMarkdownTable({
      table : {
        head : [ 'Param', 'Value' ],
        body : Array.from(tContent.entries()).sort() as Row[],
      },
      alignment : [ Align.Left, Align.Left ],
    });

    let final_template =
        template_content.replace(/kl_log_data_table/, table)
            .replace(/kl_log_attachment/, "![[" + kLogName + ".klog]]")
            .replace(/kl_log_attachment_pdf/, "![[" + kLogName + ".pdf]]");
    let outDir =
        this.app.vault.getAbstractFileByPath(this.settings.roastPathObsidian);
    await templater.templater.create_new_note_from_template(final_template,
                                                            outDir, filename);
  }

  onunload() {};

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() { await this.saveData(this.settings); }
}

class KaffelogicImport extends FuzzySuggestModal<KLLog> {
  plugin: KaffelogicPlugin;

  constructor(app: App, plugin: KaffelogicPlugin) {
    super(app);
    this.plugin = plugin;
  }

  getItems(): KLLog[] {
    let paths: KLLog[] = [];
    let results = walkSync(this.plugin.settings.roastPathKL, {
      globs : [ "**/*.klog" ],
    });
    for (var l of results) {
      paths.push(new KLLogManager(
          path.join(this.plugin.settings.roastPathKL, l), this.plugin));
    }
    return paths;
  }

  getItemText(klLog: KLLog): string { return klLog.file; }

  onChooseItem(klLog: KLLogManager, evt: MouseEvent|KeyboardEvent) {
    this.plugin.importKLLog(klLog);
    new Notice(`Selected ${klLog.title}`);
  }

  onOpen() {
    const {contentEl} = this;
    contentEl.createEl("h1", {text : "Select log to import: "});
  }

  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}

class KaffelogicSettingTab extends PluginSettingTab {
  plugin: KaffelogicPlugin;

  constructor(app: App, plugin: KaffelogicPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;

    containerEl.empty();

    containerEl.createEl("h2", {text : "Kaffelogic Settings"});

    let roastPathObsidian =
        new Setting(containerEl)
            .setName("Roasts Path")
            .setDesc("Your roast's path in your vault")
            .addText(
                (text) =>
                    text.setPlaceholder("Enter path")
                        .setValue(this.plugin.settings.roastPathObsidian)
                        .onChange(async (value) => {
                          if ((await this.app.vault.adapter.exists(value)) &&
                              !value.endsWith(".md")) {
                            roastPathObsidian.settingEl.removeClass(
                                "invalid-path");
                            if (value.slice(-1) === "/") {
                              value = value.slice(0, -1);
                            } // remove trailing '/'
                            this.plugin.settings.roastPathObsidian = value;
                            await this.plugin.saveSettings();
                          } else {
                            roastPathObsidian.setClass("invalid-path");
                          }
                        }));

    new Setting(containerEl)
        .setName("Kaffelogic Path")
        .setDesc("Path to your Kaffelogic directory:")
        .addText((text) => text.setPlaceholder("Enter path")
                               .setValue(this.plugin.settings.roastPathKL)
                               .onChange(async (value) => {
                                 this.plugin.settings.roastPathKL = value;
                                 await this.plugin.saveSettings();
                               }));

    new Setting(containerEl)
        .setName("Kaffelogic Template")
        .setDesc("Templater file for Kaffelogic logs:")
        .addText((text) =>
                     text.setPlaceholder("Enter path")
                         .setValue(this.plugin.settings.roastTemplaterFile)
                         .onChange(async (value) => {
                           this.plugin.settings.roastTemplaterFile = value;
                           await this.plugin.saveSettings();
                         }));
  }
}
