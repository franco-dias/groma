/**
 * The Asset block of the Specs tab, at the top, only for what shows a file:
 * an `<img>` (its preview, natural size beside the size shown, name, "Copy
 * address" and "Download"), an inline `<svg>` (its viewBox and size, "Copy
 * SVG") and an element with a `url(...)` background (the name and "Copy
 * address"). Nothing is fetched: the preview is drawn from the pixels the
 * page already has.
 */
import { layoutSize } from "../../dom";
import { fileNameOf, urlsIn } from "../../specs/assets";
import { createImageRow } from "./asset-image";
import { createAssetRow, createCopyButton } from "./asset-rows";
import { addBlock } from "./specs-block";
import type { SpecsContext } from "./specs-context";

function createSvgRow(svg: Element): HTMLElement {
  const { width, height } = layoutSize(svg, svg.getBoundingClientRect());
  const viewBox = svg.getAttribute("viewBox");
  return createAssetRow({
    name: "inline svg",
    size: `${viewBox ? `viewBox ${viewBox}` : "no viewBox"} · ${width} × ${height}`,
    actions: [createCopyButton({ action: "copy-svg", label: "Copy SVG", text: () => svg.outerHTML })],
  });
}

function createBackgroundRow(url: string): HTMLElement {
  const copy = createCopyButton({ action: "copy-address", label: "Copy address", text: () => url });
  return createAssetRow({ name: fileNameOf(url), actions: [copy] });
}

function createRows({ element, computedStyle }: SpecsContext): HTMLElement[] {
  // Cast: the tag says it is an image, and `instanceof` is false for the elements of a frame.
  const image = element.localName === "img" ? [createImageRow(element as HTMLImageElement)] : [];
  const svg = element.localName === "svg" ? [createSvgRow(element)] : [];
  return [...image, ...svg, ...urlsIn(computedStyle.backgroundImage).map(createBackgroundRow)];
}

export function renderAsset(context: SpecsContext): void {
  const rows = createRows(context);
  if (!rows.length) return;
  addBlock(context, { title: "Asset", className: "asset" }).append(...rows);
}
