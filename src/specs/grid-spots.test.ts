import { describe, expect, it } from "vitest";
import { findSpots } from "./grid-spots";
import { findTrackLines } from "./track-lines";

const lines = (sizes: number[], gap: number) =>
  findTrackLines({
    sizes,
    gap,
    available: sizes.reduce((total, size) => total + size, 0) + gap * (sizes.length - 1),
    distribution: "normal",
  });

describe("findSpots", () => {
  it("makes a vertical line for each column line and a horizontal one for each row line", () => {
    const spots = findSpots({
      columns: lines([100, 100], 0),
      rows: lines([40], 0),
      availableAcross: 200,
      availableDown: 40,
    });
    expect(spots.filter(({ className }) => className === "grid-line is-column")).toEqual([
      { className: "grid-line is-column", left: 0, top: 0, width: 0, height: 40 },
      { className: "grid-line is-column", left: 100, top: 0, width: 0, height: 40 },
      { className: "grid-line is-column", left: 200, top: 0, width: 0, height: 40 },
    ]);
    expect(spots.filter(({ className }) => className === "grid-line is-row")).toEqual([
      { className: "grid-line is-row", left: 0, top: 0, width: 200, height: 0 },
      { className: "grid-line is-row", left: 0, top: 40, width: 200, height: 0 },
    ]);
  });

  it("makes a band for each gap, as wide as the gap and as long as the grid", () => {
    const spots = findSpots({
      columns: lines([100, 100], 10),
      rows: lines([40], 0),
      availableAcross: 210,
      availableDown: 40,
    });
    expect(spots.filter(({ className }) => className === "grid-gap")).toEqual([
      { className: "grid-gap", left: 100, top: 0, width: 10, height: 40 },
    ]);
  });

  it("covers the whole content box on an axis that has no tracks", () => {
    const spots = findSpots({
      columns: lines([100], 0),
      rows: lines([], 0),
      availableAcross: 100,
      availableDown: 60,
    });
    expect(
      spots.filter(({ className }) => className.includes("is-column")).map(({ height }) => height),
    ).toEqual([60, 60]);
  });
});
