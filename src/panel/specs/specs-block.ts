/** The pieces blocks of the Specs tab are made of: a titled section, and a colour swatch. */
import { h } from "../../dom";
import type { SpecsContext } from "./specs-context";

/** A block's title, the note at the right of it, an extra class, and a button beside the title. */
export type BlockHeading = { title: string; note?: string; className?: string; action?: HTMLElement };

/** Adds a titled block to the tab. */
export function addBlock(
  { body }: SpecsContext,
  { title, note = "", className, action }: BlockHeading,
): HTMLElement {
  const section = body.appendChild(h("section", className ? `block ${className}` : "block"));
  const head = section.appendChild(h("div", "block-head"));
  head.appendChild(h("h3", "", title));
  if (note) head.appendChild(h("span", "note", note));
  if (action) head.appendChild(action);
  return section;
}

export function createSwatch(color: string): HTMLElement {
  const chip = h("span", "swatch");
  chip.style.setProperty("--swatch", color);
  return chip;
}

export function createSmallSwatch(color: string): HTMLElement {
  const chip = h("span", "swatch is-small");
  chip.style.setProperty("--swatch", color);
  return chip;
}
