/** Links that reopen the page with an element pinned: `?inspect=<selector>`. */
import { getSelector } from "./edits/selector";
import { pageAddress, pageDocument } from "./page";
import { isOwn } from "./root";
import { pin } from "./selection";

const PARAM = "inspect";

/** Boards render late: how often to look for the linked element, and how many times. */
const LOOK_INTERVAL_MS = 250;
const LOOK_LIMIT = 60;

/** A link to this page with `element` pinned, scrolled to the element's board. */
export function elementLink(element: Element): string {
  const url = pageAddress();
  url.searchParams.set(PARAM, getSelector(element));
  const board = element.closest("section[id]");
  if (board) url.hash = board.id;
  return url.href;
}

function findBySelector(selector: string): Element | undefined {
  try {
    return pageDocument().querySelector(selector) ?? undefined;
  } catch {
    // Not a valid selector.
    return undefined;
  }
}

function pinLinked(element: Element): void {
  if (isOwn(element)) return;
  element.scrollIntoView({ block: "center" });
  pin(element);
}

/**
 * Pins the element a shared link points to. Pages render boards late, so
 * this keeps looking for a while (15 seconds) before giving up.
 */
export function pinFromLink(): void {
  const selector = new URLSearchParams(location.search).get(PARAM);
  if (!selector) return;
  let tries = 0;
  const timer = setInterval(() => {
    const element = findBySelector(selector);
    if (element) pinLinked(element);
    if (element || ++tries > LOOK_LIMIT) clearInterval(timer);
  }, LOOK_INTERVAL_MS);
}
