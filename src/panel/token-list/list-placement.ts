/** Where the token list opens: under its field, above it, or on the roomier side, cut to fit. */

/** Space between the field and the list. */
const GAP_PX = 4;

/**
 * Under the field; above it when the tab ends before the list does; and
 * when neither side has room, on the roomier side, cut to fit and scrolling.
 */
/** The field the list belongs to, and the scroll area that holds the list. */
export type ListAnchor = { field: HTMLElement; host: HTMLElement };

export function placeList(list: HTMLElement, { field, host }: ListAnchor): void {
  const at = field.getBoundingClientRect();
  const tab = host.getBoundingClientRect();
  list.style.maxHeight = "";
  const height = list.offsetHeight;
  const below = tab.bottom - at.bottom - GAP_PX;
  const above = at.top - tab.top - GAP_PX;
  const isUnderneath = height <= below || (height > above && below >= above);
  const room = isUnderneath ? below : above;
  list.style.maxHeight = height > room ? `${Math.max(room, 0)}px` : "";
  const shownHeight = Math.min(height, room);
  const edge = isUnderneath ? at.bottom + GAP_PX : at.top - shownHeight - GAP_PX;
  list.style.top = `${edge - tab.top + host.scrollTop}px`;
}
