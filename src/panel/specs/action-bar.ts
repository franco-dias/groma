/**
 * The action bar above the Specs tab: switches the unit, shows a grid,
 * compares with another element, copies a link to the element and picks a
 * colour.
 */
import { elementLink } from "../../link";
import { options } from "../../options";
import { onPage, pageAddress } from "../../page";
import { findPinnedElement, rerender } from "../../selection";
import { copyOnClick } from "../copy";
import { saveLayout } from "../layout";
import { part } from "../tab";
import { stopComparing } from "./compare-block";
import { mountSegments } from "./segments";

function mountSwitches(panel: HTMLElement): void {
  mountSegments(part(panel, '[data-option="unit"]'), {
    current: () => options.unit,
    choose: (value) => {
      options.unit = value === "rem" ? "rem" : "px";
      saveLayout(panel);
    },
  });
  mountSegments(part(panel, '[data-option="grid"]'), {
    current: () => String(options.gridStep),
    choose: (value) => {
      options.gridStep = Number(value);
    },
  });
}

function mountCompare(panel: HTMLElement): HTMLElement {
  const compare = part(panel, '[data-action="compare"]');
  compare.addEventListener("click", () => {
    options.compareWith = options.compareWith ? undefined : findPinnedElement();
    rerender();
  });
  // Esc ends a comparison, wherever the focus is on the page.
  onPage("keydown", (event) => {
    if (event.key === "Escape" && options.compareWith) stopComparing();
  });
  return compare;
}

function mountPicker(panel: HTMLElement): void {
  const pick = part(panel, '[data-action="pick"]');
  const { EyeDropper } = window;
  pick.hidden = !EyeDropper;
  pick.addEventListener("click", async () => {
    if (!EyeDropper) return;
    pick.setAttribute("aria-pressed", "true");
    try {
      options.pickedColor = (await new EyeDropper().open()).sRGBHex;
    } catch {
      // The user pressed Escape.
    }
    pick.setAttribute("aria-pressed", "false");
    rerender();
  });
}

/** Brings the action bar in line with the options; set once the bar is mounted. */
let showActionStates = (): void => {};

export const updateActionBar = (): void => showActionStates();

export function mountActionBar(panel: HTMLElement): void {
  mountSwitches(panel);
  const compare = mountCompare(panel);
  mountPicker(panel);
  copyOnClick(part(panel, '[data-action="link"]'), () => {
    const pinned = findPinnedElement();
    return pinned ? elementLink(pinned) : pageAddress().href;
  });
  showActionStates = () => compare.setAttribute("aria-pressed", String(options.compareWith !== undefined));
}
