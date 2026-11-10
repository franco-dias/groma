import { describe, expect, it } from "vitest";
import { compactSides, shownLength, sxSpacing } from "./units";

describe("compactSides", () => {
  it("uses the shortest CSS shorthand", () => {
    expect(compactSides(["24px", "24px", "24px", "24px"])).toBe("24px");
    expect(compactSides(["12px", "16px", "12px", "16px"])).toBe("12px 16px");
    expect(compactSides(["1px", "2px", "3px", "4px"])).toBe("1px 2px 3px 4px");
  });
});

describe("shownLength", () => {
  it("shows bare numbers in px", () => {
    expect(shownLength("24px", "px", 16)).toBe("24");
    expect(shownLength("1px solid", "px", 16)).toBe("1 solid");
    expect(shownLength("-0.8px", "px", 16)).toBe("-0.8");
  });

  it("converts every length to rem", () => {
    expect(shownLength("24px", "rem", 16)).toBe("1.5rem");
    expect(shownLength("12px 16px", "rem", 16)).toBe("0.75rem 1rem");
  });

  it("leaves other values alone", () => {
    expect(shownLength("50%", "px", 16)).toBe("50%");
    expect(shownLength("flex", "rem", 16)).toBe("flex");
  });
});

describe("sxSpacing", () => {
  it("writes the shortest sx form", () => {
    expect(sxSpacing("padding", [24, 24, 24, 24])).toBe("p: 24");
    expect(sxSpacing("padding", [12, 16, 12, 16])).toBe("py: 12, px: 16");
    expect(sxSpacing("margin", [1, 2, 3, 4])).toBe("mt: 1, mr: 2, mb: 3, ml: 4");
  });
});
