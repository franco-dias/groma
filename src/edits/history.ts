/**
 * Undo and redo for the user's edits.
 *
 * A step is one change of one value. Steps made together (one choice of the
 * user that sets several properties) are undone together, and a run of small
 * steps on one value (arrow keys) is one step.
 */
import { applyValue, findEdited } from "./edit-values";

type Step = {
  selector: string;
  prop: string;
  from: string | undefined;
  to: string | undefined;
  /** When a nudge made it, so the next nudge can join it; 0 for any other step. */
  nudgedAt: number;
  /** Steps made together share a number and are undone together; 0 for a step on its own. */
  group: number;
};

/** A change of one value, with what it was. */
export type Change = Pick<Step, "selector" | "prop" | "from" | "to">;

/** Nudges of one value this close together are one step: a run of arrow-key presses. */
const MERGE_MS = 1000;

// shortcut: the history lives in memory and ends with the page; save it if
// users ask to undo after a reload.
const done: Step[] = [];
const undone: Step[] = [];

let group = 0;
let groups = 0;

/**
 * Makes the edits of `make` one step to undo: one choice of the user that
 * sets several properties (a width that fills its parent).
 */
export function together(make: () => void): void {
  group = ++groups;
  try {
    make();
  } finally {
    group = 0;
  }
}

/** A nudge joins the last step of the same value when it follows closely. */
function joins(last: Step, change: Change & { nudgedAt: number }): boolean {
  if (last.selector !== change.selector || last.prop !== change.prop) return false;
  return change.nudgedAt > 0 && change.nudgedAt - last.nudgedAt < MERGE_MS;
}

/**
 * Remembers a change for undo. `nudgedAt` is when an arrow key made it, or 0
 * for any other edit.
 */
export function recordChange(change: Change, nudgedAt: number): void {
  undone.length = 0;
  const last = done.at(-1);
  if (!last || !joins(last, { ...change, nudgedAt })) {
    done.push({ ...change, nudgedAt, group });
    return;
  }
  last.to = change.to;
  last.nudgedAt = nudgedAt;
  if (last.from === last.to) done.pop();
}

export const canUndo = (): boolean => done.length > 0;
export const canRedo = (): boolean => undone.length > 0;

/** Moves the last step of `from` to `to`, with the steps made together with it. */
function move({ from, to }: { from: Step[]; to: Step[] }, valueOf: (step: Step) => string | undefined): void {
  let step = from.pop();
  while (step) {
    const { selector, prop } = step;
    applyValue({ selector, prop, value: valueOf(step), element: findEdited(selector) });
    // A step that is moved never takes in the next nudge.
    to.push({ ...step, nudgedAt: 0 });
    const isJoined = step.group !== 0 && from.at(-1)?.group === step.group;
    step = isJoined ? from.pop() : undefined;
  }
}

export const undo = (): void => move({ from: done, to: undone }, (step) => step.from);
export const redo = (): void => move({ from: undone, to: done }, (step) => step.to);
