import { describe, expect, it } from "vitest";
import { easingCurve, motionItems } from "./motion";

const style = (values: Partial<CSSStyleDeclaration>) =>
  ({ animationName: "none", ...values }) as CSSStyleDeclaration;

describe("easingCurve", () => {
  it("knows the CSS keywords", () => {
    expect(easingCurve("ease-in")).toEqual([0.42, 0, 1, 1]);
  });

  it("reads cubic-bezier numbers", () => {
    expect(easingCurve("cubic-bezier(0.4, 0, 0.2, 1)")).toEqual([0.4, 0, 0.2, 1]);
  });

  it("falls back to a straight line", () => {
    expect(easingCurve("steps(4)")).toEqual([0, 0, 1, 1]);
  });
});

describe("motionItems", () => {
  it("pairs each property with its duration and easing", () => {
    const items = motionItems(
      style({
        transitionProperty: "opacity, transform",
        transitionDuration: "0.2s, 0.3s",
        transitionTimingFunction: "ease-in, cubic-bezier(0.4, 0, 0.2, 1)",
      }),
    );
    expect(items.map((item) => [item.property, item.duration, item.easing])).toEqual([
      ["opacity", "0.2s", "ease-in"],
      ["transform", "0.3s", "cubic-bezier(0.4, 0, 0.2, 1)"],
    ]);
  });

  it("skips properties that do not move", () => {
    expect(
      motionItems(
        style({ transitionProperty: "all", transitionDuration: "0s", transitionTimingFunction: "ease" }),
      ),
    ).toEqual([]);
  });
});
