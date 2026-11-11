/**
 * The States block of the Specs tab: what each interaction state of the
 * element (`:hover`, `:focus`, `:active`…) changes, read from the page's
 * stylesheets without triggering the state. One group per state, one row per
 * declaration; a click on a row copies `property: value`. Read only. The
 * block is there only when something is found.
 */
import { h } from "../../dom";
import { isColor } from "../../specs/colors";
import { STATE_ORDER } from "../../specs/states";
import { copyOnClick } from "../copy";
import { mergeDeclarations } from "./copy-css";
import { findStateRules } from "./state-rules";
import { type StateChange, stateChanges } from "./state-changes";
import { addBlock, createSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

function createChangeRow({ property, value, resolved }: StateChange): HTMLElement {
  const line = copyOnClick(h("div", "effect-line"), `${property}: ${value}`);
  if (isColor(resolved)) line.appendChild(createSwatch(resolved));
  line.append(h("span", "name", property), h("span", "value", value));
  return line;
}

function createStateGroup(state: string, rows: HTMLElement[]): HTMLElement[] {
  if (!rows.length) return [];
  const group = h("div", "effect-group");
  group.append(h("span", "effect-label", state), ...rows);
  return [group];
}

export function renderStates(context: SpecsContext): void {
  const rules = findStateRules(context.element);
  const groups = STATE_ORDER.flatMap((state) => {
    const changes = stateChanges(mergeDeclarations(rules.get(state) ?? []), context.computedStyle);
    return createStateGroup(state, changes.map(createChangeRow));
  });
  if (!groups.length) return;
  addBlock(context, { title: "States", className: "states" }).append(...groups);
}
