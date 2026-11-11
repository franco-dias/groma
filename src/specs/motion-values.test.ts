import { describe, expect, it } from "vitest";
import {
  easingKey,
  isEasingValue,
  isTimeValue,
  isTransitionValue,
  timeInMilliseconds,
  transitionKey,
} from "./motion-values";

describe("isTimeValue", () => {
  it.each(["150ms", "0.2s", ".2s", "1s", "-50ms", " 150ms "])("counts %s as a time", (value) => {
    expect(isTimeValue(value)).toBe(true);
  });

  it.each(["16px", "150", "0", "ease", "all 150ms", "150ms 50ms", "#fff", "none", "calc(1s + 1ms)", ""])(
    "does not count '%s' as a time",
    (value) => {
      expect(isTimeValue(value)).toBe(false);
    },
  );
});

describe("timeInMilliseconds", () => {
  it("reads seconds and milliseconds", () => {
    expect(timeInMilliseconds("0.15s")).toBe(150);
    expect(timeInMilliseconds("150ms")).toBe(150);
    expect(timeInMilliseconds("16px")).toBeUndefined();
  });
});

describe("isEasingValue", () => {
  it.each([
    "ease",
    "ease-in",
    "ease-out",
    "ease-in-out",
    "linear",
    "step-start",
    "step-end",
    "cubic-bezier(0, 0, 0.2, 1)",
    "steps(4, end)",
    "linear(0, 0.25 50%, 1)",
    "EASE",
  ])("counts %s as a timing function", (value) => {
    expect(isEasingValue(value)).toBe(true);
  });

  it.each(["150ms", "16px", "none", "linear-gradient(red, blue)", "all 150ms ease", "easy", "#000", ""])(
    "does not count '%s' as a timing function",
    (value) => {
      expect(isEasingValue(value)).toBe(false);
    },
  );
});

describe("isTransitionValue", () => {
  it.each(["all 150ms ease", "opacity 0.2s", "opacity 0.2s ease-in, transform 300ms", "150ms ease"])(
    "counts '%s' as a whole transition",
    (value) => {
      expect(isTransitionValue(value)).toBe(true);
    },
  );

  it.each(["150ms", "0.2s", "ease", "none", "150ms 50ms", "opacity", "16px", "opacity 0.2s, transform", ""])(
    "does not count '%s' as a whole transition",
    (value) => {
      expect(isTransitionValue(value)).toBe(false);
    },
  );
});

describe("easingKey", () => {
  it("gives a keyword and its cubic-bezier the same key", () => {
    expect(easingKey("ease")).toBe(easingKey("cubic-bezier(0.25, 0.1, 0.25, 1)"));
    expect(easingKey("EASE-IN")).toBe(easingKey("cubic-bezier(0.42,0,1,1)"));
  });

  it("tells different timing functions apart", () => {
    expect(easingKey("ease")).not.toBe(easingKey("ease-in"));
    expect(easingKey("steps(4)")).toBe("steps(4)");
  });

  it("is not fooled by the name of an object's own property", () => {
    expect(easingKey("constructor")).toBe("constructor");
  });
});

describe("transitionKey", () => {
  it("is the same for a token and what the browser computed from it", () => {
    expect(transitionKey("all 150ms ease")).toBe(transitionKey("all 0.15s ease 0s"));
    expect(transitionKey("opacity 150ms")).toBe(transitionKey("opacity 0.15s ease 0s"));
  });

  it("tells a different delay, property or timing function apart", () => {
    expect(transitionKey("all 150ms ease 50ms")).not.toBe(transitionKey("all 150ms ease"));
    expect(transitionKey("opacity 150ms")).not.toBe(transitionKey("all 150ms"));
    expect(transitionKey("all 150ms ease-in")).not.toBe(transitionKey("all 150ms"));
  });

  it("keeps a list in order", () => {
    expect(transitionKey("opacity 1s, transform 2s")).not.toBe(transitionKey("transform 2s, opacity 1s"));
  });
});
