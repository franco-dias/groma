import { describe, expect, it } from "vitest";
import { findFit, isLengthValue, lengthInPixels, rankTokens } from "./suggest";

describe("findFit", () => {
  it("takes colours for a colour property and lengths for a size", () => {
    expect(findFit("background-color")).toBe("color");
    expect(findFit("stroke")).toBe("color");
    for (const prop of [
      "width",
      "gap",
      "border-radius",
      "padding-left",
      "margin-top",
      "font-size",
      "line-height",
      "letter-spacing",
    ])
      expect(findFit(prop)).toBe("length");
  });

  it("offers nothing for the rest", () => {
    for (const prop of [
      "display",
      "font-weight",
      "opacity",
      "grid-template-columns",
      "box-sizing",
      "font-family",
      "justify-items",
    ])
      expect(findFit(prop)).toBeUndefined();
  });
});

describe("isLengthValue", () => {
  it("accepts lengths, zero and math functions", () => {
    for (const value of ["16px", "1.5rem", ".5em", "-4px", "0", "calc(1rem + 2px)", "clamp(1rem, 2vw, 3rem)"])
      expect(isLengthValue(value)).toBe(true);
  });

  it("turns down colours, keywords and bare numbers", () => {
    for (const value of [
      "#fff",
      "rgb(0, 0, 0)",
      "auto",
      "400",
      "1.5",
      "var(--x)",
      "Inter, sans-serif",
      "100%",
    ])
      expect(isLengthValue(value)).toBe(false);
  });
});

describe("lengthInPixels", () => {
  it("reads px and rem, and says what a bare number means", () => {
    expect(lengthInPixels("12px", { rootFontSize: 16 })).toBe(12);
    expect(lengthInPixels("1.5rem", { rootFontSize: 16 })).toBe(24);
    expect(lengthInPixels("8", { rootFontSize: 16 })).toBe(8);
    expect(lengthInPixels("2", { rootFontSize: 16, bareUnit: "rem" })).toBe(32);
  });

  it("is null for other units and lists", () => {
    expect(lengthInPixels("2em", { rootFontSize: 16 })).toBeUndefined();
    expect(lengthInPixels("12px 16px", { rootFontSize: 16 })).toBeUndefined();
  });
});

const holding = (wanted: string) => (value: string) => value === wanted;

describe("rankTokens", () => {
  const tokens = [
    { name: "--space-2", value: "8px" },
    { name: "--gap-m", value: "16px" },
    { name: "--space-4", value: "16px" },
    { name: "--radius", value: "4px" },
  ];

  it("lists the tokens that hold the value, and nothing else while nothing is typed", () => {
    expect(rankTokens(tokens, { typed: "", holds: holding("16px") }).map((token) => token.name)).toEqual([
      "--gap-m",
      "--space-4",
    ]);
    expect(rankTokens(tokens, { typed: "", holds: holding("1px") })).toEqual([]);
  });

  it("puts the holders first, then the names that contain what was typed, ignoring case", () => {
    expect(rankTokens(tokens, { typed: "SPACE", holds: holding("16px") }).map((token) => token.name)).toEqual(
      ["--gap-m", "--space-4", "--space-2"],
    );
    expect(rankTokens(tokens, { typed: "--sp", holds: holding("none") }).map((token) => token.name)).toEqual([
      "--space-2",
      "--space-4",
    ]);
  });

  it("orders each group by the length of the name, whatever order the tokens came in", () => {
    const shuffled = [tokens[2], tokens[0], tokens[3], tokens[1]];
    expect(rankTokens(shuffled, { typed: "-", holds: holding("none") }).map((token) => token.name)).toEqual([
      "--gap-m",
      "--radius",
      "--space-2",
      "--space-4",
    ]);
  });

  it("lists a token once and at most as many as the limit", () => {
    expect(
      rankTokens(tokens, { typed: "space", holds: holding("8px"), limit: 2 }).map((token) => token.name),
    ).toEqual(["--space-2", "--space-4"]);
    const many = Array.from({ length: 20 }, (_, index) => ({ name: `--s-${index}`, value: "1px" }));
    expect(rankTokens(many, { typed: "s", holds: () => false })).toHaveLength(8);
  });
});
