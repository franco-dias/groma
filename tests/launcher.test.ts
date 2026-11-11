import { beforeEach, describe, expect, it } from "vitest";
import { all, click, getElement, hover, inspector, page, pressEscape, reset, texts, ui } from "./helpers";

const dock = (): string =>
  getComputedStyle(document.querySelector("groma-inspector")!).getPropertyValue("--ins-dock");

beforeEach(() => {
  reset();
  page(`<div class="card" style="width: 200px; height: 100px; padding: 20px">Card</div>`);
});

describe("launcher pill", () => {
  it("is on the page from the start, and says how to inspect", () => {
    expect(texts(".launcher")[0]).toContain("Inspect");
    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(false);
  });

  it("locks inspect mode on, so hover and click work without Alt", () => {
    ui(".launcher")!.click();
    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(true);

    hover(getElement(".card"));
    expect(all(".overlay > .padding").length).toBeGreaterThan(0);
    click(getElement(".card"));
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("unlocks on Esc and on its ✕", () => {
    ui(".launcher")!.click();
    pressEscape();
    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(false);
    hover(getElement(".card"));
    expect(all(".overlay > div")).toHaveLength(0);

    ui(".launcher")!.click();
    ui(".launcher .off")!.click();
    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(false);
  });

  it("moves out of the panel's way", () => {
    inspector().pin(getElement(".card"));
    expect(dock()).toBe(`${ui(".panel")!.offsetWidth}px`);
    ui(".close")!.click();
    expect(dock()).toBe("0px");
  });
});
