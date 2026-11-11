import { describe, expect, it } from "vitest";
import { compareSpecs } from "./compare-specs";
import type { SpecSection } from "./spec";

const section = (label: string, ...rows: [name: string, value: string][]): SpecSection => ({
  label,
  rows: rows.map(([name, value]) => ({ name, value })),
});

describe("compareSpecs", () => {
  it("lists the specs whose values differ and counts the same ones", () => {
    const base = [section("Shape", ["radius", "8px"], ["opacity", "1"])];
    const other = [section("Shape", ["radius", "4px"], ["opacity", "1"])];

    const { differences, identical } = compareSpecs(base, other);

    expect(differences.map((difference) => difference.name)).toEqual(["radius"]);
    expect(differences[0].before?.value).toBe("8px");
    expect(differences[0].after?.value).toBe("4px");
    expect(identical).toBe(1);
  });

  it("counts a spec that only one element has as a difference", () => {
    const { differences } = compareSpecs([section("Text", ["color", "red"])], [section("Text")]);

    expect(differences).toHaveLength(1);
    expect(differences[0].after).toBeUndefined();
  });

  it("never compares where the elements are", () => {
    const base = [section("Layout", ["on board", "x 0 · y 0"])];
    const other = [section("Layout", ["on board", "x 8 · y 8"])];

    expect(compareSpecs(base, other)).toEqual({ differences: [], identical: 0 });
  });

  it("skips specs that neither element has a value for", () => {
    const { differences, identical } = compareSpecs(
      [section("Shape", ["shadow", ""])],
      [section("Shape", ["shadow", ""])],
    );

    expect(differences).toEqual([]);
    expect(identical).toBe(0);
  });
});
