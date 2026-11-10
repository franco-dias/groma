import { describe, expect, it } from "vitest";
import { compactSides, inUnit, sxValue } from "./units";

describe("compactSides", () => {
  it("uses the shortest CSS shorthand", () => {
    expect(compactSides(["24px", "24px", "24px", "24px"])).toBe("24px");
    expect(compactSides(["12px", "16px", "12px", "16px"])).toBe("12px 16px");
    expect(compactSides(["1px", "2px", "3px", "4px"])).toBe("1px 2px 3px 4px");
  });
});

describe("inUnit", () => {
  it("leaves px values alone", () => {
    expect(inUnit("24px", "px", 16)).toBe("24px");
  });

  it("converts every length to rem", () => {
    expect(inUnit("24px", "rem", 16)).toBe("1.5rem");
    expect(inUnit("12px 16px", "rem", 16)).toBe("0.75rem 1rem");
    expect(inUnit("-0.8px", "rem", 16)).toBe("-0.05rem");
  });
});

describe("sxValue", () => {
  it("copies a single length as a bare number", () => {
    expect(sxValue("gap", "32px", "px")).toBe("32");
    expect(sxValue("radius", "16px", "px")).toBe("16");
  });

  it("copies multi-value padding and margin as sx keys", () => {
    expect(sxValue("padding", "12px 16px", "px")).toBe("py: 12, px: 16");
    expect(sxValue("margin", "1px 2px 3px 4px", "px")).toBe("mt: 1, mr: 2, mb: 3, ml: 4");
  });

  it("copies everything else as shown", () => {
    expect(sxValue("radius", "50%", "px")).toBe("50%");
    expect(sxValue("radius", "4px 8px", "px")).toBe("4px 8px");
    expect(sxValue("gap", "2rem", "rem")).toBe("2rem");
  });
});
