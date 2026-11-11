/** The rows of the token list: what tells the tokens apart (a swatch, a shadow, a curve), the token's name, its value. */
import { h } from "../../dom";
import { easingGlyph } from "../../icons";
import { easingCurve } from "../../specs/motion";
import type { Fit, TokenChoice } from "../../specs/suggest";

/** What a row does when clicked. */
export type TokenRows = { shown: TokenChoice[]; fit: Fit; pick: (name: string) => void };

/** A colour's swatch, a shadow drawn on a small square, a timing function's curve; nothing for the rest. */
function createMark({ value }: TokenChoice, fit: Fit): Element[] {
  if (fit === "easing") return [easingGlyph(easingCurve(value))];
  if (fit !== "color" && fit !== "shadow") return [];
  const mark = h("span", fit === "color" ? "swatch is-small" : "shadow-chip");
  mark.style.setProperty(fit === "color" ? "--swatch" : "--shadow", value);
  return [mark];
}

function createItem(
  { name, value }: TokenChoice,
  { fit, pick }: Pick<TokenRows, "fit" | "pick">,
): HTMLElement {
  const item = h("button", "token-item");
  item.setAttribute("role", "option");
  item.dataset.token = name;
  item.append(...createMark({ name, value }, fit));
  item.append(h("span", "token-name", name), h("span", "token-value", value));
  item.title = `${name}: ${value}`;
  item.addEventListener("click", () => pick(name));
  return item;
}

export function fillItems(list: HTMLElement, rows: TokenRows): void {
  list.replaceChildren(...rows.shown.map((token) => createItem(token, rows)));
}

/** Highlights the row at `active`, and scrolls it into view. */
export function markActive(list: HTMLElement, active: number): void {
  Array.from(list.children).forEach((item, index) => {
    item.classList.toggle("is-active", index === active);
    item.setAttribute("aria-selected", String(index === active));
  });
  list.children[active]?.scrollIntoView({ block: "nearest" });
}
