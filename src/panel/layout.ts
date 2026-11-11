/** Panel width, open tab, unit, colour format and mode: remembered for every page on this origin. */
import { readStore, writeStore } from "../edits/storage";
import { options } from "../options";
import { toColorFormat } from "../specs/color-format";

const LAYOUT_KEY = "__groma_panel";
/** The tabs worth reopening on. The Reference tab is a detour, not a place to start. */
const TAB_IDS = ["specs", "css", "layers", "edits", "changes"];

type Layout = { width: string; tab: string; unit: string; mode: string; colorFormat?: string };

export function loadLayout(panel: HTMLElement): void {
  const layout = readStore<Layout>(LAYOUT_KEY);
  panel.dataset.tab = layout.tab && TAB_IDS.includes(layout.tab) ? layout.tab : "specs";
  panel.style.width = layout.width ?? "";
  options.unit = layout.unit === "rem" ? "rem" : "px";
  options.colorFormat = toColorFormat(layout.colorFormat);
  options.panelMode = layout.mode === "float" ? "float" : "push";
}

export function saveLayout(panel: HTMLElement): void {
  const open = panel.dataset.tab ?? "";
  const layout: Layout = {
    width: panel.style.width,
    tab: TAB_IDS.includes(open) ? open : (readStore<Layout>(LAYOUT_KEY).tab ?? "specs"),
    unit: options.unit,
    colorFormat: options.colorFormat,
    mode: options.panelMode,
  };
  writeStore(LAYOUT_KEY, layout);
}

export function setTab(panel: HTMLElement, tab: string): void {
  panel.dataset.tab = tab;
  saveLayout(panel);
}
