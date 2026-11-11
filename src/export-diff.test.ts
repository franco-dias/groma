import { describe, expect, it } from "vitest";
import { diffExports, type ExportData, findExportInHtml } from "./export-diff";

const current: ExportData = {
  exported: "Nov 9, 2026",
  boards: [
    { id: "card", file: "Card.dc.html", title: "01 · Card" },
    { id: "chip", file: "Chip.dc.html", title: "02 · Chip" },
  ],
  sources: {
    "Card.dc.html": "<title>Card</title>\n<p>same</p>\n<p>new line</p>",
    "Chip.dc.html": "<title>Chip</title>",
  },
};

const older: ExportData = {
  exported: "Oct 30, 2026",
  boards: [
    { id: "card", file: "Card.dc.html", title: "01 · Card" },
    { id: "gone", file: "Gone.dc.html", title: "99 · Gone" },
  ],
  sources: {
    "Card.dc.html": "<title>Card</title>\n<p>same</p>\n<p>old line</p>",
    "Gone.dc.html": "<title>Gone</title>",
  },
};

describe("diffExports", () => {
  it("lists changed, added and removed boards", () => {
    expect(diffExports(older, current)).toEqual({
      changed: [{ title: "01 · Card", id: "card", added: ["<p>new line</p>"], removed: ["<p>old line</p>"] }],
      added: ["02 · Chip"],
      removed: ["99 · Gone"],
    });
  });

  it("reports nothing for the same export", () => {
    expect(diffExports(current, current)).toEqual({ changed: [], added: [], removed: [] });
  });
});

describe("findExportInHtml", () => {
  it("reads the data an export embeds", () => {
    const html = `<html><script type="application/json" id="dc-data">${JSON.stringify(current)}</script></html>`;
    expect(findExportInHtml(html)).toEqual(current);
  });

  it("rejects files that are not exports", () => {
    expect(findExportInHtml("<html>hello</html>")).toBeUndefined();
    expect(
      findExportInHtml('<script type="application/json" id="dc-data">{"boards": 1}</script>'),
    ).toBeUndefined();
  });
});
