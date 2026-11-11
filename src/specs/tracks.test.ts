import { describe, expect, it } from "vitest";
import { countTracks, formatTracks, parseTracks, trackIntent, trackSize, tracksMatch } from "./tracks";

describe("parseTracks", () => {
  it("gives one size per track", () => {
    expect(parseTracks("200px 1fr auto")).toEqual(["200px", "1fr", "auto"]);
  });

  it("keeps a function with spaces as one track", () => {
    expect(parseTracks("minmax(0, 1fr) calc(100% - 20px)")).toEqual(["minmax(0, 1fr)", "calc(100% - 20px)"]);
  });

  it("writes out a repeat with a number of times", () => {
    expect(parseTracks("repeat(3, 1fr)")).toEqual(["1fr", "1fr", "1fr"]);
    expect(parseTracks("200px repeat(2, 1fr 2fr)")).toEqual(["200px", "1fr", "2fr", "1fr", "2fr"]);
    expect(parseTracks("repeat(2, minmax(0, 1fr))")).toEqual(["minmax(0, 1fr)", "minmax(0, 1fr)"]);
  });

  it("turns down a list that is not one size per track", () => {
    expect(parseTracks("")).toBeNull();
    expect(parseTracks("none")).toBeNull();
    expect(parseTracks("repeat(auto-fill, minmax(200px, 1fr))")).toBeNull();
    expect(parseTracks("[full-start] 1fr [full-end]")).toBeNull();
    expect(parseTracks("subgrid")).toBeNull();
    expect(parseTracks("var(--columns)")).toBeNull();
    expect(parseTracks("inherit")).toBeNull();
  });
});

describe("formatTracks", () => {
  it("writes equal tracks as a repeat, and others as a list", () => {
    expect(formatTracks(["1fr", "1fr", "1fr"])).toBe("repeat(3, 1fr)");
    expect(formatTracks(["1fr", "2fr"])).toBe("1fr 2fr");
    expect(formatTracks(["1fr"])).toBe("1fr");
  });

  it("gives back what the browser reads as the same list", () => {
    const list = "200px repeat(2, 1fr)";
    expect(parseTracks(formatTracks(parseTracks(list)!))).toEqual(parseTracks(list));
  });
});

describe("countTracks", () => {
  it("counts the tracks the browser laid out, not the names of their lines", () => {
    expect(countTracks("240px 240px 240px")).toBe(3);
    expect(countTracks("[a] 100px [b c] 50px [d]")).toBe(2);
    expect(countTracks("none")).toBe(0);
  });
});

describe("a track's sizing intent", () => {
  it("reads a share of the space as fill, auto and content sizes as hug, the rest as fixed", () => {
    expect(trackIntent("1fr")).toBe("fill");
    expect(trackIntent("minmax(0, 2fr)")).toBe("fill");
    expect(trackIntent("auto")).toBe("hug");
    expect(trackIntent("max-content")).toBe("hug");
    expect(trackIntent("240px")).toBe("fixed");
    expect(trackIntent("25%")).toBe("fixed");
  });

  it("writes what it reads back as the same intent", () => {
    expect(trackSize("fill", "240px")).toBe("1fr");
    expect(trackSize("hug", "240px")).toBe("auto");
    expect(trackSize("fixed", "240px")).toBe("240px");
  });
});

describe("tracksMatch", () => {
  it("takes a list with the number of tracks the browser laid out", () => {
    expect(tracksMatch(["1fr", "1fr"], ["100px", "100px"], false)).toBe(true);
    // The declaration of another breakpoint.
    expect(tracksMatch(["1fr"], ["100px", "100px"], false)).toBe(false);
  });

  it("lets a grid add rows of its own", () => {
    expect(tracksMatch(["40px"], ["40px", "80px"], true)).toBe(true);
    expect(tracksMatch(["40px", "1fr", "1fr"], ["40px", "80px"], true)).toBe(false);
  });

  it("takes a pixel size that layout snapped to a fraction of a pixel", () => {
    expect(tracksMatch(["102.656px", "1fr"], ["102.641px", "200px"], false)).toBe(true);
  });

  it("turns down a pixel size the browser did not use", () => {
    expect(tracksMatch(["200px", "1fr"], ["120px", "80px"], false)).toBe(false);
  });
});
