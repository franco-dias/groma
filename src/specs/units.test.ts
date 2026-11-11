import { describe, expect, it } from "vitest";
import { compactSides, copiedLength, copiedSpacing, shownLength, sxSpacing } from "./units";

describe("compactSides", () => {
  it("uses the shortest CSS shorthand", () => {
    expect(compactSides(["24px", "24px", "24px", "24px"])).toBe("24px");
    expect(compactSides(["12px", "16px", "12px", "16px"])).toBe("12px 16px");
    expect(compactSides(["1px", "2px", "3px", "4px"])).toBe("1px 2px 3px 4px");
  });
});

describe("shownLength", () => {
  it("shows bare numbers in px", () => {
    expect(shownLength("24px", { unit: "px", rootFontSize: 16 })).toBe("24");
    expect(shownLength("1px solid", { unit: "px", rootFontSize: 16 })).toBe("1 solid");
    expect(shownLength("-0.8px", { unit: "px", rootFontSize: 16 })).toBe("-0.8");
  });

  it("converts every length to rem", () => {
    expect(shownLength("24px", { unit: "rem", rootFontSize: 16 })).toBe("1.5rem");
    expect(shownLength("12px 16px", { unit: "rem", rootFontSize: 16 })).toBe("0.75rem 1rem");
  });

  it("leaves other values alone", () => {
    expect(shownLength("50%", { unit: "px", rootFontSize: 16 })).toBe("50%");
    expect(shownLength("flex", { unit: "rem", rootFontSize: 16 })).toBe("flex");
  });
});

describe("sxSpacing", () => {
  it("writes the shortest sx form", () => {
    expect(sxSpacing("padding", [24, 24, 24, 24])).toBe("p: 24");
    expect(sxSpacing("padding", [12, 16, 12, 16])).toBe("py: 12, px: 16");
    expect(sxSpacing("margin", [1, 2, 3, 4])).toBe("mt: 1, mr: 2, mb: 3, ml: 4");
  });
});

describe("copiedLength", () => {
  it("keeps the unit for CSS", () => {
    expect(copiedLength("24px", { unit: "px", rootFontSize: 16, format: "css" })).toBe("24px");
    expect(copiedLength("1px solid", { unit: "px", rootFontSize: 16, format: "css" })).toBe("1px solid");
  });

  it("copies bare numbers for sx", () => {
    expect(copiedLength("24px", { unit: "px", rootFontSize: 16, format: "sx" })).toBe("24");
  });

  it("copies rem in either format", () => {
    expect(copiedLength("24px", { unit: "rem", rootFontSize: 16, format: "css" })).toBe("1.5rem");
    expect(copiedLength("24px", { unit: "rem", rootFontSize: 16, format: "sx" })).toBe("1.5rem");
  });
});

describe("copiedSpacing", () => {
  it("writes a CSS declaration by default", () => {
    expect(
      copiedSpacing(
        { name: "padding", sides: [12, 16, 12, 16] },
        { unit: "px", rootFontSize: 16, format: "css" },
      ),
    ).toBe("padding: 12px 16px");
    expect(
      copiedSpacing(
        { name: "margin", sides: [24, 24, 24, 24] },
        { unit: "rem", rootFontSize: 16, format: "css" },
      ),
    ).toBe("margin: 1.5rem");
  });

  it("writes sx keys on request, in px only", () => {
    expect(
      copiedSpacing(
        { name: "padding", sides: [12, 16, 12, 16] },
        { unit: "px", rootFontSize: 16, format: "sx" },
      ),
    ).toBe("py: 12, px: 16");
    expect(
      copiedSpacing(
        { name: "padding", sides: [12, 16, 12, 16] },
        { unit: "rem", rootFontSize: 16, format: "sx" },
      ),
    ).toBe("padding: 0.75rem 1rem");
  });
});
