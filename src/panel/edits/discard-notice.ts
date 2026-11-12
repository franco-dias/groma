/**
 * What the bar under the tabs says after "Discard": how many saved edits it
 * removed, with a way back. It is there for three seconds, and ends sooner
 * when the user does anything else to the edits: makes one, undoes or redoes
 * (the bar's own Undo ends it too), or pins another element. After it, the
 * Edits tab's undo still brings the edits back.
 */
import { historyVersion } from "../../edits/history";

/** How long the notice stays: time to read it and reach its Undo. */
export const NOTICE_MS = 3000;

type Notice = { count: number; version: number };

let notice: Notice | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Call right after the discard, so the discard itself is not "something
 * else". `onEnd` runs when the notice's time is up, for the bar to go.
 */
export function noticeDiscard(count: number, onEnd: () => void): void {
  endDiscardNotice();
  notice = { count, version: historyVersion() };
  timer = setTimeout(() => {
    endDiscardNotice();
    onEnd();
  }, NOTICE_MS);
}

export function endDiscardNotice(): void {
  notice = undefined;
  clearTimeout(timer);
}

/** How many edits the last "Discard" removed, or 0 once the notice ended. */
export function discardedCount(): number {
  if (notice && notice.version !== historyVersion()) notice = undefined;
  return notice?.count ?? 0;
}
