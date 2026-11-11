import { describe, expect, it } from "vitest";
import { replaceEntry } from "./motion-entries";

describe("replaceEntry", () => {
  it("changes one entry and keeps the others", () => {
    expect(replaceEntry(["0.2s", "0.3s"], { index: 1, value: "150ms", count: 2 })).toBe("0.2s, 150ms");
  });

  it("repeats a list the page gave short, as CSS does, up to the number of transitions", () => {
    expect(replaceEntry(["0.2s"], { index: 2, value: "1s", count: 3 })).toBe("0.2s, 0.2s, 1s");
    expect(replaceEntry(["0.2s", "0.3s"], { index: 0, value: "1s", count: 3 })).toBe("1s, 0.3s, 0.2s");
  });

  it("keeps an entry that holds commas whole", () => {
    expect(
      replaceEntry(["ease", "cubic-bezier(0, 0, 0.2, 1)"], { index: 0, value: "linear", count: 2 }),
    ).toBe("linear, cubic-bezier(0, 0, 0.2, 1)");
  });

  it("makes the entry from nothing when the list is empty", () => {
    expect(replaceEntry([], { index: 0, value: "1s", count: 1 })).toBe("1s");
  });
});
