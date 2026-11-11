/** Which specs differ between two elements, for the Specs tab's compare block. */
import type { Spec, SpecSection } from "./spec";

export type SpecDifference = {
  name: string;
  /** Undefined when that element has no such spec. */
  before?: Spec;
  after?: Spec;
};

export type SpecComparison = { differences: SpecDifference[]; identical: number };

/** The specs of the sections by "Section/name". */
function flattenSpecs(sections: SpecSection[]): Map<string, Spec> {
  return new Map<string, Spec>(
    sections.flatMap((section) =>
      section.rows.map((spec): [string, Spec] => [`${section.label}/${spec.name}`, spec]),
    ),
  );
}

/** The specs that differ between a baseline element's sections and another's. */
export function compareSpecs(base: SpecSection[], other: SpecSection[]): SpecComparison {
  const before = flattenSpecs(base);
  const after = flattenSpecs(other);
  const keys = [...new Set([...before.keys(), ...after.keys()])]
    // Two elements are never in the same place.
    .filter((key) => !key.endsWith("/on board"))
    .filter((key) => before.get(key)?.value || after.get(key)?.value);
  const differs = (key: string): boolean => (before.get(key)?.value ?? "") !== (after.get(key)?.value ?? "");
  const differences = keys.filter(differs).map((key) => ({
    name: key.split("/")[1],
    before: before.get(key),
    after: after.get(key),
  }));
  return { differences, identical: keys.length - differences.length };
}
