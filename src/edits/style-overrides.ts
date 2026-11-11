/**
 * Style edits made in the Specs and All CSS tabs: saved in localStorage per
 * page, keyed by element selector, and put on the element as inline styles.
 *
 * What the element had before the first edit of a property is remembered, so
 * a reset can put it back.
 */
import { pageAddress } from "../page";
import type { PropTarget } from "./edit-records";
import { readStore, writeStore } from "./storage";
import { markEditsOn, rememberSeen } from "./visit-memory";

// Scoped by page: every file:// page shares one localStorage.
const styleKey = (): string => "__groma_overrides:" + pageAddress().pathname;

type StyleOverrides = Record<string, Record<string, string>>;

/** Inline value and priority of a property before its first edit. */
const originalStyles = new WeakMap<Element, Record<string, [string, string]>>();

// Cast: every element of the page has a `style` (SVG too); the type only says so for HTML.
const inlineStyle = (element: Element): CSSStyleDeclaration => (element as HTMLElement).style;

export function savedStyles(selector: string): Record<string, string> {
  return readStore<StyleOverrides>(styleKey())[selector] ?? {};
}

/** Every saved style edit of this page, by selector. */
export const allSavedStyles = (): Partial<StyleOverrides> => readStore<StyleOverrides>(styleKey());

export function saveStyle({ selector, prop }: PropTarget, value: string): void {
  const all = readStore<StyleOverrides>(styleKey());
  const props = (all[selector] ??= {});
  props[prop] = value;
  writeStore(styleKey(), all);
  rememberSeen({ selector, prop, value });
}

export function forgetStyle(selector: string, prop: string): void {
  const all = readStore<StyleOverrides>(styleKey());
  const props = (all[selector] ??= {});
  delete props[prop];
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

/** A property and the value to give it. */
export type StyleValue = { prop: string; value: string };

export function applyStyle(element: Element, { prop, value }: StyleValue): void {
  const style = inlineStyle(element);
  const originals = originalStyles.get(element) ?? {};
  originalStyles.set(element, originals);
  originals[prop] ??= [style.getPropertyValue(prop), style.getPropertyPriority(prop)];
  style.setProperty(prop, value.replace(IMPORTANT, ""), IMPORTANT.test(value) ? "important" : "");
  markEditsOn();
}

/** Puts back the inline value the page had before the first edit. */
export function restoreStyle(element: Element, prop: string): void {
  const original = originalStyles.get(element)?.[prop];
  // Never applied to this element: its inline value is still the page's own.
  if (!original) return;
  inlineStyle(element).setProperty(prop, original[0], original[1]);
  // Leave no empty attribute behind on an element that had no inline style.
  if (element.getAttribute("style") === "") element.removeAttribute("style");
}
