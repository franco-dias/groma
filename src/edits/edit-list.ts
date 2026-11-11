/** The user's edits as one list, element by element: style values, content and notes. */
import { allSavedContent } from "./content-overrides";
import { allBefores, allNotes } from "./edit-records";
import { CONTENT } from "./edit-values";
import { allSavedStyles } from "./style-overrides";

export type ValueEdit = {
  /** A CSS property, or `CONTENT`. */
  prop: string;
  /** What the page had. Undefined for an edit saved before Groma recorded it. */
  before: string | undefined;
  after: string;
};

export type ElementEdits = { selector: string; values: ValueEdit[]; note: string };

/** Every edited element of this page, in the order the edits were first saved. */
export function listEdits(): ElementEdits[] {
  const styles = allSavedStyles();
  const content = allSavedContent();
  const notes = allNotes();
  const befores = allBefores();
  const selectors = new Set([...Object.keys(styles), ...Object.keys(content), ...Object.keys(notes)]);
  return [...selectors].map((selector) => {
    const values = Object.entries(styles[selector] ?? {});
    if (content[selector] !== undefined) values.push([CONTENT, content[selector]]);
    return {
      selector,
      values: values.map(([prop, after]) => ({ prop, before: befores[selector]?.[prop], after })),
      // Storage is anyone's to write: a note that is not text must not break the list.
      note: String(notes[selector] ?? ""),
    };
  });
}
