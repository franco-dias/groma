/**
 * Edits made in the All CSS tab: style overrides and content changes.
 *
 * They are saved in localStorage per page, keyed by element selector, and
 * replayed when the page loads. What the page had before the first edit is
 * remembered, so a reset can put it back, and so the user can look at the
 * page without the edits and bring them back (`showOriginal`).
 *
 * This file applies and stores. The user's edits go through edits/changes.ts,
 * which also keeps the history for undo.
 */
import { pageAddress, pageDocument } from "../page";
import { readStore, writeStore } from "./storage";

// Scoped by page: every file:// page shares one localStorage.
const styleKey = (): string => "__groma_overrides:" + pageAddress().pathname;
const contentKey = (): string => "__groma_html:" + pageAddress().pathname;

type StyleOverrides = Record<string, Record<string, string>>;
type ContentOverrides = Record<string, string>;

/** Inline value and priority of a property before its first edit. */
const originalStyles = new WeakMap<Element, Record<string, [string, string]>>();
const originalContent = new WeakMap<Element, string>();

const inlineStyle = (el: Element): CSSStyleDeclaration => (el as HTMLElement).style;

// ── styles ─────────────────────────────────────────────────────

export function savedStyles(selector: string): Record<string, string> {
  return readStore<StyleOverrides>(styleKey())[selector] ?? {};
}

/** Every saved style edit of this page, by selector. */
export const allSavedStyles = (): Partial<StyleOverrides> => readStore<StyleOverrides>(styleKey());

/** Saves one property; `null` forgets it. */
export function saveStyle(selector: string, prop: string, value: string | null): void {
  const all = readStore<StyleOverrides>(styleKey());
  const props = (all[selector] ??= {});
  if (value === null) delete props[prop];
  else props[prop] = value;
  if (!Object.keys(props).length) delete all[selector];
  writeStore(styleKey(), all);
}

/** "10px !important" is typed as one value; the browser takes the priority apart from it. */
const IMPORTANT = /\s*!important\s*$/i;

/**
 * False for a value the browser would ignore ("banana" for a padding). Such
 * an edit would be saved and listed while the page never showed it.
 */
export function isValidStyle(prop: string, value: string): boolean {
  // A custom property takes any text.
  return prop.startsWith("--") || CSS.supports(prop, value.replace(IMPORTANT, ""));
}

export function applyStyle(el: Element, prop: string, value: string): void {
  const style = inlineStyle(el);
  const originals = originalStyles.get(el) ?? {};
  originalStyles.set(el, originals);
  originals[prop] ??= [style.getPropertyValue(prop), style.getPropertyPriority(prop)];
  style.setProperty(prop, value.replace(IMPORTANT, ""), IMPORTANT.test(value) ? "important" : "");
}

/** Puts back the inline value the page had before the first edit. */
export function restoreStyle(el: Element, prop: string): void {
  const original = originalStyles.get(el)?.[prop];
  // Never applied to this element: its inline value is still the page's own.
  if (!original) return;
  inlineStyle(el).setProperty(prop, original[0], original[1]);
  // Leave no empty attribute behind on an element that had no inline style.
  if (el.getAttribute("style") === "") el.removeAttribute("style");
}

// ── content ────────────────────────────────────────────────────

const VALUE_TAGS = new Set(["input", "textarea", "select", "option"]);

/** Form controls are edited through their value, everything else through its HTML. */
export const hasValue = (el: Element): boolean => VALUE_TAGS.has(el.localName);

export function getContent(el: Element): string {
  return hasValue(el) ? (el as HTMLInputElement).value : el.innerHTML;
}

function setContent(el: Element, content: string): void {
  if (hasValue(el)) (el as HTMLInputElement).value = content;
  else el.innerHTML = content;
}

export function hasSavedContent(selector: string): boolean {
  return selector in readStore<ContentOverrides>(contentKey());
}

/** Every saved content edit of this page, by selector. */
export const allSavedContent = (): Partial<ContentOverrides> => readStore<ContentOverrides>(contentKey());

/** Saves an element's content; `null` forgets it. */
export function saveContent(selector: string, content: string | null): void {
  const all = readStore<ContentOverrides>(contentKey());
  if (content === null) delete all[selector];
  else all[selector] = content;
  writeStore(contentKey(), all);
}

export function applyContent(el: Element, content: string): void {
  if (!originalContent.has(el)) originalContent.set(el, getContent(el));
  setContent(el, content);
}

/** Puts back the content the page had before the first edit. */
export function restoreContent(el: Element): void {
  const original = originalContent.get(el);
  if (original !== undefined) setContent(el, original);
}

// ── replay ─────────────────────────────────────────────────────

function forEachMatch(root: ParentNode, selector: string, apply: (el: Element) => void): void {
  try {
    root.querySelectorAll(selector).forEach(apply);
  } catch {
    // A selector saved by an older version that this browser rejects.
  }
}

let originalShown = false;

/** True while the user looks at the page without their edits. */
export const isOriginalShown = (): boolean => originalShown;

/**
 * Shows the page as it was before the edits, or with them again. The edits
 * stay saved either way.
 */
export function showOriginal(on: boolean): void {
  if (on === originalShown) return;
  originalShown = on;
  if (!on) return replayOverrides();
  const root = pageDocument();
  Object.entries(allSavedStyles()).forEach(([selector, props = {}]) => {
    forEachMatch(root, selector, (el) => Object.keys(props).forEach((prop) => restoreStyle(el, prop)));
  });
  Object.keys(allSavedContent()).forEach((selector) => forEachMatch(root, selector, restoreContent));
}

/** Applies every saved edit to the page, or only inside `root`. */
export function replayOverrides(root: ParentNode = pageDocument()): void {
  // A page that re-renders asks for a replay; the user asked for the original.
  if (originalShown) return;
  Object.entries(readStore<StyleOverrides>(styleKey())).forEach(([selector, props = {}]) => {
    forEachMatch(root, selector, (el) => {
      Object.entries(props).forEach(([prop, value]) => applyStyle(el, prop, value));
    });
  });
  Object.entries(readStore<ContentOverrides>(contentKey())).forEach(([selector, content = ""]) => {
    forEachMatch(root, selector, (el) => applyContent(el, content));
  });
}
