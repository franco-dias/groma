/** The rows of the token list: a swatch for a colour, the token's name, its value. */
import { h } from "../../dom";
import type { Fit, TokenChoice } from "../../specs/suggest";

/** What a row does when clicked. */
export type TokenRows = { shown: TokenChoice[]; fit: Fit; pick: (name: string) => void };

function createItem(
  { name, value }: TokenChoice,
  { fit, pick }: Pick<TokenRows, "fit" | "pick">,
): HTMLElement {
  const item = h("button", "token-item");
  item.setAttribute("role", "option");
  item.dataset.token = name;
  if (fit === "color") {
    const swatch = item.appendChild(h("span", "swatch is-small"));
    swatch.style.setProperty("--swatch", value);
  }
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
