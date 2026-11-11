/**
 * Alt and an arrow key move the pin: ↑ to the parent, ↓ to the first child
 * (or back to the child ↑ came from), ← and → to the element before and
 * after it, going on past the first and last sibling (navigate.ts). Alt is
 * the inspect key, so the keys work wherever the focus is, on the page or in
 * the panel, except in a field or an open menu, where they are its own. A
 * plain arrow key is always the page's. When they act the key is kept from
 * the page, and the pinned element is scrolled into view if it is off
 * screen, which is the one change to the page.
 */
import { type Move, findNeighbour } from "./navigate";
import { isTextEditing } from "./overlay/text-edit";
import { isElement, onPageCapture } from "./page";
import { isOwn } from "./root";
import { findPinnedElement, pin } from "./selection";

const MOVE_BY_KEY: Record<string, Move> = {
  ArrowUp: "parent",
  ArrowDown: "child",
  ArrowLeft: "previous",
  ArrowRight: "next",
};

/** Where the key was typed: its real target, and the panel it is in, if any. */
type Typed = { target: unknown; panel: HTMLElement | undefined };

const isPanel = (node: unknown): node is HTMLElement => isElement(node) && node.classList.contains("panel");

function whereTyped(event: KeyboardEvent): Typed {
  const path = event.composedPath();
  return { target: path[0], panel: isOwn(event.target) ? path.find(isPanel) : undefined };
}

/** An input, or a value being edited: arrow keys are its own. */
const isField = (target: unknown): boolean =>
  isElement(target) &&
  // Cast: only HTML elements say whether they are editable; the rest are not.
  ((target as HTMLElement).isContentEditable === true ||
    ["input", "textarea", "select"].includes(target.localName));

/** The » menu or a row's menu is open: its keys are its own. */
const isMenuOpen = (panel: HTMLElement | undefined): boolean =>
  Boolean(panel?.querySelector(".more-menu:not([hidden]), .row-menu"));

function isOurs(event: KeyboardEvent, { target, panel }: Typed): boolean {
  const isAltOnly = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  return isAltOnly && !isField(target) && !isTextEditing() && !isMenuOpen(panel);
}

/** The element the last ↑ left, so that ↓ goes back to it and not to the first child. */
let leftChild: Element | undefined;

/** Where the move leads: ↓ returns to the child ↑ came from, while it is still a child of the pinned element. */
function findTarget(pinned: Element, move: Move): Element | undefined {
  const isBack = move === "child" && leftChild?.isConnected && findNeighbour(leftChild, "parent") === pinned;
  const target = isBack ? leftChild : findNeighbour(pinned, move);
  leftChild = move === "parent" && target ? pinned : undefined;
  return target;
}

function pressArrow(event: KeyboardEvent): void {
  const pinned = findPinnedElement();
  if (!pinned || !Object.hasOwn(MOVE_BY_KEY, event.key)) return;
  if (!isOurs(event, whereTyped(event))) return;
  event.preventDefault();
  event.stopPropagation();
  const next = findTarget(pinned, MOVE_BY_KEY[event.key]);
  if (!next) return;
  pin(next);
  next.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function startNavigation(): void {
  onPageCapture("keydown", pressArrow);
}
