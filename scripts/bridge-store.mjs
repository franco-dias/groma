/**
 * What the bridge remembers: the latest edits text each page reported, in
 * memory only. Nothing is written to disk; a restart forgets it, and the
 * page sends its text again when it next changes or the window gets focus.
 */

const MAX_PAGES = 50;
const MAX_ADDRESS_LENGTH = 2000;
const MAX_TITLE_LENGTH = 300;

const parseJson = (body) => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

/**
 * @param {string} body  What a page posted.
 * @returns {{ page: string, title: string, text: string } | undefined}
 *   The report, or undefined when the body is not one.
 */
export function parseReport(body) {
  const { page, title, text } = parseJson(body) ?? {};
  const isValid = typeof page === "string" && page && page.length <= MAX_ADDRESS_LENGTH;
  if (!isValid || typeof text !== "string") return undefined;
  return { page, title: typeof title === "string" ? title.slice(0, MAX_TITLE_LENGTH) : "", text };
}

/** @param {() => number} [now] */
export function createStore(now = Date.now) {
  /** @type {Map<string, { page: string, title: string, text: string, receivedAt: string }>} */
  const reports = new Map();
  return {
    /** Keeps the report; the same text again is not "new", so its time stays. */
    save({ page, title, text }) {
      const known = reports.get(page);
      const receivedAt = known?.text === text ? known.receivedAt : new Date(now()).toISOString();
      reports.delete(page);
      reports.set(page, { page, title, text, receivedAt });
      if (reports.size > MAX_PAGES) reports.delete(reports.keys().next().value);
    },
    /** The pages heard from, the one that changed last first. */
    // oxlint-disable-next-line unicorn/no-array-reverse -- the copy is ours, and Node 18 (engines) has no toReversed
    pages: () => [...reports.values()].reverse(),
  };
}
