/** Panel width, open tab and unit: remembered for every page on this origin. */
import { readStore, writeStore } from "../edits/storage";
import { options } from "../options";

const LAYOUT_KEY = "__live_inspector_panel";
const TAB_IDS = ["specs", "css", "layers", "changes"];

interface Layout {
  width: string;
  tab: string;
  unit: string;
}

export function loadLayout(panel: HTMLElement): void {
  const layout = readStore<Layout>(LAYOUT_KEY);
  panel.dataset.tab = layout.tab && TAB_IDS.includes(layout.tab) ? layout.tab : "specs";
  panel.style.width = layout.width ?? "";
  options.unit = layout.unit === "rem" ? "rem" : "px";
}

export function saveLayout(panel: HTMLElement): void {
  const layout: Layout = {
    width: panel.style.width,
    tab: panel.dataset.tab ?? "specs",
    unit: options.unit,
  };
  writeStore(LAYOUT_KEY, layout);
}

export function setTab(panel: HTMLElement, tab: string): void {
  panel.dataset.tab = tab;
  saveLayout(panel);
}
