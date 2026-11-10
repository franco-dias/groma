/**
 * Edits made in the All CSS tab: style overrides and content changes.
 *
 * They are saved in localStorage per page, keyed by element selector, and
 * replayed when the page loads. What the page had before the first edit is
 * remembered, so a reset can put it back.
 */
import { readStore, writeStore } from "./storage";

// Scoped by page: every file:// page shares one localStorage.
const STYLE_KEY = "__groma_overrides:" + location.pathname;
const CONTENT_KEY = "__groma_html:" + location.pathname;

type StyleOverrides = Record<string, Record<string, string>>;
type ContentOverrides = Record<string, string>;

/** Inline value and priority of a property before its first edit. */
const originalStyles = new WeakMap<Element, Record<string, [string, string]>>();
const originalContent = new WeakMap<Element, string>();

const inlineStyle = (el: Element): CSSStyleDeclaration => (el as HTMLElement).style;

// ── styles ─────────────────────────────────────────────────────

export function savedStyles(selector: string): Record<string, string> {
  return readStore<StyleOverrides>(STYLE_KEY)[selector] ?? {};
}

/** Saves one property; `null` forgets it. */
export function saveStyle(selector: string, prop: string, value: string | null): void {
  const all = readStore<StyleOverrides>(STYLE_KEY);
  const props = (all[selector] ??= {});
  if (value === null) delete props[prop];
  else props[prop] = value;
  if (!Object.keys(props).length) delete all[selector];
  writeStore(STYLE_KEY, all);
}

export function applyStyle(el: Element, prop: string, value: string): void {
  const style = inlineStyle(el);
  const originals = originalStyles.get(el) ?? {};
  originalStyles.set(el, originals);
  originals[prop] ??= [style.getPropertyValue(prop), style.getPropertyPriority(prop)];
  style.setProperty(prop, value);
}

/** Puts back the inline value the page had before the first edit. */
export function restoreStyle(el: Element, prop: string): void {
  const [value, priority] = originalStyles.get(el)?.[prop] ?? ["", ""];
  inlineStyle(el).setProperty(prop, value, priority);
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
  return selector in readStore<ContentOverrides>(CONTENT_KEY);
}

/** Saves an element's content; `null` forgets it. */
export function saveContent(selector: string, content: string | null): void {
  const all = readStore<ContentOverrides>(CONTENT_KEY);
  if (content === null) delete all[selector];
  else all[selector] = content;
  writeStore(CONTENT_KEY, all);
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

/** Applies every saved edit to the page, or only inside `root`. */
export function replayOverrides(root: ParentNode = document): void {
  Object.entries(readStore<StyleOverrides>(STYLE_KEY)).forEach(([selector, props = {}]) => {
    forEachMatch(root, selector, (el) => {
      Object.entries(props).forEach(([prop, value]) => applyStyle(el, prop, value));
    });
  });
  Object.entries(readStore<ContentOverrides>(CONTENT_KEY)).forEach(([selector, content = ""]) => {
    forEachMatch(root, selector, (el) => applyContent(el, content));
  });
}
