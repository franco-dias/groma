/**
 * The user's edits to the page, as one list: style values, content and notes.
 *
 * Every edit goes through `edit()`, which applies it, saves it and remembers
 * it for undo. The value the page had before the first edit of a property is
 * saved too, so the Edits tab can show before → after and hand both to
 * whoever applies the change in the source.
 *
 * A note is a plain-text instruction attached to an element. It changes
 * nothing on the page.
 */
import { pageAddress, pageDocument } from "../page";
import {
  allSavedContent,
  allSavedStyles,
  applyContent,
  applyStyle,
  getContent,
  restoreContent,
  isValidStyle,
  restoreStyle,
  saveContent,
  saveStyle,
  showOriginal,
} from "./overrides";
import { readStore, writeStore } from "./storage";

/** What an edit changes, beside CSS properties. Neither can be a property's name. */
export const CONTENT = "@content";
export const NOTE = "@note";

type BySelector = Record<string, Record<string, string>>;

// Scoped by page, like the edits themselves (see overrides.ts).
const beforeKey = (): string => "__groma_before:" + pageAddress().pathname;
const notesKey = (): string => "__groma_notes:" + pageAddress().pathname;

const notes = (): Partial<Record<string, string>> => readStore<Record<string, string>>(notesKey());
const befores = (): Partial<BySelector> => readStore<BySelector>(beforeKey());

/** Remembers what the page had for `prop` before its first edit; `null` forgets it. */
function saveBefore(selector: string, prop: string, value: string | null): void {
  const all = befores();
  const props = (all[selector] ??= {});
  if (value === null) delete props[prop];
  else props[prop] = value;
  if (!Object.keys(props).length) delete all[selector];
  writeStore(beforeKey(), all);
}

/** The element a saved selector leads to, or null when the page no longer has it. */
export function findEdited(selector: string): Element | null {
  try {
    return pageDocument().querySelector(selector);
  } catch {
    // A selector saved by an older version that this browser rejects.
    return null;
  }
}

/** The saved value of an edit, or null when there is none. */
function current(selector: string, prop: string): string | null {
  if (prop === NOTE) return notes()[selector] ?? null;
  if (prop === CONTENT) return allSavedContent()[selector] ?? null;
  return allSavedStyles()[selector]?.[prop] ?? null;
}

/** Saves a value and applies it to the page; `null` removes the edit. */
function write(selector: string, prop: string, value: string | null, el: Element | null): void {
  if (prop === NOTE) {
    const all = notes();
    if (value === null) delete all[selector];
    else all[selector] = value;
    writeStore(notesKey(), all);
    return;
  }
  // An edit is made on the edited page, not on the original.
  showOriginal(false);
  const isContent = prop === CONTENT;
  if (value === null) {
    if (isContent) saveContent(selector, null);
    else saveStyle(selector, prop, null);
    if (el) (isContent ? restoreContent(el) : restoreStyle(el, prop));
    saveBefore(selector, prop, null);
    return;
  }
  if (el && current(selector, prop) === null) {
    // shortcut: for a style this is the computed value (a width in pixels,
    // not the "50%" the stylesheet says); read the declared value when
    // agents need the source's own spelling.
    // shortcut: it is the value at the moment of the first edit, so it
    // includes earlier edits it depends on (a colour inherited from an edited
    // parent); read it from the original page if that misleads readers.
    saveBefore(selector, prop, isContent ? getContent(el) : getComputedStyle(el).getPropertyValue(prop).trim());
  }
  if (isContent) saveContent(selector, value);
  else saveStyle(selector, prop, value);
  if (el) (isContent ? applyContent(el, value) : applyStyle(el, prop, value));
}

// ── history ────────────────────────────────────────────────────

interface Step {
  selector: string;
  prop: string;
  from: string | null;
  to: string | null;
  /** When a nudge made it, so the next nudge can join it; 0 for any other step. */
  nudgedAt: number;
}

/** Nudges of one value this close together are one step: a run of arrow-key presses. */
const MERGE_MS = 1000;

// shortcut: the history lives in memory and ends with the page; save it if
// users ask to undo after a reload.
const done: Step[] = [];
const undone: Step[] = [];

/**
 * Makes an edit: a CSS property, `CONTENT` or `NOTE` of the element `selector`
 * leads to. `null` removes the edit and puts back what the page had. A `nudge`
 * is one small step of many (an arrow key): a run of them undoes at once.
 * Returns false, and changes nothing, for a style value the browser rejects.
 */
export function edit(
  selector: string,
  prop: string,
  value: string | null,
  el: Element | null = findEdited(selector),
  nudge = false,
): boolean {
  const isStyle = prop !== NOTE && prop !== CONTENT;
  if (isStyle && value !== null && !isValidStyle(prop, value)) return false;
  const from = current(selector, prop);
  if (from === value) return true;
  write(selector, prop, value, el);
  undone.length = 0;
  const last = done.at(-1);
  const nudgedAt = nudge ? Date.now() : 0;
  const joins = nudge && last?.selector === selector && last.prop === prop && nudgedAt - last.nudgedAt < MERGE_MS;
  if (last && joins) {
    last.to = value;
    last.nudgedAt = nudgedAt;
    if (last.from === last.to) done.pop();
  } else {
    done.push({ selector, prop, from, to: value, nudgedAt });
  }
  return true;
}

export const canUndo = (): boolean => done.length > 0;
export const canRedo = (): boolean => undone.length > 0;

export function undo(): void {
  const step = done.pop();
  if (!step) return;
  write(step.selector, step.prop, step.from, findEdited(step.selector));
  undone.push(step);
}

export function redo(): void {
  const step = undone.pop();
  if (!step) return;
  write(step.selector, step.prop, step.to, findEdited(step.selector));
  // A step that is redone never takes in the next nudge.
  done.push({ ...step, nudgedAt: 0 });
}

// ── the list ───────────────────────────────────────────────────

export interface ValueEdit {
  /** A CSS property, or `CONTENT`. */
  prop: string;
  /** What the page had. Null for an edit saved before Groma recorded it. */
  before: string | null;
  after: string;
}

export interface ElementEdits {
  selector: string;
  values: ValueEdit[];
  note: string;
}

/** Every edited element of this page, in the order the edits were first saved. */
export function listEdits(): ElementEdits[] {
  const styles = allSavedStyles();
  const content = allSavedContent();
  const allNotes = notes();
  const before = befores();
  const selectors = new Set([...Object.keys(styles), ...Object.keys(content), ...Object.keys(allNotes)]);
  return [...selectors].map((selector) => {
    const values = Object.entries(styles[selector] ?? {});
    if (content[selector] !== undefined) values.push([CONTENT, content[selector]]);
    return {
      selector,
      values: values.map(([prop, after]) => ({ prop, before: before[selector]?.[prop] ?? null, after })),
      // Storage is anyone's to write: a note that is not text must not break the list.
      note: String(allNotes[selector] ?? ""),
    };
  });
}

/** The note on an element, or "". */
export const noteOn = (selector: string): string => notes()[selector] ?? "";
