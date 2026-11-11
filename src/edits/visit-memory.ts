/**
 * What this visit to the page has put on it, so the panel can tell the edits
 * saved on an earlier visit (missing from the page) from the ones in sight.
 */

/**
 * The saved edits that were made, or put back, during this visit to the
 * page. The others were saved on an earlier visit and are not on the page.
 */
const seen = new Set<string>();

/** A saved edit: `prop` is undefined for an element's content. */
export type SeenEdit = { selector: string; prop: string | undefined; value: string };

const seenKey = ({ selector, prop, value }: SeenEdit): string => JSON.stringify([selector, prop, value]);

export function rememberSeen(edit: SeenEdit): void {
  seen.add(seenKey(edit));
}

export const wasSeen = (edit: SeenEdit): boolean => seen.has(seenKey(edit));

/** True once an edit was put on the page in this visit, by an edit or by "Apply". */
let editsOn = false;

export function markEditsOn(): void {
  editsOn = true;
}

export const areEditsOn = (): boolean => editsOn;
