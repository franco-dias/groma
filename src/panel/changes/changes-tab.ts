/**
 * The Changes tab: this Claude Design export against an older one.
 *
 * Pick the older export file; the tab lists the boards that changed, were
 * added or were removed. Click a changed board to go to it and see its
 * changed lines. The tab is hidden on pages that are not exports.
 */
import { h } from "../../dom";
import { diffExports, type ExportData, findCurrentExport, findExportInHtml } from "../../export-diff";
import { icon } from "../../icons";
import { part, type Tab, tabBody } from "../tab";
import { createChangedRow, createGroupHeading, createPlainRow } from "./change-rows";

let head: HTMLElement;
let body: HTMLElement;
let fileInput: HTMLInputElement;

const chooseFile = (): void => fileInput.click();

/** The button that shows the chosen file and lets the user pick another. */
function createFileButton(fileName: string, className: string): HTMLElement {
  const button = h("button", className);
  button.append(icon("file"), h("span", "file-name", fileName), h("span", "change", "Change"));
  button.addEventListener("click", chooseFile);
  return button;
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
  head.replaceChildren(createFileButton(fileName, "file-button is-error"));
  const alert = h("div", "alert");
  alert.setAttribute("role", "alert");
  const text = h("div");
  text.append(
    h("b", "", "Not an export"),
    h(
      "span",
      "hint",
      "This file has no inspector data. Pick an .html file saved with Export from this page.",
    ),
  );
  alert.append(icon("warning"), text);
  body.replaceChildren(alert);
}

/** The older export the user picked, against the one this page is. */
type Comparison = { fileName: string; older: ExportData; current: ExportData };

/** The boards only one export has, under a heading; nothing when there are none. */
function createPlainGroup(
  titles: string[],
  group: { heading: string; kind: "added" | "removed" },
): HTMLElement[] {
  if (!titles.length) return [];
  return [
    createGroupHeading(group.heading, titles.length),
    ...titles.map((title) => createPlainRow(title, group.kind)),
  ];
}

function createGroups({ older, current }: Comparison): HTMLElement[] {
  const diff = diffExports(older, current);
  return [
    ...(diff.changed.length ? [createGroupHeading("Changed", diff.changed.length)] : []),
    ...diff.changed.flatMap(createChangedRow),
    ...createPlainGroup(diff.added, { heading: "Added", kind: "added" }),
    ...createPlainGroup(diff.removed, { heading: "Removed", kind: "removed" }),
  ];
}

function renderChanges(comparison: Comparison): void {
  const { fileName, older, current } = comparison;
  head.hidden = false;
  const dates = h("div", "dates");
  dates.append(h("span", "", older.exported), icon("arrow", 12), h("span", "", current.exported));
  head.replaceChildren(createFileButton(fileName, "file-button"), dates);

  const groups = createGroups(comparison);
  body.replaceChildren(...(groups.length ? groups : [createNoChange()]));
}

function createNoChange(): HTMLElement {
  const empty = h("div", "changes-empty");
  empty.appendChild(h("span", "hint", "No board changed."));
  return empty;
}

async function compareWithFile(): Promise<void> {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  const older = findExportInHtml(await file.text());
  const current = findCurrentExport();
  if (older && current) renderChanges({ fileName: file.name, older, current });
  else renderError(file.name);
}

export const changesTab: Tab = {
  mount(panel) {
    head = part(panel, ".changes-head");
    body = tabBody(panel, "changes");
    fileInput = part<HTMLInputElement>(panel, 'input[type="file"]');
    part(panel, '.tab[data-tab="changes"]').hidden = !findCurrentExport();
    fileInput.addEventListener("change", compareWithFile);
    renderEmpty();
  },
  // The comparison does not depend on the pinned element.
  render() {},
};
