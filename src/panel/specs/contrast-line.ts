/** The contrast line under the Text colour: the ratio against the background behind the text, and the WCAG level it meets. */
import { h } from "../../dom";
import { contrastOf, formatRatio, type Contrast, type Layer } from "../../specs/contrast";
import type { SpecsContext } from "./specs-context";

/** The background of the element and of each ancestor, nearest first. */
function backgroundLayers(element: Element): Layer[] {
  const layers: Layer[] = [];
  let node: Element | undefined = element;
  while (node) {
    const { backgroundColor, backgroundImage } = getComputedStyle(node);
    layers.push({ color: backgroundColor, hasImage: backgroundImage !== "none" });
    node = node.parentElement ?? undefined;
  }
  return layers;
}

function createResult(contrast: Contrast): HTMLElement[] {
  if (contrast.kind === "image") return [h("span", "hint", "over an image")];
  const badge = h("span", contrast.level === "Fails AA" ? "level is-warn" : "level is-ok", contrast.level);
  return [h("span", "value", formatRatio(contrast.ratio)), badge];
}

/** The line; none when the text colour or a background is written in a form we cannot read. */
export function createContrastLines({ element, computedStyle }: SpecsContext): HTMLElement[] {
  const contrast = contrastOf({
    text: computedStyle.color,
    layers: backgroundLayers(element),
    size: { fontSize: parseFloat(computedStyle.fontSize), fontWeight: Number(computedStyle.fontWeight) },
  });
  if (!contrast) return [];
  const line = h("div", "contrast-line");
  line.append(h("span", "label", "Contrast"), ...createResult(contrast));
  return [line];
}
