import fs from "fs";
import {IKLLog, KLLog} from "kaffelogic";
import {Align, getMarkdownTable, Row} from 'markdown-table-ts';
import {
  App,
  FuzzySuggestModal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile
} from "obsidian";
import path from "path";
import walkSync from "walk-sync";

import {FileSystemHandler} from "./fileSystem";
import {CommandHandler} from "./handlers/CommandHandler";
import {LOG_KEYS_GROUPS} from "./kaffelogic/constants";
import {
  DEFAULT_SETTINGS,
  KaffelogicPluginSettings,
  KaffelogicSettingTab
} from "./settings";

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

  async importKLLog(klLog: KLLog) {
    let templater = (this.app as any).plugins.plugins["templater-obsidian"];

	if (templater === undefined) {
		new Notice("Templater plugin is not enabled!");
		return;
	}
    let tf =
        this.app.vault.getAbstractFileByPath(this.settings.roastTemplaterFile);
    let template_content = await this.app.vault.read(tf as TFile);

    let tContent = await klLog.parse();
    let kLogName = path.parse(klLog.file).name;
    let dateParts = (((tContent.get("roast_date") as string ||
                       tContent.get("profile_modified")) as string)
                         .split(" ")[0])
                        .split("/");
    let filename = dateParts[2] + "-" + dateParts[1] + '-' + dateParts[0] +
                   ' (' + kLogName + ')';

    let table = getMarkdownTable({
      table : {
        head : [ 'Param', 'Value' ],
        body : Array.from(tContent.entries()).sort() as Row[],
      },
      alignment : [ Align.Left, Align.Left ],
    });

    let final_template =
        template_content
            .replace(/kl_log_attachment/, "[[" + kLogName + ".klog]]")
            .replace(/kl_log_attachment_pdf/, "![[" + kLogName + ".pdf]]");

    tContent.forEach((value: string|number, key: string) => {
      var regex = new RegExp("kl_log_var_" + key, "g");
      final_template = final_template.replace(regex, value as string);
    });

    let histogramData = await klLog.getHistogramData();
    let chart = `type: line
labels: [${klLog.sliceHistogramData('time', 30)}]
series:
${
        Array.from(histogramData.get("headers"))
            .filter((header) => header !== "time")
            .map((header) => `  - title: ${header}\n    data: [${
                     klLog.sliceHistogramData(header, 30)}]`)
            .join("\n")}
tension: ${30 / 100}
labelColors: true
fill: false
beginAtZero: false
legendPosition: bottom`;

    chart = "```chart\n" + chart + "\n```";

    final_template = final_template.replace(/kl_log_chart/, chart);

    for (let key in LOG_KEYS_GROUPS) {
      let groupData = await klLog.data_for_group(key);
      let groupTable = getMarkdownTable({
        table : {
          head : [ 'Param', 'Value' ],
          body : Array.from(groupData.entries()).sort() as Row[],
        },
        alignment : [ Align.Left, Align.Left ],
      });

      var regex = new RegExp("kl_log_table_" + key, "g");
      final_template = final_template.replace(regex, groupTable);
    }

    final_template = final_template.replace(/kl_log_data_table/, table);

    let outDir =
        this.app.vault.getAbstractFileByPath(this.settings.roastPathObsidian);
    await templater.templater.create_new_note_from_template(final_template,
                                                            outDir, filename);
  }

  onunload() {};

  async loadSettings() {
    let data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings() {
    console.log(this.settings);
    await this.saveData(this.settings);
  }
}

class KaffelogicImport extends FuzzySuggestModal<IKLLog> {
  plugin: KaffelogicPlugin;

  constructor(app: App, plugin: KaffelogicPlugin) {
    super(app);
    this.plugin = plugin;
  }

  getItems(): IKLLog[] {
    let paths: IKLLog[] = [];
    let results = walkSync(this.plugin.settings.roastPathKL, {
      globs : [ "**/*.klog" ],
    });
    for (var l of results) {
      paths.push(new KLLog(path.join(this.plugin.settings.roastPathKL, l),
                           this.plugin));
    }
    return paths;
  }

  getItemText(klLog: IKLLog): string { return klLog.file; }

  onChooseItem(klLog: KLLog, evt: MouseEvent|KeyboardEvent) {
    this.plugin.importKLLog(klLog);
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
