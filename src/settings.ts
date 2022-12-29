import {
  App,
  FuzzySuggestModal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TextComponent,
  TFile,
} from "obsidian";

import {LOG_KEYS, LOG_KEYS_GROUPS} from './kaffelogic/constants';

import type KaffelogicPlugin from "./main"

export interface KaffelogicPluginSettings {
  roastPathObsidian: string;
  roastPathKL: string;
  roastTemplaterFile: string;
  keysToImport: Array<string>;
  groups: {[index: string]: string[]};
  group_for_variable(variable: string): string;
}

export const DEFAULT_SETTINGS: KaffelogicPluginSettings = {
  roastPathObsidian : "default",
  roastPathKL : "default",
  roastTemplaterFile : "",
  keysToImport : LOG_KEYS,
  groups : LOG_KEYS_GROUPS,
  group_for_variable(variable: string) : string {
    // Future improvement, build a reverse index for
    // variable -> group
    for (var [key, items] of Object.entries(this.groups)) {
      for (var name of this.groups[key]) {
        if (name === variable) {
          return key;
        }
      }
    }
    return "";
  },
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

    this.add_groups();
    this.add_key_toggles();
  }

  createCollapsibleSection(container: HTMLElement, displayName: string,
                           description: string) {
    container.createEl("br");
    container.createEl("br");
    const sectionEl = container.createEl('details', {
      cls : 'kaffelogic-variables-settings-section',
    });

    const summaryEl = sectionEl.createEl('summary', {
      cls : 'kaffelogic-variables-settings-section-header',
      text : displayName
    });
    sectionEl.createDiv({text : description, cls : 'setting-item-description'});
    sectionEl.createEl("br");
    sectionEl.createEl("br");
    return sectionEl.createDiv();
  }

  add_key_toggles(): void {

    let containers: Map<string, HTMLElement> = new Map();

    for (const k of LOG_KEYS.sort()) {
      const curGroup = this.plugin.settings.group_for_variable(k);

      if (!containers.has(curGroup)) {
        let groupTable =
            curGroup ? "kl_log_table_" + curGroup : "kl_log_data_table";
        let displayName =
            (curGroup ? (curGroup.charAt(0).toUpperCase() + curGroup.slice(1))
                      : "Generic") +
            " variables";
        let description =
            "Use the following placeholder to insert this table in your template: " +
            groupTable;

        containers.set(curGroup,
                       this.createCollapsibleSection(this.containerEl,
                                                     displayName, description));
      }

      const container = containers.get(curGroup);

      new Setting(container)
          .setName(k)
          .setDesc("Import the key: " + k)
          .addDropdown((d) => {
            d.addOption("", "Select group");
            for (var group of Object.keys(this.plugin.settings.groups)) {
              d.addOption(group, group);
            }

            d.setValue(curGroup);
            d.onChange((value) => {
              console.log("Current group: " + curGroup);
              if (curGroup !== "") {
                let groupVars = this.plugin.settings.groups[curGroup];
                groupVars.splice(groupVars.indexOf(k), 1);
              }

              if (value !== "") {
                console.log("Setting group to: " + value);
                this.plugin.settings.groups[value].push(k);
              }
              this.plugin.saveSettings();
              this.display();
            });
          })
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

  private add_group({container = this.containerEl,
                     name}: {container?: HTMLElement; name : string;}) {

    let groupName: TextComponent;
    let setting =
        new Setting(container)
            .addText((text) =>
                         (groupName = text.setValue(name).onChange(
                              (value) => console.log("New value: " + value))))
            .addExtraButton((b) => {
              b.setIcon('trash');
              b.setTooltip('Remove group');
              b.onClick(() => {
                delete this.plugin.settings.groups[groupName.getValue()];
                this.plugin.saveSettings();
                this.display();
                setting.clear();
              });
            });
  }

  add_groups(): void {
    let groupsEl =
        this.containerEl.createEl("h2", {text : "Kaffelogic Varaible Groups"});
    groupsEl.empty();
    for (var key of Object.keys(this.plugin.settings.groups)) {
      this.add_group({name : key, container : groupsEl});
    }

    let newGroupName: TextComponent;
    new Setting(this.containerEl)
        .setName("Create a group")
        .setDesc(
            "Groups are used to categorize KL variables and represent them in separate tables. Use `kl_log_table_{group_name}` to add them to your notes")
        .addText((text) =>
                     (newGroupName = text.setPlaceholder("Enter group name")))
        .addExtraButton((b) => {
          b.setTooltip('Add Group');
          b.setIcon("plus-with-circle");
          b.onClick(() => {
            if (newGroupName.getValue() === "") {
              return;
            }
            this.plugin.settings.groups[newGroupName.getValue()] = [];
            this.plugin.saveSettings();
            this.display();
            newGroupName.setValue("");
          });
        });
  }
}
