/** The Motion block of the Specs tab: each transition and animation, with a drawing of its easing curve. */
import { h } from "../../dom";
import { easingGlyph } from "../../icons";
import { motionItems } from "../../specs/motion";
import { copyOnClick } from "../copy";
import { addBlock } from "./specs-block";
import type { SpecsContext } from "./specs-context";

export function renderMotion(context: SpecsContext): void {
  const items = motionItems(context.computedStyle);
  if (!items.length) return;
  const section = addBlock(context, { title: "Motion" });
  items.forEach((item) => {
    const row = section.appendChild(h("div", "motion-row"));
    row.append(
      easingGlyph(item.curve),
      h("span", "property", item.property),
      h("span", "duration", item.duration),
      h("span", "easing", item.easing),
    );
    row.title = "Click to copy";
    copyOnClick(row, `${item.property} ${item.duration} ${item.easing}`);
  });
}
