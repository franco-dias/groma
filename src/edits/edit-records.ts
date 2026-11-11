/**
 * What goes with the edits in storage: the value the page had before the
 * first edit of each property, and the notes on elements.
 */
import { pageAddress } from "../page";
import { readStore, writeStore } from "./storage";

type BySelector = Record<string, Record<string, string>>;

// Scoped by page, like the edits themselves (see style-overrides.ts).
const beforeKey = (): string => "__groma_before:" + pageAddress().pathname;
const notesKey = (): string => "__groma_notes:" + pageAddress().pathname;

/** Every note of this page, by selector. */
export const allNotes = (): Partial<Record<string, string>> => readStore<Record<string, string>>(notesKey());

/** Every remembered "before" of this page, by selector and property. */
export const allBefores = (): Partial<BySelector> => readStore<BySelector>(beforeKey());

/** The note on an element, or "". */
export const noteOn = (selector: string): string => allNotes()[selector] ?? "";

export function saveNote(selector: string, note: string): void {
  const all = allNotes();
  all[selector] = note;
  writeStore(notesKey(), all);
}

export function forgetNote(selector: string): void {
  const all = allNotes();
  delete all[selector];
  writeStore(notesKey(), all);
}

/** A property of the element a selector leads to. */
export type PropTarget = { selector: string; prop: string };

/** Remembers what the page had for `prop` before its first edit. */
export function rememberBefore({ selector, prop }: PropTarget, value: string): void {
  const all = allBefores();
  const props = (all[selector] ??= {});
  props[prop] = value;
  writeStore(beforeKey(), all);
}

export function forgetBefore(selector: string, prop: string): void {
  const all = allBefores();
  const props = (all[selector] ??= {});
  delete props[prop];
  if (!Object.keys(props).length) delete all[selector];
  writeStore(beforeKey(), all);
}
