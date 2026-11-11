/**
 * The interaction states a selector is about (`:hover`, `:focus`…), and the
 * selector without them: the element a state rule is for is the one that
 * matches what is left. Plain text work, so a state inside `:is()`, `:where()`
 * or `:not()` is found as text and leaves that function empty, which no
 * element matches: such a rule is not listed.
 * shortcut: specificity is ignored and a state inside a function is not
 * understood; parse the selector if a page needs either.
 */

/** The states, in the order the Specs tab lists them. */
export const STATE_ORDER = [
  ":hover",
  ":focus",
  ":focus-visible",
  ":focus-within",
  ":active",
  ":disabled",
  ":checked",
];

const STATE = /^:(hover|focus-visible|focus-within|focus|active|disabled|checked)(?![\w-])/;

/** One state found in a selector, and where it sits. */
type Found = { name: string; start: number; end: number };

/** The index after the string or bracket that opens at `start`. */
function skipQuoted(selector: string, start: number): number {
  const closer = selector[start] === "[" ? "]" : selector[start];
  let end = start + 1;
  while (end < selector.length && selector[end] !== closer) end += selector[end] === "\\" ? 2 : 1;
  return end + 1;
}

/** What is at `index`: where to read on from, and the state that starts there, if one does. */
function stepAt(selector: string, index: number): { next: number; name?: string } {
  const character = selector[index];
  if (character === "[" || character === '"' || character === "'")
    return { next: skipQuoted(selector, index) };
  if (selector.startsWith("::", index)) return { next: index + 2 };
  const name = STATE.exec(selector.slice(index))?.[0];
  return name ? { next: index + name.length, name } : { next: index + 1 };
}

function findStates(selector: string): Found[] {
  const walk = (index: number, found: Found[]): Found[] => {
    if (index >= selector.length) return found;
    const { next, name } = stepAt(selector, index);
    return walk(next, name ? [...found, { name, start: index, end: next }] : found);
  };
  return walk(0, []);
}

/** The distinct states a selector names, in the order they are written. */
export const statesIn = (selector: string): string[] => [
  ...new Set(findStates(selector).map(({ name }) => name)),
];

/** The selector with every state taken out of it. */
export function withoutStates(selector: string): string {
  return findStates(selector).reduceRight(
    (text, { start, end }) => text.slice(0, start) + text.slice(end),
    selector,
  );
}
