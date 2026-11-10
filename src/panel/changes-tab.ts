/**
 * The Changes tab: this Claude Design export against an older one.
 *
 * Pick the older export file; the tab lists the boards that changed, were
 * added or were removed. Click a changed board to go to it and see its
 * changed lines. The tab is hidden on pages that are not exports.
 */
import { h } from "../dom";
import {
  type ChangedBoard,
  currentExport,
  diffExports,
  type ExportData,
  parseExport,
} from "../export-diff";
import { icon } from "../icons";
import { pageWindow } from "../page";
import { part, type Tab, tabBody } from "./tab";

const MAX_LINES = 30;
const MAX_LINE_LENGTH = 160;

let head: HTMLElement;
let body: HTMLElement;
let fileInput: HTMLInputElement;

const chooseFile = (): void => fileInput.click();

/** "08 · RentSummaryCard" with its number muted, so the name reads first. */
function boardName(title: string): HTMLElement {
  const name = h("span", "board-name");
  const [prefix, ...rest] = title.split(" · ");
  if (rest.length) name.append(h("span", "prefix", prefix + " · "), rest.join(" · "));
  else name.textContent = title;
  return name;
}

/** The button that shows the chosen file and lets the user pick another. */
function fileButton(fileName: string, isError: boolean): HTMLElement {
  const button = h("button", isError ? "file-button is-error" : "file-button");
  button.append(icon("file"), h("span", "file-name", fileName), h("span", "change", "Change"));
  button.addEventListener("click", chooseFile);
  return button;
}

function groupHeading(title: string, count: number): void {
  const heading = body.appendChild(h("div", "change-group"));
  heading.append(icon("chevronDown", 12), title, h("span", "count", String(count)));
}

/** A changed board: click to open its lines and to scroll the page to it. */
function changedRow(board: ChangedBoard): void {
  const row = body.appendChild(h("button", "change-row"));
  row.setAttribute("aria-expanded", "false");
  const caret = row.appendChild(h("span", "caret"));
  caret.appendChild(icon("chevronRight", 12));
  row.appendChild(boardName(board.title));
  const totals = row.appendChild(h("span", "totals"));
  const total = (count: number, sign: string, className: string) =>
    totals.appendChild(h("span", count ? className : "zero", sign + count));
  total(board.added.length, "+", "added");
  total(board.removed.length, "−", "removed");

  const lines = body.appendChild(h("div", "change-lines"));
  lines.hidden = true;
  const addLines = (list: string[], className: string, sign: string) =>
    list.slice(0, MAX_LINES).forEach((text) => {
      const line = lines.appendChild(h("div", `change-line ${className}`));
      line.append(h("span", "sign", sign), h("span", "text", text.slice(0, MAX_LINE_LENGTH)));
    });
  // Signs as well as colours, so the meaning never rests on colour alone.
  addLines(board.added, "is-added", "+");
  addLines(board.removed, "is-removed", "−");

  row.addEventListener("click", () => {
    lines.hidden = !lines.hidden;
    row.setAttribute("aria-expanded", String(!lines.hidden));
    caret.replaceChildren(icon(lines.hidden ? "chevronRight" : "chevronDown", 12));
    if (board.id) pageWindow().location.hash = board.id;
  });
}

/** A board that only exists in one of the two exports. */
function plainRow(title: string, className: string, sign: string): void {
  const row = body.appendChild(h("div", `change-row ${className}`));
  row.append(h("span", "sign", sign), boardName(title));
}

function renderEmpty(): void {
  head.hidden = true;
  const empty = h("div", "changes-empty");
  const choose = h("button", "primary-button");
  choose.append(icon("file"), "Choose export");
  choose.addEventListener("click", chooseFile);
  empty.append(
    h("b", "", "No export loaded"),
    h("span", "hint", "Pick an earlier export of this page to see which boards changed."),
    choose,
  );
  body.replaceChildren(empty);
}

function renderError(fileName: string): void {
  head.hidden = false;
  head.replaceChildren(fileButton(fileName, true));
  const alert = h("div", "alert");
  alert.setAttribute("role", "alert");
  const text = h("div");
  text.append(
    h("b", "", "Not an export"),
    h("span", "hint", "This file has no inspector data. Pick an .html file saved with Export from this page."),
  );
  alert.append(icon("warning"), text);
  body.replaceChildren(alert);
}

function renderChanges(fileName: string, older: ExportData, current: ExportData): void {
  const diff = diffExports(older, current);
  head.hidden = false;
  const dates = h("div", "dates");
  dates.append(h("span", "", older.exported), icon("arrow", 12), h("span", "", current.exported));
  head.replaceChildren(fileButton(fileName, false), dates);

  body.replaceChildren();
  if (diff.changed.length) groupHeading("Changed", diff.changed.length);
  diff.changed.forEach(changedRow);
  if (diff.added.length) groupHeading("Added", diff.added.length);
  diff.added.forEach((title) => plainRow(title, "is-added", "+"));
  if (diff.removed.length) groupHeading("Removed", diff.removed.length);
  diff.removed.forEach((title) => plainRow(title, "is-removed", "−"));
  if (!body.childElementCount) {
    body.appendChild(h("div", "changes-empty")).appendChild(h("span", "hint", "No board changed."));
  }
}

export const changesTab: Tab = {
  mount(panel) {
    head = part(panel, ".changes-head");
    body = tabBody(panel, "changes");
    fileInput = part<HTMLInputElement>(panel, 'input[type="file"]');
    part(panel, '.tab[data-tab="changes"]').hidden = !currentExport();

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      const older = parseExport(await file.text());
      const current = currentExport();
      if (older && current) renderChanges(file.name, older, current);
      else renderError(file.name);
    });
    renderEmpty();
  },
  // The comparison does not depend on the pinned element.
  render() {},
};
