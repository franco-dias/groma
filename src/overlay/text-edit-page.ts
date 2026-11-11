/** What text editing in place needs to know about the page's element: whether it can be edited, its selection, and whether it is still there. */
import { hasValue } from "../edits/content-overrides";

// Only HTML elements have `isContentEditable`; SVG text is not edited here.
const isHtmlElement = (element: Element): element is HTMLElement => "isContentEditable" in element;

/** Text and nothing else: no child elements, and not a form control (its value is edited in the All CSS tab). */
export const holdsOnlyText = (element: Element): element is HTMLElement =>
  isHtmlElement(element) &&
  !hasValue(element) &&
  element.childElementCount === 0 &&
  (element.textContent ?? "").trim() !== "";

export function selectContents(element: Element): void {
  element.ownerDocument.getSelection()?.selectAllChildren(element);
}

export function leaveSelection(element: Element): void {
  const selection = element.ownerDocument.getSelection();
  if (selection?.anchorNode && element.contains(selection.anchorNode)) selection.removeAllRanges();
}

/** Calls `onRemoved` when the page removes the element: nothing is left to edit. */
export function watchRemoval(element: Element, onRemoved: () => void): MutationObserver {
  const watcher = new MutationObserver(() => {
    if (!element.isConnected) onRemoved();
  });
  watcher.observe(element.ownerDocument, { childList: true, subtree: true });
  return watcher;
}
