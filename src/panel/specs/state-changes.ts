/** What a state changes: its declarations as property and value, without those that leave the element as it is. */
import { sameColor } from "../../specs/colors";
import { splitTopLevel } from "../../specs/declarations";

/** A declaration of a state: as written, and with its variables read. */
export type StateChange = { property: string; value: string; resolved: string };

const VARIABLE = /var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g;
const IMPORTANT = /\s*!important\s*$/i;

/** The value with each `var(--x)` replaced by what the element has for it. */
function resolveVariables(value: string, computedStyle: CSSStyleDeclaration): string {
  return value.replace(VARIABLE, (text, name: string) => computedStyle.getPropertyValue(name).trim() || text);
}

function toChange(declaration: string, computedStyle: CSSStyleDeclaration): StateChange {
  const colon = declaration.indexOf(":");
  const value = declaration.slice(colon + 1).trim();
  const resolved = resolveVariables(value, computedStyle).replace(IMPORTANT, "");
  return { property: declaration.slice(0, colon).trim(), value, resolved };
}

/**
 * shortcut: a shorthand is compared with the computed shorthand as text, so
 * `border: 1px solid red` that the element already has may still be listed;
 * compare longhand by longhand if that noise shows.
 */
function changesIt({ property, resolved }: StateChange, computedStyle: CSSStyleDeclaration): boolean {
  const current = computedStyle.getPropertyValue(property).trim();
  return resolved !== current && !sameColor(resolved, current);
}

/** The merged declarations of a state (`cssText`), less those that change nothing now. */
export function stateChanges(cssText: string, computedStyle: CSSStyleDeclaration): StateChange[] {
  return splitTopLevel(cssText, ";")
    .map((declaration) => toChange(declaration, computedStyle))
    .filter((change) => changesIt(change, computedStyle));
}
