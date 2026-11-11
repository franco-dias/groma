import { describe, expect, it } from "vitest";
import { isOneNumber, nudgeValue, scrubValue, stepFor, stepKindOf } from "./steps";

describe("nudgeValue", () => {
  it("moves the leading number by one step and keeps what follows it", () => {
    expect(nudgeValue("12px", { direction: 1, step: 1 })).toBe("13px");
    expect(nudgeValue("12px", { direction: -1, step: 10 })).toBe("2px");
    expect(nudgeValue("-4px 8px", { direction: 1, step: 1 })).toBe("-3px 8px");
    expect(nudgeValue("400", { direction: 1, step: 100 })).toBe("500");
  });

  it("keeps one decimal for a step of 0.1 and for a number that has decimals", () => {
    expect(nudgeValue("23px", { direction: -1, step: 0.1 })).toBe("22.9px");
    expect(nudgeValue("1.5", { direction: 1, step: 1 })).toBe("2.5");
  });

  it("answers null for text that does not start with a number", () => {
    expect(nudgeValue("auto", { direction: 1, step: 1 })).toBeUndefined();
    expect(nudgeValue("", { direction: 1, step: 1 })).toBeUndefined();
  });
});

describe("scrubValue", () => {
  it("moves the leading number by whole steps and keeps the rest", () => {
    expect(scrubValue("12px", { distance: 3, step: 1 })).toBe("15px");
    expect(scrubValue("12px", { distance: -20, step: 1 })).toBe("-8px");
    expect(scrubValue("12px", { distance: 3, step: 10 })).toBe("42px");
    expect(scrubValue("1.5rem", { distance: 2, step: 0.25 })).toBe("2rem");
  });

  it("keeps the decimals of a small step without float noise", () => {
    expect(scrubValue("12px", { distance: 3, step: 0.1 })).toBe("12.3px");
    expect(scrubValue("0.7", { distance: 1, step: 0.1 })).toBe("0.8");
    expect(scrubValue("1rem", { distance: 1, step: 0.0625 })).toBe("1.0625rem");
  });

  it("gives the start back for a distance of zero, which is how a drag returns", () => {
    expect(scrubValue("12px", { distance: 0, step: 1 })).toBe("12px");
    expect(scrubValue("12.5px", { distance: 0, step: 0.1 })).toBe("12.5px");
  });

  it("is null for text that does not start with a number", () => {
    expect(scrubValue("auto", { distance: 1, step: 1 })).toBeUndefined();
    expect(scrubValue("#fff", { distance: 1, step: 1 })).toBeUndefined();
  });
});

describe("isOneNumber", () => {
  it("accepts one number with or without a unit and nothing else", () => {
    for (const text of ["8px", "0.8", "-4px", "1.5rem", "2fr", "50%", "400"])
      expect(isOneNumber(text)).toBe(true);
    for (const text of [
      "12px 16px",
      "1 / 3",
      "span 2",
      "auto",
      "calc(1px + 2px)",
      "var(--x)",
      "#123456",
      "minmax(1px, 1fr)",
    ])
      expect(isOneNumber(text)).toBe(false);
  });
});

describe("stepFor", () => {
  it.each([
    { kind: "pixels", shiftKey: false, altKey: false, step: 1 },
    { kind: "pixels", shiftKey: true, altKey: false, step: 10 },
    { kind: "pixels", shiftKey: false, altKey: true, step: 0.1 },
    { kind: "rem", shiftKey: false, altKey: false, step: 0.25 },
    { kind: "rem", shiftKey: true, altKey: false, step: 1 },
    { kind: "rem", shiftKey: false, altKey: true, step: 0.0625 },
    { kind: "fraction", shiftKey: false, altKey: false, step: 0.01 },
    { kind: "fraction", shiftKey: true, altKey: false, step: 0.1 },
    { kind: "fraction", shiftKey: false, altKey: true, step: 0.001 },
  ] as const)("steps $kind by $step (shift $shiftKey, alt $altKey)", ({ kind, shiftKey, altKey, step }) => {
    expect(stepFor({ shiftKey, altKey }, kind)).toBe(step);
  });

  it("lets Shift win over Alt", () => {
    expect(stepFor({ shiftKey: true, altKey: true }, "pixels")).toBe(10);
  });
});

describe("stepKindOf", () => {
  it.each([
    { prop: "opacity", text: "0.8", kind: "fraction" },
    { prop: "fill-opacity", text: "1", kind: "fraction" },
    { prop: "opacity", text: "calc(0.5)", kind: "pixels" },
    { prop: "line-height", text: "1.5", kind: "pixels" },
    { prop: "z-index", text: "2", kind: "pixels" },
    { prop: "gap", text: "0.5rem", kind: "rem" },
    { prop: "padding", text: "1rem 2rem", kind: "rem" },
    { prop: "gap", text: "8px", kind: "pixels" },
    { prop: "width", text: "50%", kind: "pixels" },
  ])("reads $prop: $text as $kind", ({ prop, text, kind }) => {
    expect(stepKindOf(prop, text)).toBe(kind);
  });
});

describe("a fraction", () => {
  it("scrubs by hundredths without float noise", () => {
    expect(scrubValue("0.8", { distance: -5, step: 0.01, kind: "fraction" })).toBe("0.75");
    expect(scrubValue("0.8", { distance: 1, step: 0.001, kind: "fraction" })).toBe("0.801");
  });

  it("stays between 0 and 1", () => {
    expect(scrubValue("0.8", { distance: 100, step: 0.01, kind: "fraction" })).toBe("1");
    expect(scrubValue("0.8", { distance: -400, step: 0.1, kind: "fraction" })).toBe("0");
    expect(nudgeValue("1", { direction: 1, step: 0.01, kind: "fraction" })).toBe("1");
    expect(nudgeValue("0", { direction: -1, step: 0.01, kind: "fraction" })).toBe("0");
  });

  it("leaves a plain number free of the range", () => {
    expect(scrubValue("0.8", { distance: 100, step: 0.01 })).toBe("1.8");
  });
});

describe("rem", () => {
  it("nudges by a quarter and keeps the unit", () => {
    expect(nudgeValue("0.5rem", { direction: 1, step: 0.25, kind: "rem" })).toBe("0.75rem");
    expect(nudgeValue("1rem", { direction: -1, step: 0.0625, kind: "rem" })).toBe("0.9375rem");
  });
});
