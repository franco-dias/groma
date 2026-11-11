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

let layer: HTMLElement | undefined;

function getOverlay(): HTMLElement {
  layer ??= mountOnPage(h("div", "overlay"));
  return layer;
}

/** Draws one box; boxes with no area are skipped. */
export function addBox(box: Box, kind: BoxKind): void {
  if (box.width <= 0 || box.height <= 0) return;
  placeOver(getOverlay().appendChild(h("div", kind)), box);
}

/** Where a distance label goes: a point, and a transform that places the label relative to it. */
export type LabelPlacement = { left: number; top: number; transform: string };

export function addLabel(text: string, { left, top, transform }: LabelPlacement): void {
  const label = getOverlay().appendChild(h("div", "measure-label", text));
  label.style.left = `${left}px`;
  label.style.top = `${top}px`;
  label.style.transform = transform;
}

export function clearBoxes(): void {
  layer?.replaceChildren();
}
