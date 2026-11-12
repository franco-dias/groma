/**
 * The Motion block of the Specs tab: each transition and animation, with a
 * drawing of its easing curve. A click on a row copies it. A double-click on
 * a transition's duration or easing edits that entry (the whole list is one
 * edit) and lists the page's time or timing-function tokens; a double-click
 * on the "Transition" label edits the whole `transition` as text and lists
 * the transition tokens. Animations are only read. Under each transition, a
 * line says what starts it: the state that changes its property ("on hover",
 * from the same rules as the States block), or a change of its value.
 */
import { h } from "../../dom";
import { easingGlyph } from "../../icons";
import type { MotionItem } from "../../specs/motion";
import { motionItems } from "../../specs/motion";
import { describeTrigger, type StateChanges } from "../../specs/motion-triggers";
import { copyOnClick } from "../copy";
import { editable } from "./editable-field";
import { entryField } from "./motion-fields";
import { createMotionNotes } from "./motion-notes";
import { addBlock } from "./specs-block";
import { findStateRules } from "./state-rules";
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

/** A scratch style in the inspector's own document: setting a shorthand there lists its longhands. */
const scratch = document.createElement("div").style;

/** The longhands of `property` ("border-color" -> the four sides); a longhand or an unknown name stands for itself. */
function expand(property: string): string[] {
  scratch.cssText = "";
  scratch.setProperty(property, "initial");
  const longhands = Array.from(scratch);
  return longhands.length ? longhands : [property];
}

/** The longhands each state of the element sets. */
function stateChanges(element: Element): StateChanges {
  const byState = new Map<string, string[]>();
  findStateRules(element).forEach((styles, state) =>
    byState.set(
      state,
      styles.flatMap((style) => Array.from(style)),
    ),
  );
  return { byState, expand };
}

/** The row, and for a transition the line that says what starts it. */
function createMotionItem(
  item: MotionItem,
  { context, changes }: { context: SpecsContext; changes: StateChanges },
): HTMLElement[] {
  const row = createMotionRow(item, context);
  if (item.kind === "animation") return [row];
  return [row, h("div", "motion-trigger", describeTrigger(item.property, changes))];
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
  const changes = stateChanges(context.element);
  section.append(
    ...items.flatMap((item) => createMotionItem(item, { context, changes })),
    createMotionNotes(context),
  );
}
