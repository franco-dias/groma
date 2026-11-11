/**
 * The Copy CSS button in the Specs tab's element header: copies what the
 * page's rules and the element's inline style declare for it, one
 * declaration per line, ready to paste into a stylesheet. Not the computed
 * values: shorthands stay shorthands and `var()` stays as written. The
 * user's own edits are inline styles, so they are in it.
 */
import { h } from "../../dom";
import { elementName } from "../../element-name";
import { icon } from "../../icons";
import { createStyleLookup } from "../../page-styles";
import { cssBlock } from "../../specs/declarations";
import { copyOnClick } from "../copy";

/**
 * The declarations of `styles` (weakest first) merged the way the browser
 * does it, by giving them to a scratch element that is never on a page and
 * reading its style back: a later declaration replaces an earlier one, an
 * `!important` one holds, and longhands collapse into their shorthand.
 * shortcut: selector specificity is ignored, the last matching declaration
 * wins; see `declaredValue` in page-styles.ts.
 */
export function mergeDeclarations(styles: CSSStyleDeclaration[]): string {
  const scratch = h("div");
  scratch.style.cssText = styles.map((style) => style.cssText).join(" ");
  return scratch.style.cssText;
}

/** "div.card": the tag and first class, or the component's name. */
function nameInComment(element: Element): string {
  const name = elementName(element);
  const first = element.classList[0];
  return name === element.localName && first ? `${name}.${first}` : name;
}

export function elementCss(element: Element): string {
  const styles = createStyleLookup()(element);
  return cssBlock({ name: nameInComment(element), cssText: mergeDeclarations(styles) });
}

export function createCopyCssButton(element: Element): HTMLElement {
  const button = h("button", "action");
  button.dataset.action = "copy-css";
  button.setAttribute("aria-label", "Copy CSS");
  button.title = "Copy the styles this element declares, as CSS";
  button.append(icon("copy", 14), h("span", "action-label", "Copy CSS"));
  return copyOnClick(button, () => elementCss(element));
}
