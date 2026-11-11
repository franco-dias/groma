import { beforeEach, describe, expect, it } from "vitest";
import { el, frames, holdAlt, hover, inspector, page, reset, ui } from "./helpers";

/** Whatever is on top at a point, as the page's document sees it. */
const topAt = (x: number, y: number): Element | null => document.elementFromPoint(x, y);

beforeEach(() => {
  reset();
  // A page element fixed over the whole window, at the highest z-index there is,
  // added after the inspector, so it also comes later in the document.
  page(`
    <div class="cover" style="position: fixed; inset: 0; z-index: 2147483647; background: rgba(255, 0, 0, 0.3)"></div>
    <div class="card" style="width: 200px; height: 100px; margin: 40px">Card</div>
  `);
});

describe("layering above the page", () => {
  it("keeps the panel above a page element at the highest z-index", () => {
    inspector().pin(el(".card"));
    const panel = ui(".panel")!.getBoundingClientRect();
    expect(topAt(panel.left + 50, panel.top + 50)?.localName).toBe("groma-inspector");
  });

  it("keeps the launcher above it too", () => {
    const pill = ui(".launcher")!.getBoundingClientRect();
    expect(topAt(pill.left + pill.width / 2, pill.top + pill.height / 2)?.localName).toBe(
      "groma-inspector",
    );
  });

  it("puts everything it draws in the browser's top layer, outlines included", () => {
    holdAlt();
    hover(el(".card"));
    expect(ui(".overlay > div")!.getBoundingClientRect().width).toBeGreaterThan(0);
    // Outlines ignore the pointer, so the check is on the layer they all share.
    expect(document.querySelector("groma-inspector")!.matches(":popover-open")).toBe(true);
  });

  it("comes back, in the top layer, when the page throws it away with its old content", async () => {
    inspector().pin(el(".card"));
    const host = document.querySelector("groma-inspector")!;
    // What a page does when it replaces its body or its whole document.
    host.remove();
    await frames();
    expect(host.isConnected).toBe(true);
    expect(host.matches(":popover-open")).toBe(true);
    expect(ui(".panel")!.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(ui(".launcher")!.getBoundingClientRect().width).toBeGreaterThan(0);
  });
});
