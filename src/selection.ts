/**
 * The pinned element: the one the panel describes.
 *
 * Modules that pick an element (Alt+click, the Layers tree, a shared link)
 * call `pin`. Modules that show it (the panel tabs, the outline) subscribe
 * with `onSelection`, so neither side has to know the other.
 */

/** "pinned": another element was chosen. "updated": same element, new data. */
export type SelectionChange = "pinned" | "updated";

type Listener = (el: Element | null, change: SelectionChange) => void;

let pinned: Element | null = null;
const listeners: Listener[] = [];

export const pinnedElement = (): Element | null => pinned;

export function onSelection(listener: Listener): void {
  listeners.push(listener);
}

function notify(change: SelectionChange): void {
  listeners.forEach((listener) => listener(pinned, change));
}

export function pin(el: Element): void {
  pinned = el;
  notify("pinned");
}

export function unpin(): void {
  pinned = null;
  notify("pinned");
}

/** Call after an edit or an option change so everything shows the new state. */
export function rerender(): void {
  notify("updated");
}
