/**
 * Content edits made in the All CSS tab: an element's text or HTML (or a
 * form control's value), saved in localStorage per page, keyed by selector.
 *
 * What the element had before the first edit is remembered, so a reset can
 * put it back.
 */
import { pageAddress } from "../page";
import { readStore, writeStore } from "./storage";
import { markEditsOn, rememberSeen } from "./visit-memory";

const contentKey = (): string => "__groma_html:" + pageAddress().pathname;

type ContentOverrides = Record<string, string>;

const originalContent = new WeakMap<Element, string>();

const VALUE_TAGS = new Set(["input", "textarea", "select", "option"]);

/** Form controls are edited through their value, everything else through its HTML. */
export const hasValue = (element: Element): boolean => VALUE_TAGS.has(element.localName);

// Cast: a form control, by `hasValue`, has a `value`.
const asControl = (element: Element): HTMLInputElement => element as HTMLInputElement;

export function getContent(element: Element): string {
  return hasValue(element) ? asControl(element).value : element.innerHTML;
}

function setContent(element: Element, content: string): void {
  if (!hasValue(element)) {
    element.innerHTML = content;
    return;
  }
  asControl(element).value = content;
}

export function hasSavedContent(selector: string): boolean {
  return selector in readStore<ContentOverrides>(contentKey());
}

/** Every saved content edit of this page, by selector. */
export const allSavedContent = (): Partial<ContentOverrides> => readStore<ContentOverrides>(contentKey());

export function saveContent(selector: string, content: string): void {
  const all = readStore<ContentOverrides>(contentKey());
  all[selector] = content;
  writeStore(contentKey(), all);
  rememberSeen({ selector, prop: undefined, value: content });
}

export function forgetContent(selector: string): void {
  const all = readStore<ContentOverrides>(contentKey());
  delete all[selector];
  writeStore(contentKey(), all);
}

export function applyContent(element: Element, content: string): void {
  if (!originalContent.has(element)) originalContent.set(element, getContent(element));
  setContent(element, content);
  markEditsOn();
}

/** Puts back the content the page had before the first edit. */
export function restoreContent(element: Element): void {
  const original = originalContent.get(element);
  if (original !== undefined) setContent(element, original);
}
