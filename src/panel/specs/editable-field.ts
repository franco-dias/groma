/**
 * Makes a value of the Specs tab editable: a double-click turns it into a
 * field that holds the CSS value of one property.
 *   Enter or blur   apply       Escape   cancel
 *   ↑ / ↓           change a number by 1 (Shift: 10, Alt: 0.1), applied live
 * An empty field removes the edit. A bare number is taken as pixels where
 * the property wants a length, since that is how the tab shows lengths.
 *
 * The edit is made on the page like one from the All CSS tab, and is listed
 * in the Edits tab.
 */
import { pressFieldKey } from "./field-keys";
import { createSession, leaveField, startEditing } from "./field-session";
import type { EditableField, FieldSession } from "./field-types";

function mountEditing(session: FieldSession): void {
  const { node } = session;
  node.addEventListener("dblclick", () => startEditing(session));
  // While it is a field, a click places the caret: it does not copy.
  node.addEventListener(
    "click",
    (event) => {
      if (session.isEditing) event.stopImmediatePropagation();
    },
    true,
  );
  node.addEventListener("blur", () => leaveField(session));
  node.addEventListener("keydown", (event) => pressFieldKey(session, event));
}

export function editable<TNode extends HTMLElement>(node: TNode, field: EditableField): TNode {
  const session = createSession(node, field);
  node.classList.add("is-editable");
  node.classList.toggle("is-edited", field.prop in field.context.saved);
  node.title = "Click to copy · double-click to edit";
  node.dataset.edits = field.prop;
  mountEditing(session);
  return node;
}
