/**
 * The bar under the tabs, on every tab: the saved edits this visit has not put
 * on the page, with "Discard" and "Apply"; and, after "Discard", how many it
 * removed, with "Undo". It slides open and shut by the height of its row.
 */
import { removeEdit } from "../../edits/changes";
import { CONTENT } from "../../edits/edit-values";
import { together, undo } from "../../edits/history";
import { isOriginalShown, missingEdits, replayOverrides, showEdits } from "../../edits/replay";
import { part } from "../tab";
import { discardedCount, endDiscardNotice, noticeDiscard } from "./discard-notice";

function missingText(count: number): string {
  return count === 1 ? "1 saved edit is not on the page" : `${count} saved edits are not on the page`;
}

const discardedText = (count: number): string => `${count} ${count === 1 ? "edit" : "edits"} discarded`;

/** Shows the bar for what the user can do now: apply or discard saved edits, take a discard back, or nothing. */
export function updateApplyBar(panel: HTMLElement): void {
  const bar = part(panel, ".apply-bar");
  // Not while the user chose to look at the page without the edits.
  const isOriginal = isOriginalShown();
  const discarded = isOriginal ? 0 : discardedCount();
  const missing = isOriginal ? 0 : missingEdits().length;
  bar.classList.toggle("is-off", !missing && !discarded);
  // The text and the buttons stay as they were while the bar slides out.
  if (discarded) showText(panel, { text: discardedText(discarded), isDiscarded: true });
  if (!discarded && missing) showText(panel, { text: missingText(missing), isDiscarded: false });
}

function showText(panel: HTMLElement, { text, isDiscarded }: { text: string; isDiscarded: boolean }): void {
  part(panel, ".apply-bar").classList.toggle("is-discarded", isDiscarded);
  part(panel, ".apply-text").textContent = text;
}

/** Discards the edits the bar counts, and leaves those that are on the page. `redraw` shows the bar anew when the notice ends. */
function discardMissing(redraw: () => void): void {
  // They are removed like any edit: one step, which undo brings back.
  const missing = missingEdits();
  together(() => missing.forEach(({ selector, prop }) => removeEdit({ selector, prop: prop ?? CONTENT })));
  noticeDiscard(missing.length, redraw);
}

function applyMissing(): void {
  showEdits();
  replayOverrides();
}

function takeDiscardBack(): void {
  undo();
  endDiscardNotice();
}

/** Wires the bar's buttons; `onChange` runs after each, so the tab can draw again. */
export function mountApplyBar(panel: HTMLElement, onChange: () => void): void {
  const onClick = (name: string, run: () => void): void => {
    part(panel, `[data-action="${name}"]`).addEventListener("click", () => {
      run();
      onChange();
    });
  };
  onClick("apply-edits", applyMissing);
  onClick("discard-edits", () => discardMissing(onChange));
  onClick("undo-discard", takeDiscardBack);
}
