import { beforeEach, describe, expect, it } from "vitest";
import { getElement, inspector, openTab, page, reset, texts, ui, wait } from "./helpers";

const exportData = (overrides: object = {}) => ({
  exported: "Nov 9, 2026",
  boards: [
    { id: "card", file: "Card.dc.html", title: "01 · Card" },
    { id: "chip", file: "Chip.dc.html", title: "02 · Chip" },
  ],
  sources: {
    "Card.dc.html": "<p>same</p>\n<p>new line</p>",
    "Chip.dc.html": "<p>chip</p>",
  },
  ...overrides,
});

const olderExport = exportData({
  exported: "Oct 30, 2026",
  boards: [
    { id: "card", file: "Card.dc.html", title: "01 · Card" },
    { id: "gone", file: "Gone.dc.html", title: "05 · Gone" },
  ],
  sources: { "Card.dc.html": "<p>same</p>\n<p>old line</p>", "Gone.dc.html": "<p>gone</p>" },
});

const asExportFile = (data: object): string =>
  `<html><script type="application/json" id="dc-data">${JSON.stringify(data).replace(/<\//g, "<\\/")}</script></html>`;

/** Picks a file in the Changes tab, as the file dialog would. */
/** Polls for the file's name in the tab, for up to five seconds. */
async function waitForFileName(name: string, waited = 0): Promise<void> {
  if (waited >= 5000 || texts(".file-name").includes(name)) return;
  await wait(10);
  return waitForFileName(name, waited + 10);
}

async function chooseFile(name: string, content: string): Promise<void> {
  const input = ui<HTMLInputElement>('.panel input[type="file"]')!;
  const files = new DataTransfer();
  files.items.add(new File([content], name, { type: "text/html" }));
  input.files = files.files;
  input.dispatchEvent(new Event("change"));
  // The tab reads the file before it shows anything. That takes as long as
  // the machine lets it: wait for the file's name, not for a fixed time.
  await waitForFileName(name);
}

beforeEach(() => {
  reset();
  // The page is a Claude Design export: it embeds its boards as JSON.
  page(`
    <script type="application/json" id="dc-data">${JSON.stringify(exportData())}</script>
    <section id="card"><div class="card">Card</div></section>
  `);
  inspector().pin(getElement(".card"));
  openTab("changes");
});

describe("Changes tab", () => {
  it("is offered on an export, and starts by asking for an older one", () => {
    expect(ui('.tab[data-tab="changes"]')!.hidden).toBe(false);
    expect(texts(".changes-empty b")).toEqual(["No export loaded"]);
  });

  it("lists the boards that changed, were added or were removed", async () => {
    await chooseFile("handoff-2026-10-30.html", asExportFile(olderExport));

    expect(texts(".file-name")).toEqual(["handoff-2026-10-30.html"]);
    expect(texts(".dates span")).toEqual(["Oct 30, 2026", "Nov 9, 2026"]);
    expect(texts(".change-group")).toEqual(["Changed1", "Added1", "Removed1"]);
    expect(texts(".change-row .board-name")).toEqual(["01 · Card", "02 · Chip", "05 · Gone"]);
    expect(texts(".change-row .totals")).toEqual(["+1−1"]);
  });

  it("opens a changed board's lines and goes to the board", async () => {
    await chooseFile("older.html", asExportFile(olderExport));
    const lines = ui(".change-lines")!;
    expect(lines.hidden).toBe(true);

    ui("button.change-row")!.click();
    expect(lines.hidden).toBe(false);
    expect(texts(".change-line")).toEqual(["+<p>new line</p>", "−<p>old line</p>"]);
    expect(location.hash).toBe("#card");
    // oxlint-disable-next-line unicorn/no-null -- the History API takes null for "no state"
    history.replaceState(null, "", location.pathname);
  });

  it("says so when the two exports are the same", async () => {
    await chooseFile("same.html", asExportFile(exportData()));
    expect(texts(".changes-empty .hint")).toEqual(["No board changed."]);
  });

  it("explains a file that is not an export", async () => {
    await chooseFile("notes.html", "<html>hello</html>");
    expect(texts(".alert b")).toEqual(["Not an export"]);
    expect(ui(".file-button")!.classList.contains("is-error")).toBe(true);
  });
});
