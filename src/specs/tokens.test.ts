import { describe, expect, it } from "vitest";
import { scopeName, tokenPath } from "./tokens";

describe("tokenPath", () => {
  it("turns a variable with a known prefix into its theme path", () => {
    expect(tokenPath("--ds-color-text-primary", ["--ds-"])).toBe("color.text.primary");
    expect(tokenPath("--theme-palette-background-paper", ["--ds-", "--theme-"])).toBe(
      "palette.background.paper",
    );
  });

  it("has no path for other variables, or when no prefix is configured", () => {
    expect(tokenPath("--brand-600", ["--ds-"])).toBe("");
    expect(tokenPath("--ds-color-text-primary", [])).toBe("");
  });
});

describe("scopeName", () => {
  it("names a theme by its last class or attribute value", () => {
    expect(scopeName(":root, .light")).toBe("light");
    expect(scopeName(".dark")).toBe("dark");
    expect(scopeName('[data-theme="midnight"]')).toBe("midnight");
  });

  it("calls the root scope the default one", () => {
    expect(scopeName(":root")).toBe("default");
  });
});
