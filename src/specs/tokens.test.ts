import { describe, expect, it } from "vitest";
import { themePath } from "./tokens";

describe("themePath", () => {
  it("turns an MUI variable into its theme path", () => {
    expect(themePath("--mui-palette-background-paper")).toBe("palette.background.paper");
    expect(themePath("--mui-palette-extra-elevation-outlined")).toBe(
      "palette.extra.elevation.outlined",
    );
  });

  it("has no path for other variables", () => {
    expect(themePath("--brand-600")).toBe("");
  });
});
