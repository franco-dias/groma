import { describe, expect, it } from "vitest";
import { isShadowValue, parseFilters, parseShadows } from "./effects";

describe("parseShadows", () => {
  it("reads one shadow whatever the order of its parts", () => {
    const colorFirst = parseShadows("rgba(0, 0, 0, 0.2) 0px 4px 12px 0px");
    const colorLast = parseShadows("0px 4px 12px 0px rgba(0, 0, 0, 0.2)");
    expect(colorFirst).toEqual(colorLast);
    expect(colorFirst).toEqual([
      {
        inset: false,
        x: "0px",
        y: "4px",
        blur: "12px",
        spread: "0px",
        color: "rgba(0, 0, 0, 0.2)",
        text: "0px 4px 12px 0px rgba(0, 0, 0, 0.2)",
      },
    ]);
  });

  it("keeps several shadows in order, split only at the top-level commas", () => {
    const shadows = parseShadows("rgb(0, 0, 0) 0px 1px 2px 0px, rgba(1, 2, 3, 0.5) 0px 8px 24px 4px");
    expect(shadows.map(({ y, color }) => [y, color])).toEqual([
      ["1px", "rgb(0, 0, 0)"],
      ["8px", "rgba(1, 2, 3, 0.5)"],
    ]);
  });

  it("reads inset wherever it is written", () => {
    expect(parseShadows("inset 0px 2px 4px #000")[0].inset).toBe(true);
    expect(parseShadows("0px 2px 4px #000 inset")[0].inset).toBe(true);
    expect(parseShadows("0px 2px 4px #000")[0].inset).toBe(false);
  });

  it("writes an inset shadow's text with inset first", () => {
    expect(parseShadows("#000 0px 2px 4px inset")[0].text).toBe("inset 0px 2px 4px #000");
  });

  it("reads a nested calc() as one length", () => {
    const [shadow] = parseShadows("calc(1px + 2px) calc(var(--a) * 2) 4px rgb(0 0 0 / 50%)");
    expect([shadow.x, shadow.y, shadow.blur]).toEqual(["calc(1px + 2px)", "calc(var(--a) * 2)", "4px"]);
  });

  it("gives a shadow with two lengths a blur of zero and no spread", () => {
    const [shadow] = parseShadows("2px 3px red");
    expect([shadow.blur, shadow.spread]).toEqual(["0px", undefined]);
  });

  it("reads a text shadow, which has no spread", () => {
    const [shadow] = parseShadows("rgba(0, 0, 0, 0.5) 1px 1px 2px");
    expect(shadow.spread).toBeUndefined();
  });

  it.each([
    { value: "none" },
    { value: "" },
    { value: "16px" },
    { value: "red" },
    { value: "1px 2px 3px 4px 5px red" },
    { value: "1px 2px red blue" },
    { value: "ease-in-out" },
    { value: "0 4px 12px rgb(0 0 0 / 0.2), nonsense" },
  ])("finds no shadow in '$value'", ({ value }) => {
    expect(parseShadows(value)).toEqual([]);
  });
});

describe("parseFilters", () => {
  it("lists each function with its argument", () => {
    expect(parseFilters("blur(4px) brightness(1.1)")).toEqual([
      { name: "blur", argument: "4px", text: "blur(4px)" },
      { name: "brightness", argument: "1.1", text: "brightness(1.1)" },
    ]);
  });

  it("keeps the spaces of an argument", () => {
    expect(parseFilters("drop-shadow(rgb(0, 0, 0) 0px 2px 4px)")[0].argument).toBe(
      "rgb(0, 0, 0) 0px 2px 4px",
    );
  });

  it("finds nothing in none", () => {
    expect(parseFilters("none")).toEqual([]);
  });
});

describe("isShadowValue", () => {
  it.each([
    "0 4px 12px rgb(0 0 0 / 0.2)",
    "0px 1px 2px #000, 0px 8px 24px rgba(0, 0, 0, 0.3)",
    "inset 0 2px 4px red",
  ])("counts '%s' as shadows", (value) => {
    expect(isShadowValue(value)).toBe(true);
  });

  it.each([
    "none",
    "16px",
    "12px 16px",
    "#fff",
    "rgb(0, 0, 0)",
    "150ms",
    "ease",
    "all 150ms ease",
    "0 4px 12px",
    "0.2s 0.3s red",
    "",
  ])("does not count '%s' as shadows", (value) => {
    expect(isShadowValue(value)).toBe(false);
  });
});
