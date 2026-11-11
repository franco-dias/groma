import { describe, expect, it } from "vitest";
import { findTrackLines } from "./track-lines";

const axis = (partial: Partial<Parameters<typeof findTrackLines>[0]>) =>
  findTrackLines({ sizes: [100, 100, 100], gap: 0, available: 300, distribution: "normal", ...partial });

describe("findTrackLines", () => {
  it("puts a line at each edge: one more than there are tracks", () => {
    expect(axis({}).lines).toEqual([0, 100, 200, 300]);
  });

  it("puts a line in the middle of each gap and bands the gaps", () => {
    const { lines, gaps } = axis({ gap: 10, available: 320 });
    expect(lines).toEqual([0, 105, 215, 320]);
    expect(gaps).toEqual([
      { start: 100, end: 110 },
      { start: 210, end: 220 },
    ]);
  });

  it("has no band for no gap", () => {
    expect(axis({}).gaps).toEqual([]);
  });

  it("ends at the last track when the tracks do not fill the container", () => {
    expect(axis({ sizes: [50, 50], available: 300 }).lines).toEqual([0, 50, 100]);
  });

  it.each([
    { distribution: "start", lines: [0, 50, 100] },
    { distribution: "flex-start", lines: [0, 50, 100] },
    { distribution: "stretch", lines: [0, 50, 100] },
    { distribution: "end", lines: [200, 250, 300] },
    { distribution: "flex-end", lines: [200, 250, 300] },
    { distribution: "center", lines: [100, 150, 200] },
    { distribution: "unsafe center", lines: [100, 150, 200] },
  ])("places $distribution", ({ distribution, lines }) => {
    expect(axis({ sizes: [50, 50], available: 300, distribution }).lines).toEqual(lines);
  });

  it("shares the free space between the tracks for space-between", () => {
    const { lines, gaps } = axis({ sizes: [50, 50, 50], available: 250, distribution: "space-between" });
    expect(lines).toEqual([0, 75, 175, 250]);
    expect(gaps).toEqual([
      { start: 50, end: 100 },
      { start: 150, end: 200 },
    ]);
  });

  it("puts half the share before the first track for space-around", () => {
    const { lines } = axis({ sizes: [50, 50], available: 200, distribution: "space-around" });
    // free 100, 50 each: 25 | 50 | 50 | 50 | 50 | 25 → tracks at 25-75 and 125-175.
    expect(lines).toEqual([25, 100, 175]);
  });

  it("puts the same share everywhere for space-evenly", () => {
    const { lines } = axis({ sizes: [50, 50], available: 200, distribution: "space-evenly" });
    // free 100 in 3 shares: tracks at 33.3-83.3 and 116.7-166.7.
    expect(lines[0]).toBeCloseTo(33.333, 2);
    expect(lines[2]).toBeCloseTo(166.667, 2);
  });

  it("keeps a safe alignment at the start when the tracks overflow", () => {
    expect(axis({ sizes: [200, 200], available: 300, distribution: "safe center" }).lines).toEqual([
      0, 200, 400,
    ]);
    expect(axis({ sizes: [200, 200], available: 300, distribution: "center" }).lines).toEqual([
      -50, 150, 350,
    ]);
  });

  it("has no lines for no tracks", () => {
    expect(axis({ sizes: [] }).lines).toEqual([]);
  });

  it("draws one track as two lines", () => {
    expect(axis({ sizes: [300] }).lines).toEqual([0, 300]);
  });
});
