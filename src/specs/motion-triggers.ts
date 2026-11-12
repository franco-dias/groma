/**
 * What starts a transition, in words for the Motion block: the interaction
 * states whose rules change the transitioned property ("on hover"), or, when
 * no state does, any change of its value (a class the app toggles, a script).
 * Plain text work: the caller gives the properties each state sets, as
 * longhands, and how to expand a shorthand.
 */
import { STATE_ORDER } from "./states";

/** Each state as the end of "Animates …". */
const STATE_WORDS: Record<string, string> = {
  ":hover": "on hover",
  ":focus": "on focus",
  ":focus-visible": "on keyboard focus",
  ":focus-within": "when something inside has focus",
  ":active": "while pressed",
  ":disabled": "when disabled",
  ":checked": "when checked",
};

/** The longhands each state sets, and how to turn a property into its longhands. */
export type StateChanges = { byState: Map<string, string[]>; expand: (property: string) => string[] };

/** True when a state that sets `changed` moves the transitioned `property`. */
function moves(
  property: string,
  { changed, expand }: { changed: string[]; expand: StateChanges["expand"] },
): boolean {
  if (property === "all") return changed.length > 0;
  const longhands = new Set(expand(property));
  return changed.some((name) => longhands.has(name));
}

export function describeTrigger(property: string, { byState, expand }: StateChanges): string {
  const states = STATE_ORDER.filter((state) =>
    moves(property, { changed: byState.get(state) ?? [], expand }),
  );
  if (!states.length) return "Animates when its value changes";
  return `Animates ${states.map((state) => STATE_WORDS[state]).join(" or ")}`;
}
