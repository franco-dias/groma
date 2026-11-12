import { describe, expect, it } from "vitest";
import { describeTrigger } from "./motion-triggers";

/** Shorthands as a browser expands them; any other property stands for itself. */
const LONGHANDS: Record<string, string[]> = {
  "border-color": ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"],
  background: ["background-color", "background-image"],
};
const expand = (property: string): string[] => LONGHANDS[property] ?? [property];

const changes = (entries: [state: string, properties: string[]][]): Map<string, string[]> => new Map(entries);

describe("describeTrigger", () => {
  it("names the states whose rules change the property, in the panel's order", () => {
    const byState = changes([
      [":focus-visible", ["border-top-color"]],
      [":hover", ["border-top-color", "border-right-color"]],
      [":active", ["transform"]],
    ]);
    expect(describeTrigger("border-color", { byState, expand })).toBe(
      "Animates on hover or on keyboard focus",
    );
  });

  it("matches a shorthand's longhands, and `all` against any change", () => {
    const byState = changes([[":hover", ["background-color"]]]);
    expect(describeTrigger("background", { byState, expand })).toBe("Animates on hover");
    expect(describeTrigger("all", { byState, expand })).toBe("Animates on hover");
  });

  it("says a change of the value starts it when no state changes the property", () => {
    const byState = changes([[":hover", ["color"]]]);
    expect(describeTrigger("opacity", { byState, expand })).toBe("Animates when its value changes");
  });

  it("words the states that are not an event", () => {
    const byState = changes([
      [":active", ["transform"]],
      [":checked", ["transform"]],
    ]);
    expect(describeTrigger("transform", { byState, expand })).toBe("Animates while pressed or when checked");
  });
});
