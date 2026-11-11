import { describe, expect, it } from "vitest";
import { sizingDeclarations } from "./sizing";

const block = { isInFlex: false, isMainAxis: false, parentStretches: false };
const main = { isInFlex: true, isMainAxis: true, parentStretches: true };
const cross = { isInFlex: true, isMainAxis: false, parentStretches: true };

describe("sizingDeclarations", () => {
  it("sizes a child of a block with the property alone", () => {
    expect(sizingDeclarations({ axis: "width", intent: "fixed", size: "200px" }, block)).toEqual([
      ["width", "200px"],
    ]);
    expect(sizingDeclarations({ axis: "width", intent: "fill", size: "200px" }, block)).toEqual([
      ["width", "100%"],
    ]);
    expect(sizingDeclarations({ axis: "height", intent: "hug", size: "40px" }, block)).toEqual([
      ["height", "fit-content"],
    ]);
  });

  it("fills along a flex parent's direction by growing", () => {
    expect(sizingDeclarations({ axis: "width", intent: "fill", size: "200px" }, main)).toEqual([
      ["width", "auto"],
      ["flex-grow", "1"],
    ]);
  });

  // These two gained `flex-basis`: without it, an item with `flex: 1` (a
  // basis of 0) shrank to nothing when it stopped growing.
  it("hugs and fixes along it with a basis that lets the size count", () => {
    expect(sizingDeclarations({ axis: "width", intent: "hug", size: "200px" }, main)).toEqual([
      ["width", "auto"],
      ["flex-grow", "0"],
      ["flex-basis", "auto"],
    ]);
    // A fixed size must not grow past itself.
    expect(sizingDeclarations({ axis: "width", intent: "fixed", size: "200px" }, main)).toEqual([
      ["width", "200px"],
      ["flex-grow", "0"],
      ["flex-basis", "auto"],
    ]);
  });

  it("fills across a flex parent's direction by stretching", () => {
    expect(sizingDeclarations({ axis: "height", intent: "fill", size: "40px" }, cross)).toEqual([
      ["height", "auto"],
      ["align-self", "stretch"],
    ]);
    expect(sizingDeclarations({ axis: "height", intent: "fixed", size: "40px" }, cross)).toEqual([
      ["height", "40px"],
    ]);
  });

  it("hugs across it by not stretching, following a parent that already does not", () => {
    expect(sizingDeclarations({ axis: "height", intent: "hug", size: "40px" }, cross)[1]).toEqual([
      "align-self",
      "flex-start",
    ]);
    const centred = { ...cross, parentStretches: false };
    expect(sizingDeclarations({ axis: "height", intent: "hug", size: "40px" }, centred)[1]).toEqual([
      "align-self",
      "auto",
    ]);
  });
});

describe("sizingDeclarations in a grid", () => {
  const cell = { isInFlex: false, isInGrid: true, isMainAxis: false, parentStretches: true };

  it("fills the cell by stretching, on the axis's own property", () => {
    expect(sizingDeclarations({ axis: "width", intent: "fill", size: "200px" }, cell)).toEqual([
      ["width", "auto"],
      ["justify-self", "stretch"],
    ]);
    expect(sizingDeclarations({ axis: "height", intent: "fill", size: "40px" }, cell)).toEqual([
      ["height", "auto"],
      ["align-self", "stretch"],
    ]);
  });

  it("hugs by starting in the cell, following a grid that already does not stretch", () => {
    expect(sizingDeclarations({ axis: "width", intent: "hug", size: "200px" }, cell)[1]).toEqual([
      "justify-self",
      "start",
    ]);
    const centred = { ...cell, parentStretches: false };
    expect(sizingDeclarations({ axis: "width", intent: "hug", size: "200px" }, centred)[1]).toEqual([
      "justify-self",
      "auto",
    ]);
  });

  it("fixes a size with the property alone", () => {
    expect(sizingDeclarations({ axis: "width", intent: "fixed", size: "200px" }, cell)).toEqual([
      ["width", "200px"],
    ]);
  });
});
