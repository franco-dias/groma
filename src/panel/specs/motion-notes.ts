/** Under the Motion block's rows: the token the element declares its duration, easing or transition with. */
import { h } from "../../dom";
import { createTokenNotes, type TokenSource } from "./token-notes";
import type { SpecsContext } from "./specs-context";

/** A label and the property whose declaration may name a token. */
const NOTES: [label: string, prop: string][] = [
  ["Duration", "transition-duration"],
  ["Easing", "transition-timing-function"],
  ["Transition", "transition"],
];

export function createMotionNotes(context: SpecsContext): HTMLElement {
  const sources = NOTES.map(([label, prop]): TokenSource => [
    label,
    { name: prop, value: "", props: [prop] },
  ]);
  const notes = h("div", "motion-notes");
  notes.append(...createTokenNotes(context, sources));
  return notes;
}
