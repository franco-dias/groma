/** The HEX | RGB | HSL switch in the head of the Colors block: how colours are shown and copied, remembered per site. */
import { h } from "../../dom";
import { options } from "../../options";
import { toColorFormat } from "../../specs/color-format";
import { saveLayout } from "../layout";
import { mountSegments } from "./segments";

const FORMAT_LABELS = ["hex", "rgb", "hsl"];

function createSegment(format: string): HTMLElement {
  const segment = h("button", "segment", format.toUpperCase());
  segment.setAttribute("role", "radio");
  segment.dataset.value = format;
  return segment;
}

/** `body` is inside the panel, which is what the choice is saved with. */
export function createFormatSwitch(body: HTMLElement): HTMLElement {
  const group = h("div", "segmented color-format");
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Color format");
  group.append(...FORMAT_LABELS.map(createSegment));
  mountSegments(group, {
    current: () => options.colorFormat,
    choose: (value) => {
      options.colorFormat = toColorFormat(value);
      const panel = body.closest<HTMLElement>(".panel");
      if (panel) saveLayout(panel);
    },
  });
  return group;
}
