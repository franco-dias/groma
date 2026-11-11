/** What every panel tab provides, and helpers to reach the panel's markup. */
import type { SelectionChange } from "../selection";

export type Tab = {
  /** Wires the tab's controls. Called once, when the panel is created. */
  mount(panel: HTMLElement): void;
  /** Shows the pinned element. Called on every pin and every change. */
  render(element: Element, change: SelectionChange): void;
  /** For a tab with something to show while the panel is open with nothing pinned. */
  renderUnpinned?(): void;
};

/** An element of panel.html. Throws when the markup and the code disagree. */
export function part<TElement extends HTMLElement = HTMLElement>(
  panel: HTMLElement,
  selector: string,
): TElement {
  const node = panel.querySelector<TElement>(selector);
  if (!node) throw new Error(`groma: panel.html has no "${selector}"`);
  return node;
}

/** The scrolling body of a tab. */
export const tabBody = (panel: HTMLElement, tab: string): HTMLElement =>
  part(panel, `.body[data-for="${tab}"]`);
