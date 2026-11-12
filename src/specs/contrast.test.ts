import { describe, expect, it } from "vitest";
import { contrastOf, formatRatio, isLargeText, wcagLevel } from "./contrast";

const NORMAL = { fontSize: 16, fontWeight: 400 };
const WHITE = { color: "rgb(255, 255, 255)", hasImage: false };
const NONE = { color: "rgba(0, 0, 0, 0)", hasImage: false };

const ratioOf = (text: string, layers = [WHITE]): number | undefined => {
  const result = contrastOf({ text, layers, size: NORMAL });
  return result?.kind === "ratio" ? result.ratio : undefined;
};

describe("contrastOf", () => {
  it.each([
    { text: "rgb(0, 0, 0)", expected: 21 },
    { text: "rgb(119, 119, 119)", expected: 4.48 },
    { text: "rgb(118, 118, 118)", expected: 4.54 },
    { text: "rgb(255, 255, 255)", expected: 1 },
  ])("measures $text on white as $expected", ({ text, expected }) => {
    expect(ratioOf(text)).toBeCloseTo(expected, 2);
  });

  it("is the same whichever of the two is lighter", () => {
    const black = { color: "rgb(0, 0, 0)", hasImage: false };
    expect(ratioOf("rgb(255, 255, 255)", [black])).toBeCloseTo(21, 5);
  });

  it("composites the text color's own alpha over the background", () => {
    expect(ratioOf("rgba(0, 0, 0, 0.5)")).toBeCloseTo(ratioOf("rgb(128, 128, 128)")!, 1);
  });

  it("composites a translucent layer over the one behind it, down to the canvas", () => {
    const half = { color: "rgba(0, 0, 0, 0.5)", hasImage: false };
    expect(ratioOf("rgb(255, 255, 255)", [half, NONE])).toBeCloseTo(
      ratioOf("rgb(255, 255, 255)", [{ color: "rgb(128, 128, 128)", hasImage: false }])!,
      1,
    );
  });

  it("takes white as the canvas when no layer has a color", () => {
    expect(ratioOf("rgb(0, 0, 0)", [NONE, NONE])).toBeCloseTo(21, 5);
  });

  it("stops at the first opaque layer", () => {
    const black = { color: "rgb(0, 0, 0)", hasImage: false };
    expect(ratioOf("rgb(0, 0, 0)", [WHITE, black])).toBeCloseTo(21, 5);
  });

  it("cannot know the ratio over an image or a gradient", () => {
    const image = { color: "rgba(0, 0, 0, 0)", hasImage: true };
    expect(contrastOf({ text: "rgb(0, 0, 0)", layers: [image, WHITE], size: NORMAL })).toEqual({
      kind: "image",
    });
  });

  it("ignores an image hidden behind an opaque color", () => {
    const hidden = { color: "rgba(0, 0, 0, 0)", hasImage: true };
    expect(ratioOf("rgb(0, 0, 0)", [WHITE, hidden])).toBeCloseTo(21, 5);
  });

  it("answers nothing for a color it cannot read", () => {
    expect(contrastOf({ text: "oklch(0.7 0.1 200)", layers: [WHITE], size: NORMAL })).toBeUndefined();
  });
});

describe("wcagLevel", () => {
  it.each([
    { ratio: 7, isLarge: false, level: "AAA" },
    { ratio: 6.99, isLarge: false, level: "AA" },
    { ratio: 4.5, isLarge: false, level: "AA" },
    { ratio: 4.49, isLarge: false, level: "Fails AA" },
    { ratio: 4.5, isLarge: true, level: "AAA" },
    { ratio: 3, isLarge: true, level: "AA" },
    { ratio: 2.99, isLarge: true, level: "Fails AA" },
  ])("rates $ratio as $level (large: $isLarge)", ({ ratio, isLarge, level }) => {
    expect(wcagLevel({ ratio, isLarge })).toBe(level);
  });
});

describe("isLargeText", () => {
  it.each([
    { fontSize: 24, fontWeight: 400, expected: true },
    { fontSize: 23.9, fontWeight: 400, expected: false },
    { fontSize: 18.66, fontWeight: 700, expected: true },
    { fontSize: 18.66, fontWeight: 600, expected: false },
    { fontSize: 18, fontWeight: 700, expected: false },
  ])("is $expected for $fontSize px at weight $fontWeight", ({ expected, ...size }) => {
    expect(isLargeText(size)).toBe(expected);
  });
});

describe("formatRatio", () => {
  it("rounds to two places and drops trailing zeros", () => {
    expect(formatRatio(4.5201)).toBe("4.52 : 1");
    expect(formatRatio(21)).toBe("21 : 1");
    expect(formatRatio(4.4776)).toBe("4.48 : 1");
  });
});
