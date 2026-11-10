/** Links that reopen the page with an element pinned: `?inspect=<selector>`. */
import { getSelector } from "./edits/selector";
import { isOwn } from "./root";
import { pin } from "./selection";

const PARAM = "inspect";

/** A link to this page with `el` pinned, scrolled to the element's board. */
export function elementLink(el: Element): string {
  const url = new URL(location.href);
  url.searchParams.set(PARAM, getSelector(el));
  const board = el.closest("section[id]");
  if (board) url.hash = board.id;
  return url.href;
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
    let el: Element | null = null;
    try {
      el = document.querySelector(selector);
    } catch {
      // Not a valid selector.
    }
    if (el && !isOwn(el)) {
      el.scrollIntoView({ block: "center" });
      pin(el);
    }
    if (el || ++tries > 60) clearInterval(timer);
  }, 250);
}
