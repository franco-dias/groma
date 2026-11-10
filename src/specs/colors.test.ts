import { describe, expect, it } from "vitest";
import { formatColor, isColorValue } from "./colors";

describe("formatColor", () => {
  it("writes opaque colours as hex", () => {
    expect(formatColor("rgb(27, 26, 23)")).toBe("#1B1A17");
  });

  it("keeps alpha as a percentage", () => {
    expect(formatColor("rgba(255, 255, 255, 0.08)")).toBe("#FFFFFF 8%");
  });

  it("leaves other spellings alone", () => {
    expect(formatColor("oklch(0.7 0.1 200)")).toBe("oklch(0.7 0.1 200)");
  });
});

describe("isColorValue", () => {
  it("recognises colours and nothing else", () => {
    expect(isColorValue("#fff")).toBe(true);
    expect(isColorValue("rgb(0, 0, 0)")).toBe(true);
    expect(isColorValue("24px")).toBe(false);
  });
});
