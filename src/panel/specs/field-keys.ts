/**
 * The keys of an open field of the Specs tab.
 *   Enter or blur   apply       Escape   cancel
 *   ↑ / ↓           change a number by 1 (Shift: 10, Alt: 0.1), applied live
 */
import { rerender } from "../../selection";
import { nudgeValue, stepFor, stepKindOf } from "../../specs/steps";
import { commitNudge } from "./field-commit";
import { pickToken, stopEditing } from "./field-session";
import type { FieldSession } from "./field-types";

function pressEnter(session: FieldSession, event: KeyboardEvent): void {
  event.preventDefault();
  const chosen = session.tokens?.chosen;
  if (chosen) {
    pickToken(session, chosen);
    return;
  }
  session.node.blur();
}

function pressEscape(session: FieldSession, event: KeyboardEvent): void {
  // Not the page's Escape, and not the end of a comparison.
  event.stopPropagation();
  if (session.tokens?.chosen) {
    // The first Esc closes the list the keys are in; the next cancels the field.
    session.tokens.close();
    return;
  }
  stopEditing(session);
  session.node.textContent = session.text;
  // Arrow keys may have changed the page already: show what is there now.
  rerender();
}

function nudgeField(session: FieldSession, next: string): void {
  if (commitNudge(session, next)) session.node.textContent = next;
}

function pressArrow(session: FieldSession, event: KeyboardEvent): void {
  const { node, tokens } = session;
  const direction = event.key === "ArrowUp" ? 1 : -1;
  const text = node.textContent ?? "";
  const kind = stepKindOf(session.field.prop, text);
  const next = nudgeValue(text, { direction, step: stepFor(event, kind), kind });
  if (next !== undefined) {
    event.preventDefault();
    nudgeField(session, next);
    return;
  }
  // Not a number to nudge: the arrows walk the list of tokens, when there is one.
  if (!tokens?.isOpen) return;
  event.preventDefault();
  tokens.move(event.key === "ArrowDown" ? 1 : -1);
}

export function pressFieldKey(session: FieldSession, event: KeyboardEvent): void {
  if (!session.isEditing) return;
  if (event.key === "Enter") pressEnter(session, event);
  if (event.key === "Escape") pressEscape(session, event);
  if (event.key === "ArrowUp" || event.key === "ArrowDown") pressArrow(session, event);
}
