import { describe, expect, it } from "vitest";
import { clampSize, fitView, MAX_ZOOM, MIN_ZOOM, zoomAt } from "./view";

describe("fitView", () => {
  it("shows a frame that fits at its real size, centred below the toolbar", () => {
    const view = fitView({ width: 400, height: 300 }, { width: 1000, height: 800 });
    expect(view).toEqual({ x: 300, y: 80, zoom: 1 });
  });

  it("zooms out a frame that is too wide, and never in", () => {
    const view = fitView({ width: 1872, height: 300 }, { width: 1000, height: 800 });
    expect(view.zoom).toBe(0.5);
    expect(view.x).toBe(32);
  });

  it("zooms out a frame that is too tall", () => {
    const view = fitView({ width: 400, height: 1376 }, { width: 1000, height: 800 });
    expect(view.zoom).toBe(0.5);
    expect(view.x).toBe(400);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the pointer where it is", () => {
    const view = { x: 100, y: 50, zoom: 1 };
    const pagePointBefore = { x: (300 - view.x) / view.zoom, y: (250 - view.y) / view.zoom };
    const zoomed = zoomAt(view, 2, 300, 250);
    expect(zoomed.zoom).toBe(2);
    expect((300 - zoomed.x) / zoomed.zoom).toBe(pagePointBefore.x);
    expect((250 - zoomed.y) / zoomed.zoom).toBe(pagePointBefore.y);
  });

  it("stops at the zoom limits", () => {
    const view = { x: 0, y: 0, zoom: 1 };
    expect(zoomAt(view, 100, 0, 0).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(view, 0, 0, 0).zoom).toBe(MIN_ZOOM);
  });
});

describe("clampSize", () => {
  it("keeps a frame between the smallest and the largest size, in whole pixels", () => {
    expect(clampSize({ width: 10, height: 10 })).toEqual({ width: 240, height: 160 });
    expect(clampSize({ width: 99999, height: 99999 })).toEqual({ width: 3840, height: 2400 });
    expect(clampSize({ width: 375.4, height: 812.6 })).toEqual({ width: 375, height: 813 });
  });
});
