/** The rows of the Changes tab: a changed board with its lines, and a board only one export has. */
import { h } from "../../dom";
import type { ChangedBoard } from "../../export-diff";
import { icon } from "../../icons";
import { pageWindow } from "../../page";

const MAX_LINES = 30;
const MAX_LINE_LENGTH = 160;

/** "08 · RentSummaryCard" with its number muted, so the name reads first. */
function createBoardName(title: string): HTMLElement {
  const name = h("span", "board-name");
  const [prefix, ...rest] = title.split(" · ");
  if (rest.length) name.append(h("span", "prefix", prefix + " · "), rest.join(" · "));
  else name.textContent = title;
  return name;
}

export function createGroupHeading(title: string, count: number): HTMLElement {
  const heading = h("div", "change-group");
  heading.append(icon("chevronDown", 12), title, h("span", "count", String(count)));
  return heading;
}

const SIGNS = { added: "+", removed: "−" };

function createTotal(count: number, kind: "added" | "removed"): HTMLElement {
  return h("span", count ? kind : "zero", SIGNS[kind] + count);
}

function createRow(board: ChangedBoard): { row: HTMLElement; caret: HTMLElement } {
  const row = h("button", "change-row");
  row.setAttribute("aria-expanded", "false");
  const caret = row.appendChild(h("span", "caret"));
  caret.appendChild(icon("chevronRight", 12));
  row.appendChild(createBoardName(board.title));
  const totals = row.appendChild(h("span", "totals"));
  totals.append(createTotal(board.added.length, "added"), createTotal(board.removed.length, "removed"));
  return { row, caret };
}

/** The sign goes with the color, so the meaning never rests on color alone. */
function createLine(text: string, kind: "added" | "removed"): HTMLElement {
  const line = h("div", `change-line is-${kind}`);
  line.append(h("span", "sign", SIGNS[kind]), h("span", "text", text.slice(0, MAX_LINE_LENGTH)));
  return line;
}

function createLines(board: ChangedBoard): HTMLElement {
  const lines = h("div", "change-lines");
  lines.hidden = true;
  lines.append(
    ...board.added.slice(0, MAX_LINES).map((text) => createLine(text, "added")),
    ...board.removed.slice(0, MAX_LINES).map((text) => createLine(text, "removed")),
  );
  return lines;
}

/** A changed board: click to open its lines and to scroll the page to it. Returns the row and its lines. */
export function createChangedRow(board: ChangedBoard): HTMLElement[] {
  const { row, caret } = createRow(board);
  const lines = createLines(board);
  row.addEventListener("click", () => {
    lines.hidden = !lines.hidden;
    row.setAttribute("aria-expanded", String(!lines.hidden));
    caret.replaceChildren(icon(lines.hidden ? "chevronRight" : "chevronDown", 12));
    if (board.id) pageWindow().location.hash = board.id;
  });
  return [row, lines];
}

/** A board that only exists in one of the two exports. */
export function createPlainRow(title: string, kind: "added" | "removed"): HTMLElement {
  const row = h("div", `change-row is-${kind}`);
  row.append(h("span", "sign", SIGNS[kind]), createBoardName(title));
  return row;
}
