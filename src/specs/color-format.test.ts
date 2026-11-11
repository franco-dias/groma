import { describe, expect, it } from "vitest";
import { colorParts, formatColorAs, toColorFormat } from "./color-format";

describe("formatColorAs", () => {
  it.each([
    { format: "hex", expected: "#2F6BFF" },
    { format: "rgb", expected: "rgb(47 107 255)" },
    { format: "hsl", expected: "hsl(223 100% 59%)" },
  ] as const)("writes a colour as $format", ({ format, expected }) => {
    expect(formatColorAs("rgb(47, 107, 255)", format)).toBe(expected);
  });

  it.each([
    { format: "hex", expected: "#2F6BFF 50%" },
    { format: "rgb", expected: "rgb(47 107 255 / 50%)" },
    { format: "hsl", expected: "hsl(223 100% 59% / 50%)" },
  ] as const)("keeps alpha in $format", ({ format, expected }) => {
    expect(formatColorAs("rgba(47, 107, 255, 0.5)", format)).toBe(expected);
  });

  it.each([
    { value: "rgb(255, 255, 255)", expected: "hsl(0 0% 100%)" },
    { value: "rgb(0, 0, 0)", expected: "hsl(0 0% 0%)" },
    { value: "rgb(128, 128, 128)", expected: "hsl(0 0% 50%)" },
  ])("gives $value no hue or saturation", ({ value, expected }) => {
    expect(formatColorAs(value, "hsl")).toBe(expected);
  });

  it.each([
    { value: "rgb(255, 0, 0)", expected: "hsl(0 100% 50%)" },
    { value: "rgb(0, 255, 0)", expected: "hsl(120 100% 50%)" },
    { value: "rgb(255, 0, 128)", expected: "hsl(330 100% 50%)" },
  ])("puts $value on the colour wheel", ({ value, expected }) => {
    expect(formatColorAs(value, "hsl")).toBe(expected);
  });

  it("reads hex spellings, such as the eyedropper's", () => {
    expect(formatColorAs("#2f6bff", "rgb")).toBe("rgb(47 107 255)");
    expect(formatColorAs("#fff", "hsl")).toBe("hsl(0 0% 100%)");
  });

  it("reads rgb written with spaces and a percentage alpha", () => {
    expect(formatColorAs("rgb(0 128 0 / 25%)", "hex")).toBe("#008000 25%");
  });

  it("leaves a colour it cannot read as it is", () => {
    expect(formatColorAs("oklch(0.7 0.1 200)", "rgb")).toBe("oklch(0.7 0.1 200)");
  });
});

describe("colorParts", () => {
  it("splits hex from its alpha", () => {
    expect(colorParts("rgba(47, 107, 255, 0.5)", "hex")).toEqual({ text: "#2F6BFF", alpha: "50%" });
    expect(colorParts("rgb(47, 107, 255)", "hex")).toEqual({ text: "#2F6BFF", alpha: "100%" });
  });

  it("keeps the alpha of rgb and hsl inside the text", () => {
    expect(colorParts("rgba(47, 107, 255, 0.5)", "rgb")).toEqual({ text: "rgb(47 107 255 / 50%)" });
    expect(colorParts("rgba(47, 107, 255, 0.5)", "hsl")).toEqual({ text: "hsl(223 100% 59% / 50%)" });
  });

  it("has no alpha for a colour it cannot read", () => {
    expect(colorParts("oklch(0.7 0.1 200)", "hex")).toEqual({ text: "oklch(0.7 0.1 200)" });
  });
});

describe("toColorFormat", () => {
  it("falls back to hex for anything stored that is not a format", () => {
    expect(toColorFormat("hsl")).toBe("hsl");
    expect(toColorFormat("cmyk")).toBe("hex");
    expect(toColorFormat(undefined)).toBe("hex");
  });
});
