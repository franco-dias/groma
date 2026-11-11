/**
 * Editing text right on the page. With inspect mode locked on (the launcher
 * pill, or the panel's "Edit text inline" switch), a double-click on an
 * element that holds only text pins it and lets the user type in it.
 *   Enter, or a click elsewhere   apply       Escape   put the text back
 * The edit is a content edit, like one made in the All CSS tab: saved, listed
 * in the Edits tab, undone from there. Making the element editable changes
 * its `contenteditable` and `spellcheck` for a while; both are put back
 * exactly when editing ends, however it ends.
 */
import { edit } from "../edits/changes";
import { CONTENT } from "../edits/edit-values";
import { getSelector } from "../edits/selector";
import { isElement, onPageCapture } from "../page";
import { onSelection, pin, rerender } from "../selection";
import { lendAttributes } from "./lend-attributes";
import { holdsOnlyText, leaveSelection, selectContents, watchRemoval } from "./text-edit-page";

type Session = {
  element: HTMLElement;
  /** The element's HTML when editing began, which Escape puts back. */
  before: string;
  giveBack: () => void;
  watcher: MutationObserver;
};

let session: Session | undefined;

export const isTextEditing = (): boolean => session !== undefined;

/** True for the element being edited and anything inside it. */
export const isInTextEdit = (target: unknown): boolean =>
  isElement(target) && session !== undefined && session.element.contains(target);

function openSession(element: HTMLElement): Session {
  const before = element.innerHTML;
  const giveBack = lendAttributes(element, { contenteditable: "plaintext-only", spellcheck: "false" });
  // A browser without plaintext-only still gets an editable element.
  if (!element.isContentEditable) element.setAttribute("contenteditable", "true");
  element.addEventListener("blur", applyTextEdit);
  element.focus();
  selectContents(element);
  return { element, before, giveBack, watcher: watchRemoval(element, cancelTextEdit) };
}

/** Pins the element and lets the user type in it; an edit in progress elsewhere is applied first. */
export function editTextInPlace(element: Element): void {
  if (!holdsOnlyText(element)) return;
  applyTextEdit();
  pin(element);
  session = openSession(element);
}

/** Ends editing and leaves the element as the page had it, apart from what was typed. */
function closeSession(current: Session): void {
  const { element } = current;
  session = undefined;
  element.removeEventListener("blur", applyTextEdit);
  current.watcher.disconnect();
  current.giveBack();
  leaveSelection(element);
  if (element.ownerDocument.activeElement === element) element.blur();
}

/** Makes what was typed an edit of the element's content. */
export function applyTextEdit(): void {
  const current = session;
  if (!current) return;
  const after = current.element.innerHTML;
  closeSession(current);
  if (after !== current.before) commitText(current, after);
  rerender();
}

function commitText({ element, before }: Session, after: string): void {
  // The edit records what the page had: put that back before it is made.
  element.innerHTML = before;
  edit({ selector: getSelector(element), prop: CONTENT, value: after, element });
}

export function cancelTextEdit(): void {
  const current = session;
  if (!current) return;
  closeSession(current);
  if (current.element.innerHTML !== current.before) current.element.innerHTML = current.before;
  rerender();
}

function pressKey(event: KeyboardEvent): void {
  if (!session) return;
  // Alt going down or up is the inspector's to see, or it would count as held for good.
  if (event.key === "Alt") return;
  // Not a shortcut of the inspector or of the page: the keys belong to the text.
  event.stopPropagation();
  if (event.isComposing) return;
  if (event.key === "Enter") {
    event.preventDefault();
    applyTextEdit();
  }
  if (event.key === "Escape") cancelTextEdit();
}

function keepKeyUp(event: KeyboardEvent): void {
  if (session && event.key !== "Alt") event.stopPropagation();
}

/** Starts watching for what ends an edit in place; hover.ts starts an edit. */
export function watchTextEdit(): void {
  onPageCapture("keydown", pressKey);
  onPageCapture("keyup", keepKeyUp);
  // A press outside: the page's own press handling is held back, so the blur may never come.
  for (const type of ["pointerdown", "mousedown"] as const) {
    onPageCapture(type, (event) => {
      if (session && !isInTextEdit(event.target)) applyTextEdit();
    });
  }
  onSelection((pinned) => {
    if (session && pinned !== session.element) applyTextEdit();
  });
}
