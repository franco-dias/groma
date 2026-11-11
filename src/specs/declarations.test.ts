import { describe, expect, it } from "vitest";
import { cssBlock, splitTopLevel } from "./declarations";

describe("splitTopLevel", () => {
  it("splits at the separator and trims", () => {
    expect(splitTopLevel("a; b ;c", ";")).toEqual(["a", "b", "c"]);
  });

  it("keeps a separator inside parentheses", () => {
    expect(splitTopLevel("0 0 4px rgb(0, 0, 0), 1px 1px calc(1px + 2px)", ",")).toEqual([
      "0 0 4px rgb(0, 0, 0)",
      "1px 1px calc(1px + 2px)",
    ]);
  });

  it("keeps a separator inside nested parentheses", () => {
    expect(splitTopLevel("a(b(c, d), e), f", ",")).toEqual(["a(b(c, d), e)", "f"]);
  });

  it("keeps a separator inside quotes", () => {
    expect(splitTopLevel('content: "a; b"; color: red', ";")).toEqual(['content: "a; b"', "color: red"]);
    expect(splitTopLevel("font-family: 'A, B', serif", ",")).toEqual(["font-family: 'A, B'", "serif"]);
  });

  it("drops empty parts", () => {
    expect(splitTopLevel("a;; b;", ";")).toEqual(["a", "b"]);
    expect(splitTopLevel("", ";")).toEqual([]);
  });
});

describe("cssBlock", () => {
  it("writes the name as a comment and one declaration per line", () => {
    expect(cssBlock({ name: "div.card", cssText: "display: flex; gap: var(--space-2);" })).toBe(
      "/* div.card */\ndisplay: flex;\ngap: var(--space-2);",
    );
  });

  it("keeps a semicolon inside a value", () => {
    expect(cssBlock({ name: "p", cssText: 'content: "a; b";' })).toBe('/* p */\ncontent: "a; b";');
  });

  it("is only the comment for no declarations", () => {
    expect(cssBlock({ name: "div", cssText: "" })).toBe("/* div */");
  });
});
