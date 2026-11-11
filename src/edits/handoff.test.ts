import { describe, expect, it } from "vitest";
import { formatHandoff, type HandoffElement } from "./handoff";

const page = { address: "http://localhost:4777/page.html", width: 1280, height: 800 };

const element = (changes: Partial<HandoffElement>): HandoffElement => ({
  name: "button",
  selector: "#hero > button.cta",
  onPage: true,
  values: [],
  note: "",
  ...changes,
});

const lines = (elements: HandoffElement[]): string[] => formatHandoff(page, elements).split("\n");

describe("the text Copy edits writes", () => {
  it("opens with the page and the viewport the edits were made at", () => {
    const text = lines([]);
    expect(text[0]).toBe("# Edits to apply");
    expect(text).toContain("- Page: http://localhost:4777/page.html");
    expect(text).toContain("- Viewport: 1280 × 800");
  });

  it("lists each edit as before → after, and names the tokens that hold the new value", () => {
    const text = lines([
      element({
        values: [
          { prop: "padding-top", before: "12px", after: "16px", tokens: ["--space-4"] },
          { prop: "color", before: "rgb(0, 128, 0)", after: "red", tokens: [] },
        ],
      }),
    ]);
    expect(text).toContain("## 1. button");
    expect(text).toContain("- Selector: `#hero > button.cta`");
    expect(text).toContain("- `padding-top`: `12px` → `16px` (matches `--space-4`)");
    expect(text).toContain("- `color`: `rgb(0, 128, 0)` → `red`");
  });

  it("names at most three tokens", () => {
    const tokens = ["--a", "--b", "--c", "--d"];
    const text = lines([element({ values: [{ prop: "gap", before: "0px", after: "8px", tokens }] })]);
    expect(text).toContain("- `gap`: `0px` → `8px` (matches `--a`, `--b`, `--c`)");
  });

  it("says where the element comes from: its component, its source and its text", () => {
    const text = lines([
      element({
        name: "Button",
        component: { name: "Button", sourcePath: "ui/Button.tsx", inside: false },
        text: "Get started",
      }),
      element({ component: { name: "Card", inside: true } }),
    ]);
    expect(text).toContain("## 1. Button");
    expect(text).toContain("- Component: `Button` (`ui/Button.tsx`)");
    expect(text).toContain('- Text: "Get started"');
    expect(text).toContain("## 2. button");
    expect(text).toContain("- Inside component: `Card`");
  });

  it("keeps new content on one line, quoted", () => {
    const text = lines([element({ values: [{ prop: "", before: "Title", after: 'Say "hi"\nnow', tokens: [] }] })]);
    expect(text).toContain('- Content: "Title" → "Say \\"hi\\"\\nnow"');
  });

  it("carries a note, with or without an edit", () => {
    const text = lines([element({ note: "Make this sticky" })]);
    expect(text).toContain("Note: Make this sticky");
    expect(text).not.toContain("Edits:");
  });

  it("quotes a note of several lines, so none of them reads as a heading", () => {
    const text = lines([element({ note: "Make this sticky\n\n## 9. Not a heading" })]);
    expect(text.slice(text.indexOf("Note:"))).toEqual([
      "Note:",
      "> Make this sticky",
      ">",
      "> ## 9. Not a heading",
      "",
    ]);
  });

  it("keeps a value with backticks or line breaks readable as one piece of code", () => {
    const text = lines([
      element({
        values: [
          { prop: "font-family", before: "Lyon", after: 'Foo`bar`, "Baz"', tokens: [] },
          { prop: "width", before: "10px", after: "calc(1px +\n 2px)", tokens: [] },
        ],
      }),
    ]);
    expect(text).toContain('- `font-family`: `Lyon` → `` Foo`bar`, "Baz" ``');
    expect(text).toContain("- `width`: `10px` → `calc(1px + 2px)`");
  });

  it("says so when a value before or the element itself is not known", () => {
    const text = lines([
      element({ onPage: false, values: [{ prop: "width", before: null, after: "40px", tokens: [] }] }),
    ]);
    expect(text).toContain("- `width`: `40px` (the value before is not known)");
    expect(text).toContain("- The page did not have this element when the edits were copied.");
  });
});
