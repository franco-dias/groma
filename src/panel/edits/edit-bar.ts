/**
 * The bar of the Edits tab: undo and redo, the page without its edits, and
 * copying the edits. (The bar under the tabs, for saved edits this visit has
 * not put on the page, is apply-bar.ts.)
 */
import type { ElementEdits } from "../../edits/edit-list";
import { canRedo, canUndo, redo, undo } from "../../edits/history";
import { isOriginalShown, showEdits, showOriginal } from "../../edits/replay";
import { copyOnClick } from "../copy";
import { part } from "../tab";
import { mountApplyBar, updateApplyBar } from "./apply-bar";
import { handoffText } from "./edit-handoff";

const action = (panel: HTMLElement, name: string): HTMLButtonElement =>
  part<HTMLButtonElement>(panel, `[data-action="${name}"]`);

/** Enables the buttons that have something to do, and the bar under the tabs. */
export function updateEditBar(panel: HTMLElement, edits: ElementEdits[]): void {
  action(panel, "undo").disabled = !canUndo();
  action(panel, "redo").disabled = !canRedo();
  action(panel, "copy-edits").disabled = !edits.length;
  const original = action(panel, "original");
  original.disabled = !edits.some((item) => item.values.length);
  original.setAttribute("aria-pressed", String(isOriginalShown()));
  updateApplyBar(panel);
}

const isTyping = (target: unknown): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea"));

function toggleOriginal(): void {
  if (isOriginalShown()) showEdits();
  else showOriginal();
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
  mountApplyBar(panel, onChange);
  copyOnClick(action(panel, "copy-edits"), handoffText);

  // ⌘/Ctrl + Z in the panel, outside a field: a field undoes its own typing.
  panel.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.code !== "KeyZ" || isTyping(event.target)) return;
    event.preventDefault();
    (event.shiftKey ? redo : undo)();
    onChange();
  });
}
