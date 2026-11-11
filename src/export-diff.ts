/**
 * Compares two Claude Design exports, board by board.
 *
 * An export embeds its boards as JSON in `<script id="dc-data">`:
 * `boards` lists them and `sources` holds each board's source by file name.
 */
import { pageDocument } from "./page";

export type ExportBoard = { id: string; file: string; title: string };

export type ExportData = {
  /** The export date, as the export prints it. */
  exported: string;
  boards: ExportBoard[];
  sources: Record<string, string>;
};

export type ChangedBoard = {
  title: string;
  /** The board's id on the current page, to scroll to it. */
  id?: string;
  added: string[];
  removed: string[];
};

export type ExportDiff = { changed: ChangedBoard[]; added: string[]; removed: string[] };

const EMBEDDED_DATA = /<script type="application\/json" id="dc-data">([\s\S]*?)<\/script>/;

function findExportData(json: string | undefined): ExportData | undefined {
  try {
    // Cast: the text is the page's own; the checks just below decide whether it has the shape.
    const data = JSON.parse(json ?? "") as ExportData | undefined;
    const isValid = data && typeof data.sources === "object" && Array.isArray(data.boards);
    return isValid ? data : undefined;
  } catch {
    return undefined;
  }
}

/** The data of an export file's HTML, or undefined when the file is not an export. */
export const findExportInHtml = (html: string): ExportData | undefined =>
  findExportData(EMBEDDED_DATA.exec(html)?.[1]);

/** The data of the export this page is, or undefined when the page is not one. */
export const findCurrentExport = (): ExportData | undefined =>
  findExportData(pageDocument().getElementById("dc-data")?.textContent ?? undefined);

function lineCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const lines = text.split("\n").map((line) => line.trim());
  lines.filter(Boolean).forEach((line) => counts.set(line, (counts.get(line) ?? 0) + 1));
  return counts;
}

/**
 * Lines one text has more of than the other.
 * shortcut: order is ignored, so a line that only moved is not reported;
 * upgrade to a real diff if moved lines matter.
 */
function extraLines(counts: Map<string, number>, otherCounts: Map<string, number>): string[] {
  return [...counts].filter(([line, count]) => count > (otherCounts.get(line) ?? 0)).map(([line]) => line);
}

const findBoard = (data: ExportData, file: string): ExportBoard | undefined =>
  data.boards.find((board) => board.file === file);

const titleOf = (data: ExportData, file: string): string => findBoard(data, file)?.title ?? file;

/** The two exports being compared. */
type Exports = { older: ExportData; current: ExportData };

function changedBoard({ older, current }: Exports, file: string): ChangedBoard {
  const before = lineCounts(older.sources[file]);
  const after = lineCounts(current.sources[file]);
  return {
    title: titleOf(current, file),
    id: findBoard(current, file)?.id,
    added: extraLines(after, before),
    removed: extraLines(before, after),
  };
}

export function diffExports(older: ExportData, current: ExportData): ExportDiff {
  const files = Object.keys(current.sources);
  const changedFiles = files.filter(
    (file) => file in older.sources && older.sources[file] !== current.sources[file],
  );
  return {
    changed: changedFiles.map((file) => changedBoard({ older, current }, file)),
    added: files.filter((file) => !(file in older.sources)).map((file) => titleOf(current, file)),
    removed: Object.keys(older.sources)
      .filter((file) => !(file in current.sources))
      .map((file) => titleOf(older, file)),
  };
}
