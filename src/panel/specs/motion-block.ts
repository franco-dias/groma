/**
 * The Motion block of the Specs tab: each transition and animation, with a
 * drawing of its easing curve. A click on a row copies it. A double-click on
 * a transition's duration or easing edits that entry (the whole list is one
 * edit) and lists the page's time or timing-function tokens; a double-click
 * on the "Transition" label edits the whole `transition` as text and lists
 * the transition tokens. Animations are only read.
 */
import { h } from "../../dom";
import { easingGlyph } from "../../icons";
import type { MotionItem } from "../../specs/motion";
import { motionItems } from "../../specs/motion";
import { copyOnClick } from "../copy";
import { editable } from "./editable-field";
import { entryField } from "./motion-fields";
import { createMotionNotes } from "./motion-notes";
import { addBlock } from "./specs-block";
import type { SpecsContext } from "./specs-context";

function createMotionRow(item: MotionItem, context: SpecsContext): HTMLElement {
  const row = h("div", "motion-row");
  const duration = h("span", "duration", item.duration);
  const easing = h("span", "easing", item.easing);
  row.append(easingGlyph(item.curve), h("span", "property", item.property), duration, easing);
  row.title = "Click to copy";
  copyOnClick(row, `${item.property} ${item.duration} ${item.easing}`);
  if (item.kind === "animation") return row;
  editable(duration, entryField({ prop: "transition-duration", item }, context));
  editable(easing, entryField({ prop: "transition-timing-function", item }, context));
  return row;
}

/** The label that copies the whole `transition` and edits it as text. */
function createTransitionLabel(context: SpecsContext): HTMLElement {
  const value = context.computedStyle.getPropertyValue("transition");
  const label = copyOnClick(h("span", "note transition-label", "Transition"), value);
  return editable(label, { context, prop: "transition", value });
}

export function renderMotion(context: SpecsContext): void {
  const items = motionItems(context.computedStyle);
  if (!items.length) return;
  const hasTransition = items.some(({ kind }) => kind === "transition");
  const action = hasTransition ? createTransitionLabel(context) : undefined;
  const section = addBlock(context, { title: "Motion", action });
  section.append(...items.map((item) => createMotionRow(item, context)), createMotionNotes(context));
}
