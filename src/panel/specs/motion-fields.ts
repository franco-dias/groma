/** What a duration or an easing of one transition edits: its entry in the property's list, written as the whole list. */
import { declaredValue } from "../../page-styles";
import { splitTopLevel } from "../../specs/declarations";
import { replaceEntry } from "../../specs/motion-entries";
import type { MotionItem } from "../../specs/motion";
import type { EditableField } from "./field-types";
import type { SpecsContext } from "./specs-context";

/** Which part of a transition a field edits, and the property that holds its list. */
export type TransitionPart = { prop: "transition-duration" | "transition-timing-function"; item: MotionItem };

/** The list as the page declares it (so `var()` in other entries survives), else as the browser computed it. */
function listOf(context: SpecsContext, prop: string): string[] {
  const declared = declaredValue(context.stylesOf(context.element), prop);
  return splitTopLevel(declared || context.computedStyle.getPropertyValue(prop), ",");
}

export function entryField(part: TransitionPart, context: SpecsContext): EditableField {
  const { prop, item } = part;
  const count = splitTopLevel(context.computedStyle.transitionProperty, ",").length;
  const value = prop === "transition-duration" ? item.duration : item.easing;
  return {
    context,
    prop,
    value,
    whole: (typed) => replaceEntry(listOf(context, prop), { index: item.index, value: typed, count }),
  };
}
