/** The transparent layer that hover boxes and distance lines are drawn on. */
import { type Box, h, placeOver } from "../dom";
import { mountOnPage } from "../root";

/** Each kind is a CSS class in styles/overlay.css. */
export type BoxKind =
  | "margin"
  | "border"
  | "padding"
  | "content-box"
  | "gap"
  | "child"
  | "target"
  | "measure is-x"
  | "measure is-y";

let layer: HTMLElement | null = null;

const overlay = (): HTMLElement => (layer ??= mountOnPage(h("div", "overlay")));

/** Draws one box; boxes with no area are skipped. */
export function addBox(box: Box, kind: BoxKind): void {
  if (box.width <= 0 || box.height <= 0) return;
  placeOver(overlay().appendChild(h("div", kind)), box);
}

/** Draws a distance label at a point; `transform` places it relative to that point. */
export function addLabel(text: string, left: number, top: number, transform: string): void {
  const label = overlay().appendChild(h("div", "measure-label", text));
  label.style.left = `${left}px`;
  label.style.top = `${top}px`;
  label.style.transform = transform;
}

export function clearBoxes(): void {
  layer?.replaceChildren();
}
