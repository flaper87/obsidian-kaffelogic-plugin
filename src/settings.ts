import {
  App,
  FuzzySuggestModal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile
} from "obsidian";

import {LOG_KEYS} from './kaffelogic/constants';
import type KaffelogicPlugin from "./main"

export interface KaffelogicPluginSettings {
  roastPathObsidian: string;
  roastPathKL: string;
  roastTemplaterFile: string;
  keysToImport: Array<string>;
}

export const DEFAULT_SETTINGS: KaffelogicPluginSettings = {
  roastPathObsidian : "default",
  roastPathKL : "default",
  roastTemplaterFile : "",
  keysToImport : LOG_KEYS,
};

export class KaffelogicSettingTab extends PluginSettingTab {
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

    this.add_key_toggles();
  }

  add_key_toggles(): void {
    this.containerEl.createEl("h2", {text : "Kaffelogic Variables"});
    for (var k of LOG_KEYS.sort()) {
      new Setting(this.containerEl)
          .setName(k)
          .setDesc("Import the key: " + k)
          .addToggle((toggle) => {
            const key = k;
            toggle.setValue(this.plugin.settings.keysToImport.includes(k))
                .onChange((value) => {
                  let keysToImport = this.plugin.settings.keysToImport;
                  if (value) {
                    keysToImport.push(key);
                  } else {
                    keysToImport.splice(keysToImport.indexOf(key, 0), 1);
                  }
                  this.plugin.saveSettings();
                });
          });
    }
  }
}
