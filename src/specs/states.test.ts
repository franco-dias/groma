import { describe, expect, it } from "vitest";
import { statesIn, withoutStates } from "./states";

describe("statesIn", () => {
  it.each([
    { selector: ".button:hover", states: [":hover"] },
    { selector: ".card:hover .button", states: [":hover"] },
    { selector: "a:focus", states: [":focus"] },
    { selector: "a:focus-visible", states: [":focus-visible"] },
    { selector: ".field:focus-within", states: [":focus-within"] },
    { selector: "button:active", states: [":active"] },
    { selector: "input:disabled", states: [":disabled"] },
    { selector: "input:checked + label", states: [":checked"] },
  ])("finds $states in $selector", ({ selector, states }) => {
    expect(statesIn(selector)).toEqual(states);
  });

  it("finds two different states, in the order they are written", () => {
    expect(statesIn("a:hover:focus")).toEqual([":hover", ":focus"]);
    expect(statesIn("a:focus:hover")).toEqual([":focus", ":hover"]);
  });

  it("finds a state once however often it is written", () => {
    expect(statesIn("a:hover b:hover")).toEqual([":hover"]);
  });

  it("does not take :focus for :focus-visible or :focus-within", () => {
    expect(statesIn("a:focus-visible")).not.toContain(":focus");
    expect(statesIn("a:focus-within")).not.toContain(":focus");
  });

  it("finds a state inside :not(), as text", () => {
    expect(statesIn(".a:not(:hover)")).toEqual([":hover"]);
  });

  it("leaves a pseudo-element and its own state alone", () => {
    expect(statesIn(".a::before")).toEqual([]);
    expect(statesIn(".a:hover::before")).toEqual([":hover"]);
  });

  it("does not read a state out of an attribute selector or a string", () => {
    expect(statesIn('a[href*=":hover"]')).toEqual([]);
    expect(statesIn("a[data-x='b:focus'][title=\"c:active\"]")).toEqual([]);
    expect(statesIn('a[href*=":hover"]:focus')).toEqual([":focus"]);
  });

  it("finds none in a selector with no state", () => {
    expect(statesIn(".card .button:first-child")).toEqual([]);
    expect(statesIn(":root")).toEqual([]);
  });
});

describe("withoutStates", () => {
  it.each([
    { selector: ".button:hover", expected: ".button" },
    { selector: ".card:hover .button", expected: ".card .button" },
    { selector: "a:hover:focus", expected: "a" },
    { selector: "input:checked + label", expected: "input + label" },
    { selector: ".a:hover::before", expected: ".a::before" },
    { selector: "a:focus-visible", expected: "a" },
  ])("turns $selector into $expected", ({ selector, expected }) => {
    expect(withoutStates(selector)).toBe(expected);
  });

  it("leaves :not() empty around a state, which no element matches", () => {
    expect(withoutStates(".a:not(:hover)")).toBe(".a:not()");
  });

  it("keeps an attribute selector that has a colon", () => {
    expect(withoutStates('a[href*=":hover"]:focus')).toBe('a[href*=":hover"]');
  });

  it("leaves a selector with no state as it is", () => {
    expect(withoutStates(".card > .button")).toBe(".card > .button");
  });
});
