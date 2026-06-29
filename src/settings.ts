import { App, PluginSettingTab, Setting } from "obsidian";
import type NotionOutlinePlugin from "./main";

export interface NotionOutlineSettings {
  minHeadings: number;
  showInReadingView: boolean;
}

export const DEFAULT_SETTINGS: NotionOutlineSettings = {
  minHeadings: 2,
  showInReadingView: true,
};

export class NotionOutlineSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: NotionOutlinePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Minimum headings")
      .setDesc("Hide the outline when a note has fewer headings than this.")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.minHeadings))
          .onChange(async (v) => {
            const n = Number.parseInt(v, 10);
            this.plugin.settings.minHeadings = Number.isFinite(n) && n > 0 ? n : 2;
            await this.plugin.saveSettings();
            this.plugin.refreshActive();
          }),
      );

    new Setting(containerEl)
      .setName("Show in reading view")
      .setDesc("Also show the outline in reading mode.")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.showInReadingView)
          .onChange(async (v) => {
            this.plugin.settings.showInReadingView = v;
            await this.plugin.saveSettings();
            this.plugin.refreshActive();
          }),
      );
  }
}
