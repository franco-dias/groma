/**
 * Compares two Claude Design exports, board by board.
 *
 * An export embeds its boards as JSON in `<script id="dc-data">`:
 * `boards` lists them and `sources` holds each board's source by file name.
 */

export interface ExportBoard {
  id: string;
  file: string;
  title: string;
}

export interface ExportData {
  /** The export date, as the export prints it. */
  exported: string;
  boards: ExportBoard[];
  sources: Record<string, string>;
}

export interface ChangedBoard {
  title: string;
  /** The board's id on the current page, to scroll to it. */
  id?: string;
  added: string[];
  removed: string[];
}

export interface ExportDiff {
  changed: ChangedBoard[];
  added: string[];
  removed: string[];
}

const EMBEDDED_DATA = /<script type="application\/json" id="dc-data">([\s\S]*?)<\/script>/;

function readExport(json: string | null | undefined): ExportData | null {
  try {
    const data = JSON.parse(json ?? "");
    const valid = data && typeof data.sources === "object" && Array.isArray(data.boards);
    return valid ? data : null;
  } catch {
    return null;
  }
}

/** The data of an export file's HTML, or null when the file is not an export. */
export const parseExport = (html: string): ExportData | null =>
  readExport(EMBEDDED_DATA.exec(html)?.[1]);

/** The data of the export this page is, or null when the page is not one. */
export const currentExport = (): ExportData | null =>
  readExport(document.getElementById("dc-data")?.textContent);

function lineCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  return counts;
}

/**
 * Lines one text has more of than the other.
 * shortcut: order is ignored, so a line that only moved is not reported;
 * upgrade to a real diff if moved lines matter.
 */
function extraLines(counts: Map<string, number>, otherCounts: Map<string, number>): string[] {
  return [...counts].filter(([line, n]) => n > (otherCounts.get(line) ?? 0)).map(([line]) => line);
}

export function diffExports(older: ExportData, current: ExportData): ExportDiff {
  const boardOf = (data: ExportData, file: string) => data.boards.find((b) => b.file === file);
  const titleOf = (data: ExportData, file: string) => boardOf(data, file)?.title ?? file;
  const files = Object.keys(current.sources);

  return {
    changed: files
      .filter((file) => file in older.sources && older.sources[file] !== current.sources[file])
      .map((file) => {
        const before = lineCounts(older.sources[file]);
        const after = lineCounts(current.sources[file]);
        return {
          title: titleOf(current, file),
          id: boardOf(current, file)?.id,
          added: extraLines(after, before),
          removed: extraLines(before, after),
        };
      }),
    added: files.filter((file) => !(file in older.sources)).map((file) => titleOf(current, file)),
    removed: Object.keys(older.sources)
      .filter((file) => !(file in current.sources))
      .map((file) => titleOf(older, file)),
  };
}
