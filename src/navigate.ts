/**
 * The element a move from one element ends on: its parent, a child, or the
 * element before or after it. Before and after are siblings first; past the
 * first or last sibling the move goes on to the parent's neighbour and back
 * down, so the pin stays at the depth it was. A wrapper with no box of its
 * own (`display: contents`) is looked through: its children count as its
 * parent's.
 */
import { isOwn } from "./root";

export type Move = "parent" | "child" | "previous" | "next";

type Side = "previous" | "next";

/** Elements that cannot be inspected: they are not part of the page's content. */
const SKIPPED = new Set(["script", "style", "link", "meta", "head"]);

/** Not the inspector's own host, not a tag with nothing to show, and with a box on the page. */
const isInspectable = (element: Element): boolean =>
  !isOwn(element) && !SKIPPED.has(element.localName) && element.getClientRects().length > 0;

/** A wrapper the page lays out as if it were not there. */
const isLookedThrough = (element: Element): boolean =>
  element.ownerDocument.defaultView?.getComputedStyle(element).display === "contents";

function shownUnder(child: Element): Element[] {
  if (isInspectable(child)) return [child];
  return isLookedThrough(child) ? findChildren(child) : [];
}

/** The children as the page shows them, in order. */
export function findChildren(element: Element): Element[] {
  return Array.from(element.children).flatMap(shownUnder);
}

/** The nearest ancestor with a box, but never `html`: the walk up stops at `body`. */
function findParent(element: Element): Element | undefined {
  let parent = element.parentElement;
  while (parent && isLookedThrough(parent)) parent = parent.parentElement;
  return parent && parent !== element.ownerDocument.documentElement ? parent : undefined;
}

function findSibling(element: Element, side: Side): Element | undefined {
  const parent = findParent(element);
  if (!parent) return undefined;
  const siblings = findChildren(parent);
  const index = siblings.indexOf(element);
  return index < 0 ? undefined : siblings[index + (side === "next" ? 1 : -1)];
}

/** The child nearest to where the move came from: the first going forward, the last going back. */
const findEdgeChild = (element: Element, side: Side): Element | undefined =>
  findChildren(element).at(side === "next" ? 0 : -1);

/**
 * The sibling on that side, or past the edge: the parent's neighbour, and
 * its nearest child when it has one. A neighbour with no children is the
 * move's end itself.
 */
function findBeside(element: Element, side: Side): Element | undefined {
  const sibling = findSibling(element, side);
  if (sibling) return sibling;
  const parent = findParent(element);
  const neighbour = parent && findBeside(parent, side);
  return neighbour && (findEdgeChild(neighbour, side) ?? neighbour);
}

/** Where `move` leads from `element`, or undefined when it leads nowhere. */
export function findNeighbour(element: Element, move: Move): Element | undefined {
  if (move === "parent") return findParent(element);
  if (move === "child") return findChildren(element)[0];
  return findBeside(element, move);
}
