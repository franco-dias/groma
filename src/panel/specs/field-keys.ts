/**
 * The keys of an open field of the Specs tab.
 *   Enter or blur   apply       Escape   cancel
 *   ↑ / ↓           change a number by 1 (Shift: 10, Alt: 0.1), applied live
 */
import { rerender } from "../../selection";
import { nudgeValue, stepFor } from "../../specs/units";
import { commitNudge } from "./field-commit";
import { stopEditing } from "./field-session";
import type { FieldSession } from "./field-types";

function pressEscape(session: FieldSession, event: KeyboardEvent): void {
  // Not the page's Escape, and not the end of a comparison.
  event.stopPropagation();
  stopEditing(session);
  session.node.textContent = session.text;
  // Arrow keys may have changed the page already: show what is there now.
  rerender();
}

function pressArrow(session: FieldSession, event: KeyboardEvent): void {
  const { node } = session;
  const direction = event.key === "ArrowUp" ? 1 : -1;
  const next = nudgeValue(node.textContent ?? "", { direction, step: stepFor(event) });
  if (next === undefined) return;
  event.preventDefault();
  if (commitNudge(session, next)) node.textContent = next;
}

export function pressFieldKey(session: FieldSession, event: KeyboardEvent): void {
  if (!session.isEditing) return;
  if (event.key === "Enter") {
    event.preventDefault();
    session.node.blur();
  }
  if (event.key === "Escape") pressEscape(session, event);
  if (event.key === "ArrowUp" || event.key === "ArrowDown") pressArrow(session, event);
}
