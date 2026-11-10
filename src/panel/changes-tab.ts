/**
 * The Changes tab: this Claude Design export against an older one.
 *
 * Pick the older export file; the tab lists the boards that changed, were
 * added or were removed. Click a changed board to go to it and see its
 * changed lines. The tab is hidden on pages that are not exports.
 */
import { h } from "../dom";
import { currentExport, diffExports, type ExportData, parseExport } from "../export-diff";
import { part, type Tab, tabBody } from "./tab";

const MAX_LINES = 30;
const MAX_LINE_LENGTH = 160;

let body: HTMLElement;
let fileInput: HTMLInputElement;

function renderChanges(older: ExportData | null, problem = ""): void {
  const note = (text: string) => body.appendChild(h("div", "hint-line", text));
  const group = (title: string, count: number) => {
    if (count) body.appendChild(h("div", "label", `${title} (${count})`));
  };

  body.replaceChildren();
  const choose = body.appendChild(h("button", "action", "Compare with an older export…"));
  choose.addEventListener("click", () => fileInput.click());
  if (problem) note(problem);

  const current = currentExport();
  if (!older || !current) return;
  const diff = diffExports(older, current);
  note(`${older.exported} → ${current.exported}`);

  group("Changed", diff.changed.length);
  for (const board of diff.changed) {
    const summary = `${board.title}  +${board.added.length} −${board.removed.length}`;
    const row = body.appendChild(h("div", "nav-row", summary));
    const lines = body.appendChild(h("div", "diff"));
    lines.hidden = true;
    const addLines = (list: string[], className: string, sign: string) =>
      list.slice(0, MAX_LINES).forEach((line) => {
        lines.appendChild(h("div", className, `${sign} ${line.slice(0, MAX_LINE_LENGTH)}`));
      });
    addLines(board.added, "is-added", "+");
    addLines(board.removed, "is-removed", "−");
    row.addEventListener("click", () => {
      lines.hidden = !lines.hidden;
      if (board.id) location.hash = board.id;
    });
  }

  group("Added", diff.added.length);
  diff.added.forEach((title) => body.appendChild(h("div", "nav-row", title)));
  group("Removed", diff.removed.length);
  diff.removed.forEach((title) => body.appendChild(h("div", "nav-row", title)));

  if (!diff.changed.length && !diff.added.length && !diff.removed.length) note("No board changed.");
}

export const changesTab: Tab = {
  mount(panel) {
    body = tabBody(panel, "changes");
    fileInput = part<HTMLInputElement>(panel, 'input[type="file"]');
    part(panel, '.tab[data-tab="changes"]').hidden = !currentExport();

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      const older = parseExport(await file.text());
      renderChanges(older, older ? "" : "That file is not a Claude Design export.");
    });
    renderChanges(null);
  },
  // The comparison does not depend on the pinned element.
  render() {},
};
