/**
 * What the bar under the tabs says after "Discard": how many saved edits it
 * removed, with a way back. It lasts until the user does anything else to the
 * edits: makes one, undoes or redoes (the bar's own Undo ends it too), or
 * pins another element.
 */
import { historyVersion } from "../../edits/history";

type Notice = { count: number; version: number };

let notice: Notice | undefined;

/** Call right after the discard, so the discard itself is not "something else". */
export function noticeDiscard(count: number): void {
  notice = { count, version: historyVersion() };
}

export function endDiscardNotice(): void {
  notice = undefined;
}

/** How many edits the last "Discard" removed, or 0 once the notice ended. */
export function discardedCount(): number {
  if (notice && notice.version !== historyVersion()) notice = undefined;
  return notice?.count ?? 0;
}
