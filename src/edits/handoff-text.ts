/** What "Copy edits" puts on the clipboard: the edits, with what a reader needs to find each element. */
import { config } from "../config";
import { CONTENT, findEdited } from "./edit-values";
import { type ElementEdits, listEdits, type ValueEdit } from "./edit-list";
import { formatHandoff, type HandoffElement, type HandoffValue } from "./handoff";
import { elementName } from "../element-name";
import { pageAddress, pageWindow } from "../page";
import { tokensWithValue } from "../specs/colors";
import { findComponent } from "../specs/component";

const MAX_TEXT_LENGTH = 80;

/**
 * The page's tokens that hold a new value. On a page that says which
 * variables are its design tokens (the token prefixes), only those count.
 */
function matchingTokens(computedStyle: CSSStyleDeclaration, value: string): string[] {
  // A value that names a token already needs no match.
  if (value.includes("var(")) return [];
  const tokens = tokensWithValue(computedStyle, value);
  const prefixes = config.tokenPrefixes;
  return prefixes.length
    ? tokens.filter((token) => prefixes.some((prefix) => token.startsWith(prefix)))
    : tokens;
}

/** The start of the element's text, to search the source for. */
function textOf(element: Element | undefined): string {
  // The text as shown: `textContent` would include a <style> inside the element.
  // Cast: only HTML elements have `innerText`; others fall back to `textContent`.
  const shown = (element as HTMLElement | undefined)?.innerText ?? element?.textContent ?? "";
  return shown.replace(/\s+/g, " ").trim();
}

/** A value with the tokens of the page that hold it. */
function describeValue(computedStyle: CSSStyleDeclaration | undefined, edit: ValueEdit): HandoffValue {
  const { prop, before, after } = edit;
  return {
    prop: prop === CONTENT ? "" : prop,
    before,
    after,
    tokens: computedStyle && prop !== CONTENT ? matchingTokens(computedStyle, after) : [],
  };
}

/** An edited element with what a reader needs to find it in the source. */
function describe({ selector, values, note }: ElementEdits): HandoffElement {
  const element = findEdited(selector);
  const component = element && findComponent(element);
  const computedStyle = element && getComputedStyle(element);
  return {
    name: element ? elementName(element) : (selector.split(" > ").at(-1) ?? selector),
    selector,
    onPage: element !== undefined,
    component,
    // Edited content is in the list already, as before → after.
    text: values.some((value) => value.prop === CONTENT)
      ? undefined
      : textOf(element).slice(0, MAX_TEXT_LENGTH) || undefined,
    values: values.map((edit) => describeValue(computedStyle, edit)),
    note,
  };
}

export function handoffText(): string {
  const view = pageWindow();
  return formatHandoff(
    { address: pageAddress().href, width: view.innerWidth, height: view.innerHeight },
    listEdits().map(describe),
  );
}

/** The text for a reader that is not asking for it with a click (`Groma.edits()`): empty when there is nothing to hand over. */
export const handoffTextOrEmpty = (): string => (listEdits().length ? handoffText() : "");
