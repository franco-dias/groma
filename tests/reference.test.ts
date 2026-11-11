import { beforeEach, describe, expect, it } from "vitest";
import { all, el, inspector, openTab, page, pressKey, reset, texts, ui } from "./helpers";

const shown = (selector: string): boolean => getComputedStyle(ui(selector)!).display !== "none";
const savedTab = (): string => JSON.parse(localStorage.getItem("__groma_panel") ?? "{}").tab;

beforeEach(() => {
  reset();
  page(`<div class="card" style="width: 200px; height: 100px">Card</div>`);
  inspector().pin(el(".card"));
});

describe("» menu", () => {
  it("is closed until its button is clicked", () => {
    expect(ui(".more-menu")!.hidden).toBe(true);
    ui(".more-button")!.click();
    expect(ui(".more-menu")!.hidden).toBe(false);
    expect(texts(".more-item")).toEqual([
      "Shortcuts and tips",
      "Push the page aside",
      "Show on a canvas",
      "Collapse panel",
    ]);
  });

  it("closes on a click elsewhere in the panel, and on Esc", () => {
    ui(".more-button")!.click();
    ui(".tab-bar")!.click();
    expect(ui(".more-menu")!.hidden).toBe(true);

    ui(".more-button")!.click();
    pressKey(ui(".panel")!, "Escape");
    expect(ui(".more-menu")!.hidden).toBe(true);
  });

  it("collapses the panel", () => {
    ui(".more-button")!.click();
    ui(".more-item.collapse")!.click();
    expect(ui(".panel")!.offsetWidth).toBe(28);
    expect(ui(".more-menu")!.hidden).toBe(true);
  });
});

describe("Reference tab", () => {
  const openReference = () => {
    ui(".more-button")!.click();
    ui('.more-item[data-tab="reference"]')!.click();
  };

  it("opens from the » menu and replaces the other tabs' content", () => {
    openReference();
    expect(shown('.body[data-for="reference"]')).toBe(true);
    expect(shown('.body[data-for="specs"]')).toBe(false);
    expect(shown(".action-bar")).toBe(false);
    expect(shown(".element-header")).toBe(false);
  });

  it("lists the shortcuts and tricks by subject", () => {
    openReference();
    expect(texts('.body[data-for="reference"] h3')).toEqual([
      "Inspect",
      "Copy",
      "Specs",
      "All CSS",
      "Edits",
      "Layers and panel",
      "Canvas",
      "Good to know",
    ]);
    const terms = texts(".reference dt");
    expect(terms.length).toBe(all(".reference dd").length);
    expect(terms.length).toBeGreaterThan(25);
  });

  it("names the modifier keys as this keyboard does", () => {
    openReference();
    const keys = new Set(texts(".reference kbd[data-key]"));
    expect(keys.has("")).toBe(false);
    expect([...keys].every((key) => ["Alt", "Ctrl", "Shift", "⌥", "⌘", "⇧"].includes(key))).toBe(true);
  });

  it("gives way to a normal tab, and is not the tab the panel reopens on", () => {
    openTab("layers");
    openReference();
    expect(savedTab()).toBe("layers");

    openTab("specs");
    expect(shown('.body[data-for="reference"]')).toBe(false);
    expect(savedTab()).toBe("specs");
  });
});
