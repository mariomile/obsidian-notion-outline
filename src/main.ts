import { MarkdownView, Plugin, debounce, type TFile } from "obsidian";
import { OutlineController } from "./outline-controller";
import { normalizeHeadings } from "./heading-model";
import {
  DEFAULT_SETTINGS,
  NotionOutlineSettings,
  NotionOutlineSettingTab,
} from "./settings";

export default class NotionOutlinePlugin extends Plugin {
  settings: NotionOutlineSettings = DEFAULT_SETTINGS;
  private controllers = new Map<MarkdownView, OutlineController>();

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new NotionOutlineSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.syncControllers()),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.syncControllers()),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.refreshActive()),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => this.onMetaChanged(file)),
    );

    this.app.workspace.onLayoutReady(() => this.syncControllers());
  }

  onunload() {
    for (const c of this.controllers.values()) c.destroy();
    this.controllers.clear();
  }

  private debouncedRefresh = debounce(
    (view: MarkdownView) => this.refreshView(view),
    150,
    true,
  );

  /** Ensure every visible markdown view has a controller; drop stale ones. */
  private syncControllers(): void {
    const live = new Set<MarkdownView>();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView) {
        live.add(view);
        if (!this.controllers.has(view)) {
          this.controllers.set(view, new OutlineController(view));
        }
        this.refreshView(view);
      }
    }
    for (const [view, ctrl] of this.controllers) {
      if (!live.has(view)) {
        ctrl.destroy();
        this.controllers.delete(view);
      }
    }
  }

  refreshActive(): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) this.refreshView(view);
  }

  private onMetaChanged(file: TFile): void {
    for (const [view, ctrl] of this.controllers) {
      if (view.file?.path === file.path) {
        const headings = normalizeHeadings(this.app.metadataCache.getFileCache(file));
        ctrl.setHeadings(headings, this.settings.minHeadings, this.isVisible(view));
      }
    }
  }

  private refreshView(view: MarkdownView): void {
    const ctrl = this.controllers.get(view);
    if (!ctrl) return;
    const file = view.file;
    const headings = file
      ? normalizeHeadings(this.app.metadataCache.getFileCache(file))
      : [];
    ctrl.setHeadings(headings, this.settings.minHeadings, this.isVisible(view));
  }

  private isVisible(view: MarkdownView): boolean {
    if (view.getMode() === "preview") return this.settings.showInReadingView;
    return true;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
