/**
 * The side panel: docked to the right edge, with a tab bar, a » menu (the
 * Reference tab, "Push the page aside", "Show on a canvas" and "Collapse
 * panel") and a resize handle.
 *
 * It slides in when an element is pinned and out when it closes. Alt + Shift + G opens it with nothing
 * pinned, to reach the menu, the reference and the Edits tab, and closes it again.
 *
 * It either pushes the page aside by its own width (the default) or floats
 * over the page; the user switches in the » menu and the choice is remembered.
 */
import { h } from "../dom";
import { elementName } from "../element-name";
import { onPage, onPageView } from "../page";
import { ALT_KEY } from "../platform";
import { mount } from "../root";
import { onSelection, type SelectionChange, unpin } from "../selection";
import { changesTab } from "./changes/changes-tab";
import { cssTab } from "./css/css-tab";
import { closePanel, connectDock, expandPanel, isPanelOpen, openPanel, reportDock } from "./dock";
import { editsTab } from "./edits/edits-tab";
import { layersTab } from "./layers-tab";
import { loadLayout, setTab } from "./layout";
import { mountMoreMenu } from "./more-menu";
import template from "./panel.html?raw";
import { referenceTab } from "./reference-tab";
import { resizeByDragging } from "./resize-handle";
import { specsTab } from "./specs/specs-tab";
import { part, type Tab } from "./tab";
import { mountTextEditSwitch } from "./text-edit-switch";

const TABS: Tab[] = [specsTab, cssTab, layersTab, editsTab, changesTab, referenceTab];

let panel: HTMLElement | undefined;

/** Alt + Shift + G, by the key's place on the keyboard: Alt changes the letter it types. */
const isPanelShortcut = (event: KeyboardEvent): boolean =>
  event.altKey && event.shiftKey && event.code === "KeyG";

/** The shortcut opens the panel with nothing pinned; pressed again, it closes the panel. */
function togglePanel(event: KeyboardEvent): void {
  event.preventDefault();
  if (!isPanelOpen()) {
    showPanel(undefined, "pinned");
    return;
  }
  // Unpinning closes the panel, with or without an element.
  unpin();
}

function mountTabBar(element: HTMLElement): void {
  part(element, ".tabs").addEventListener("click", (event) => {
    // Cast: a click on the tab bar comes from one of its elements.
    const tab = (event.target as Element).closest<HTMLElement>(".tab")?.dataset.tab;
    if (tab) setTab(element, tab);
  });
}

function createPanel(): HTMLElement {
  const element = mount(h("div", "panel"));
  element.innerHTML = template;
  loadLayout(element);

  // Keys typed in the panel must not trigger the page's own shortcuts.
  element.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (isPanelShortcut(event)) togglePanel(event);
  });
  part(element, ".empty kbd").textContent = ALT_KEY;
  mountTabBar(element);
  part(element, ".close").addEventListener("click", unpin);
  mountMoreMenu(element);
  mountTextEditSwitch(element);
  part(element, ".rail").addEventListener("click", () => expandPanel(element));
  resizeByDragging(element);

  TABS.forEach((tab) => tab.mount(element));
  connectDock(element);
  return element;
}

/** Shows the panel on `element`, or with nothing pinned. */
function showPanel(element: Element | undefined, change: SelectionChange): void {
  panel ??= createPanel();
  openPanel();
  panel.classList.toggle("is-empty", element === undefined);
  part(panel, ".rail .name").textContent = element ? `Inspect · ${elementName(element)}` : "Inspect";
  if (change === "pinned") expandPanel(panel);
  TABS.forEach((tab) => (element ? tab.render(element, change) : tab.renderUnpinned?.()));
  reportDock();
}

export function startPanel(): void {
  onSelection((element, change) => {
    if (element) {
      showPanel(element, change);
      return;
    }
    // Unpinned: the panel closes. Any other change (a setting, a new frame
    // size) leaves a panel that is open with nothing pinned as it is.
    if (change === "pinned") closePanel();
    reportDock();
  });
  onPage("keydown", (event) => {
    if (isPanelShortcut(event)) togglePanel(event);
  });
  // The canvas opened or closed: the page is pushed only while it is off.
  onPageView(reportDock);
}
