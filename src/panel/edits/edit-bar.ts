/**
 * The bar of the Edits tab and the bar under the tabs: undo and redo, the
 * page without its edits, copying the edits, and applying or discarding the
 * saved edits this visit has not put on the page.
 */
import { removeEdit } from "../../edits/changes";
import type { ElementEdits } from "../../edits/edit-list";
import { CONTENT } from "../../edits/edit-values";
import { canRedo, canUndo, redo, together, undo } from "../../edits/history";
import { isOriginalShown, missingEdits, replayOverrides, showEdits, showOriginal } from "../../edits/replay";
import { copyOnClick } from "../copy";
import { part } from "../tab";
import { handoffText } from "./edit-handoff";

const action = (panel: HTMLElement, name: string): HTMLButtonElement =>
  part<HTMLButtonElement>(panel, `[data-action="${name}"]`);

function missingText(missing: number): string {
  return missing === 1 ? "1 saved edit is not on the page" : `${missing} saved edits are not on the page`;
}

/** Enables the buttons that have something to do, and shows the bar of saved edits that are not on the page. */
export function updateEditBar(panel: HTMLElement, edits: ElementEdits[]): void {
  action(panel, "undo").disabled = !canUndo();
  action(panel, "redo").disabled = !canRedo();
  action(panel, "copy-edits").disabled = !edits.length;
  const original = action(panel, "original");
  original.disabled = !edits.some((item) => item.values.length);
  original.setAttribute("aria-pressed", String(isOriginalShown()));

  // Not while the user chose to look at the page without the edits.
  const missing = isOriginalShown() ? 0 : missingEdits().length;
  part(panel, ".apply-bar").classList.toggle("is-off", !missing);
  // The text stays while the bar slides out.
  if (missing) part(panel, ".apply-text").textContent = missingText(missing);
}

const isTyping = (target: unknown): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea"));

/** Discards the edits the bar counts, and leaves those that are on the page. */
function discardMissing(): void {
  // They are removed like any edit: one step, which undo brings back.
  const missing = missingEdits();
  together(() => missing.forEach(({ selector, prop }) => removeEdit({ selector, prop: prop ?? CONTENT })));
}

function toggleOriginal(): void {
  if (isOriginalShown()) showEdits();
  else showOriginal();
}

function applyMissing(): void {
  showEdits();
  replayOverrides();
}

/** Wires the buttons; `onChange` runs after each, so the tab can draw again. */
export function mountEditBar(panel: HTMLElement, onChange: () => void): void {
  const onClick = (name: string, run: () => void): void => {
    action(panel, name).addEventListener("click", () => {
      run();
      onChange();
    });
  };
  onClick("undo", undo);
  onClick("redo", redo);
  onClick("original", toggleOriginal);
  onClick("apply-edits", applyMissing);
  onClick("discard-edits", discardMissing);
  copyOnClick(action(panel, "copy-edits"), handoffText);

  // ⌘/Ctrl + Z in the panel, outside a field: a field undoes its own typing.
  panel.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.code !== "KeyZ" || isTyping(event.target)) return;
    event.preventDefault();
    (event.shiftKey ? redo : undo)();
    onChange();
  });
}
