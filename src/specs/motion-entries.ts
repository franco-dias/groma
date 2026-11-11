/** One entry of a transition's parallel lists changed, for an edit that writes the whole list. */
/** The entry at `index` after the change, and how many transitions the lists are for. */
export type EntryChange = { index: number; value: string; count: number };

/**
 * `list` with entry `index` set to `value`, written as the whole property.
 * CSS repeats a list that is shorter than the properties, so the list is
 * first repeated out to `count` entries: the other entries keep their value.
 */
export function replaceEntry(list: string[], { index, value, count }: EntryChange): string {
  const length = Math.max(count, index + 1);
  const entries = Array.from({ length }, (_, position) => list[position % Math.max(list.length, 1)] ?? value);
  return entries.with(index, value).join(", ");
}
