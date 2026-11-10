/** What every panel tab provides, and helpers to reach the panel's markup. */
import type { SelectionChange } from "../selection";

export interface Tab {
  /** Wires the tab's controls. Called once, when the panel is created. */
  mount(panel: HTMLElement): void;
  /** Shows the pinned element. Called on every pin and every change. */
  render(el: Element, change: SelectionChange): void;
}

/** An element of panel.html. Throws when the markup and the code disagree. */
export function part<T extends HTMLElement = HTMLElement>(panel: HTMLElement, selector: string): T {
  const node = panel.querySelector<T>(selector);
  if (!node) throw new Error(`live-inspector: panel.html has no "${selector}"`);
  return node;
}

/** The scrolling body of a tab. */
export const tabBody = (panel: HTMLElement, tab: string): HTMLElement =>
  part(panel, `.body[data-for="${tab}"]`);
