import { describe, expect, it } from "vitest";
import { compactSides, copiedLength, copiedSpacing, nudged, shownLength, sxSpacing } from "./units";

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

describe("copiedLength", () => {
  it("keeps the unit for CSS", () => {
    expect(copiedLength("24px", "px", 16, "css")).toBe("24px");
    expect(copiedLength("1px solid", "px", 16, "css")).toBe("1px solid");
  });

  it("copies bare numbers for sx", () => {
    expect(copiedLength("24px", "px", 16, "sx")).toBe("24");
  });

  it("copies rem in either format", () => {
    expect(copiedLength("24px", "rem", 16, "css")).toBe("1.5rem");
    expect(copiedLength("24px", "rem", 16, "sx")).toBe("1.5rem");
  });
});

describe("copiedSpacing", () => {
  it("writes a CSS declaration by default", () => {
    expect(copiedSpacing("padding", [12, 16, 12, 16], "px", 16, "css")).toBe("padding: 12px 16px");
    expect(copiedSpacing("margin", [24, 24, 24, 24], "rem", 16, "css")).toBe("margin: 1.5rem");
  });

  it("writes sx keys on request, in px only", () => {
    expect(copiedSpacing("padding", [12, 16, 12, 16], "px", 16, "sx")).toBe("py: 12, px: 16");
    expect(copiedSpacing("padding", [12, 16, 12, 16], "rem", 16, "sx")).toBe(
      "padding: 0.75rem 1rem",
    );
  });
});

describe("nudged", () => {
  it("moves the leading number by one step and keeps what follows it", () => {
    expect(nudged("12px", 1, 1)).toBe("13px");
    expect(nudged("12px", -1, 10)).toBe("2px");
    expect(nudged("-4px 8px", 1, 1)).toBe("-3px 8px");
    expect(nudged("400", 1, 100)).toBe("500");
  });

  it("keeps one decimal for a step of 0.1 and for a number that has decimals", () => {
    expect(nudged("23px", -1, 0.1)).toBe("22.9px");
    expect(nudged("1.5", 1, 1)).toBe("2.5");
  });

  it("answers null for text that does not start with a number", () => {
    expect(nudged("auto", 1, 1)).toBeNull();
    expect(nudged("", 1, 1)).toBeNull();
  });
});
