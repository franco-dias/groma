import { describe, expect, it } from "vitest";
import { isColorValue } from "./colors";

describe("isColorValue", () => {
  it("recognises colors and nothing else", () => {
    expect(isColorValue("#fff")).toBe(true);
    expect(isColorValue("rgb(0, 0, 0)")).toBe(true);
    expect(isColorValue("24px")).toBe(false);
  });
});
