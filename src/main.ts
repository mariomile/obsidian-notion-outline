import { Plugin } from "obsidian";

export default class NotionOutlinePlugin extends Plugin {
  async onload() {
    console.log("notion-outline loaded");
  }
  onunload() {
    console.log("notion-outline unloaded");
  }
}
