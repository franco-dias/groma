/**
 * A page that draws itself after the frame has loaded it (a design export
 * that unpacks, an app that renders): the elements the user edited and
 * pinned are not there yet when the canvas opens. This watches the page, so
 * the edits and the pin are put on it when their elements arrive.
 */
const PATIENCE_MS = 10_000;

/** `count` says how much of what is awaited the page has; `onMore` runs each time it has more. */
type Wait = { page: Document; count: () => number; onMore: () => void };

let stop = (): void => {};

/** Ends the wait for the page the frame showed before. */
export const stopWaiting = (): void => stop();

/**
 * Watches `page` for what it still has to draw.
 *
 * shortcut: gives up after ten seconds; upgrade when a page that takes
 * longer to draw loses its edits or its pin on the canvas.
 */
export function waitForMore({ page, count, onMore }: Wait): void {
  stop();
  let seen = count();
  const watcher = new MutationObserver(() => {
    const now = count();
    if (now > seen) onMore();
    seen = now;
  });
  const timer = setTimeout(() => stop(), PATIENCE_MS);
  stop = () => {
    watcher.disconnect();
    clearTimeout(timer);
    stop = () => {};
  };
  watcher.observe(page, { childList: true, subtree: true });
}
