/**
 * Puts one value of an edit on the page and in storage, or takes it off:
 * a CSS property, an element's content, or a note.
 *
 * Callers that make edits for the user go through `edit()` in changes.ts,
 * which also keeps the history for undo.
 */
import { pageDocument } from "../page";
import {
  allSavedContent,
  applyContent,
  forgetContent,
  getContent,
  restoreContent,
  saveContent,
} from "./content-overrides";
import { editsChanged } from "./changed";
import { allNotes, forgetBefore, forgetNote, rememberBefore, saveNote } from "./edit-records";
import { showEdits } from "./replay";
import { allSavedStyles, applyStyle, forgetStyle, restoreStyle, saveStyle } from "./style-overrides";

/** What an edit changes, beside CSS properties. Neither can be a property's name. */
export const CONTENT = "@content";
export const NOTE = "@note";

/** One value to put, or (when `value` is undefined) to take off, on the element a selector leads to. */
export type ValueChange = { selector: string; prop: string; value: string | undefined; element?: Element };

/** The element a saved selector leads to, or undefined when the page no longer has it. */
export function findEdited(selector: string): Element | undefined {
  try {
    return pageDocument().querySelector(selector) ?? undefined;
  } catch {
    // A selector saved by an older version that this browser rejects.
    return undefined;
  }
}

export const isStyleProp = (prop: string): boolean => prop !== NOTE && prop !== CONTENT;

/** The saved value of an edit, or undefined when there is none. */
export function currentValue(selector: string, prop: string): string | undefined {
  if (prop === NOTE) return allNotes()[selector];
  if (prop === CONTENT) return allSavedContent()[selector];
  return allSavedStyles()[selector]?.[prop];
}

/** Saves a value and applies it to the page, or (when `value` is undefined) removes the edit. */
export function applyValue(change: ValueChange): void {
  const { selector, prop, value } = change;
  if (prop === NOTE) writeNote(selector, value);
  else applyStyleOrContent(change);
  editsChanged();
}

function applyStyleOrContent(change: ValueChange): void {
  // An edit is made on the edited page, not on the original.
  showEdits();
  if (change.value === undefined) removeValue(change);
  else setValue({ ...change, value: change.value });
}

function writeNote(selector: string, note: string | undefined): void {
  if (note === undefined) forgetNote(selector);
  else saveNote(selector, note);
}

function removeValue({ selector, prop, element }: ValueChange): void {
  forgetSaved(selector, prop);
  if (element) restoreOnElement(element, prop);
  forgetBefore(selector, prop);
}

function forgetSaved(selector: string, prop: string): void {
  if (prop === CONTENT) forgetContent(selector);
  else forgetStyle(selector, prop);
}

function restoreOnElement(element: Element, prop: string): void {
  if (prop === CONTENT) restoreContent(element);
  else restoreStyle(element, prop);
}

function setValue({ selector, prop, element, value }: ValueChange & { value: string }): void {
  if (element && currentValue(selector, prop) === undefined) {
    rememberBefore({ selector, prop }, valueOnPage(element, prop));
  }
  if (prop === CONTENT) saveContent(selector, value);
  else saveStyle({ selector, prop }, value);
  if (element) applyOnElement(element, { prop, value });
}

function applyOnElement(element: Element, { prop, value }: { prop: string; value: string }): void {
  if (prop === CONTENT) applyContent(element, value);
  else applyStyle(element, { prop, value });
}

// shortcut: for a style this is the computed value (a width in pixels,
// not the "50%" the stylesheet says); read the declared value when
// agents need the source's own spelling.
// shortcut: it is the value at the moment of the first edit, so it
// includes earlier edits it depends on (a colour inherited from an edited
// parent); read it from the original page if that misleads readers.
function valueOnPage(element: Element, prop: string): string {
  return prop === CONTENT ? getContent(element) : getComputedStyle(element).getPropertyValue(prop).trim();
}
