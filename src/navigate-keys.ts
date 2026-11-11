/**
 * Arrow keys move the pin: ↑ to the parent, ↓ to the first child, ← and → to
 * the previous and next sibling. They are the inspector's only when the focus
 * is in the panel and not in a field or a menu, or when inspect mode is locked
 * on and the focus is not in a field of the page; in any other situation they
 * are the page's (scrolling) and are not touched. When they act the key is
 * kept from the page, and the pinned element is scrolled into view if it is
 * off screen, which is the one change to the page.
 */
import { type Move, findNeighbour } from "./navigate";
import { isInspectLocked } from "./overlay/inspect-lock";
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
  const isPlain = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  const isFree = !isField(target) && !isTextEditing() && !isMenuOpen(panel);
  return isPlain && isFree && (panel !== undefined || isInspectLocked());
}

function pressArrow(event: KeyboardEvent): void {
  const pinned = findPinnedElement();
  if (!pinned || !Object.hasOwn(MOVE_BY_KEY, event.key)) return;
  const typed = whereTyped(event);
  if (!isOurs(event, typed)) return;
  event.preventDefault();
  event.stopPropagation();
  const next = findNeighbour(pinned, MOVE_BY_KEY[event.key]);
  if (!next) return;
  pin(next);
  next.scrollIntoView({ block: "nearest", inline: "nearest" });
  // The panel redraws and may drop the focus; keep it where the next key will look for it.
  typed.panel?.focus({ preventScroll: true });
}

export function startNavigation(): void {
  onPageCapture("keydown", pressArrow);
}
