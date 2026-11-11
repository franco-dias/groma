/** The element a move from one element ends on: its parent, its first child, or the sibling before or after it. */
import { isOwn } from "./root";

export type Move = "parent" | "child" | "previous" | "next";

/** Elements that cannot be inspected: they are not part of the page's content. */
const SKIPPED = new Set(["script", "style", "link", "meta", "head"]);

/** Not the inspector's own host, not a tag with nothing to show, and with a box on the page. */
const isInspectable = (element: Element): boolean =>
  !isOwn(element) && !SKIPPED.has(element.localName) && element.getClientRects().length > 0;

function findSibling(element: Element, move: "previous" | "next"): Element | undefined {
  const step = move === "next" ? "nextElementSibling" : "previousElementSibling";
  let sibling = element[step];
  while (sibling && !isInspectable(sibling)) sibling = sibling[step];
  return sibling ?? undefined;
}

/** The parent, but never `html`: the walk up stops at `body`. */
function findParent(element: Element): Element | undefined {
  const parent = element.parentElement;
  return parent && parent !== element.ownerDocument.documentElement ? parent : undefined;
}

/** Where `move` leads from `element`, or undefined when it leads nowhere. */
export function findNeighbour(element: Element, move: Move): Element | undefined {
  if (move === "parent") return findParent(element);
  if (move === "child") return Array.from(element.children).find(isInspectable);
  return findSibling(element, move);
}
