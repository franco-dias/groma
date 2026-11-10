import { beforeEach, describe, expect, it } from "vitest";
import { el, frames, inspector, openTab, page, pressKey, reset, texts, ui } from "./helpers";

const shown = (selector: string): boolean => getComputedStyle(ui(selector)!).display !== "none";
const savedLayout = () => JSON.parse(localStorage.getItem("__live_inspector_panel") ?? "{}");

function dragResizeHandle(by: number): void {
  const handle = ui(".resize")!;
  const startX = ui(".panel")!.getBoundingClientRect().left;
  handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: startX }));
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: startX + by }));
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
}

beforeEach(() => {
  reset();
  page(`<div class="card" style="width: 200px; height: 100px; margin: 40px">Card</div>`);
});

describe("side panel", () => {
  it("opens on the Specs tab when an element is pinned", () => {
    inspector().pin(el(".card"));
    expect(shown(".panel")).toBe(true);
    expect(ui(".panel")!.dataset.tab).toBe("specs");
    expect(shown('.body[data-for="specs"]')).toBe(true);
    expect(shown('.body[data-for="css"]')).toBe(false);
  });

  it("switches tabs and remembers the last one", () => {
    inspector().pin(el(".card"));
    openTab("layers");
    expect(shown('.body[data-for="layers"]')).toBe(true);
    expect(shown('.body[data-for="specs"]')).toBe(false);
    expect(shown(".action-bar")).toBe(false);
    expect(savedLayout().tab).toBe("layers");
  });

  it("hides the Changes tab on a page that is not a Claude Design export", () => {
    inspector().pin(el(".card"));
    expect(ui('.tab[data-tab="changes"]')!.hidden).toBe(true);
  });

  it("collapses to a rail that names the element, and expands again", () => {
    inspector().pin(el(".card"));
    ui(".collapse")!.click();
    expect(ui(".panel")!.offsetWidth).toBe(28);
    expect(texts(".rail .name")).toEqual(["Inspect · div"]);

    ui(".rail")!.click();
    expect(ui(".panel")!.offsetWidth).toBe(380);
  });

  it("expands when another element is pinned", () => {
    inspector().pin(el(".card"));
    ui(".collapse")!.click();
    inspector().pin(document.body.querySelector("#fixture")!);
    expect(ui(".panel")!.offsetWidth).toBe(380);
  });

  it("resizes by its left edge, between 320 and 560 px, and remembers the width", () => {
    inspector().pin(el(".card"));
    dragResizeHandle(-100);
    expect(ui(".panel")!.offsetWidth).toBe(480);
    expect(savedLayout().width).toBe("480px");

    dragResizeHandle(-500);
    expect(ui(".panel")!.offsetWidth).toBe(560);
    dragResizeHandle(900);
    expect(ui(".panel")!.offsetWidth).toBe(320);
    ui(".panel")!.style.width = "";
  });

  it("closes: the element is unpinned and its outline goes away", async () => {
    inspector().pin(el(".card"));
    await frames();
    expect(shown(".outline-pinned")).toBe(true);

    ui(".close")!.click();
    await frames();
    expect(inspector().pinnedElement()).toBeNull();
    expect(shown(".panel")).toBe(false);
    expect(shown(".outline-pinned")).toBe(false);
  });

  it("keeps keys typed in the panel away from the page's shortcuts", () => {
    let pageKeys = 0;
    const count = () => pageKeys++;
    document.addEventListener("keydown", count);
    inspector().pin(el(".card"));
    openTab("css");
    pressKey(ui(".search input")!, "ArrowDown");
    document.removeEventListener("keydown", count);
    expect(pageKeys).toBe(0);
  });
});

describe("pinned outline", () => {
  it("sits on the element with a tag that names it", async () => {
    inspector().pin(el(".card"));
    await frames();
    const outline = ui(".outline-pinned")!.getBoundingClientRect();
    const card = el(".card").getBoundingClientRect();
    expect([outline.left, outline.top, outline.width, outline.height]).toEqual([
      card.left,
      card.top,
      card.width,
      card.height,
    ]);
    expect(texts(".pin-tag")).toEqual(["div200 × 100"]);
  });

  it("follows the element when the page moves it", async () => {
    inspector().pin(el(".card"));
    el(".card").style.marginLeft = "140px";
    await frames();
    expect(ui(".outline-pinned")!.getBoundingClientRect().left).toBe(
      el(".card").getBoundingClientRect().left,
    );
  });

  it("can be switched off from the All CSS tab", async () => {
    inspector().pin(el(".card"));
    const toggle = ui<HTMLInputElement>('[data-option="highlightPinned"]')!;
    toggle.click();
    await frames();
    expect(shown(".outline-pinned")).toBe(false);
    toggle.click();
    await frames();
    expect(shown(".outline-pinned")).toBe(true);
  });

  it("can be moved to another element by the page (LiveInspector.highlight)", async () => {
    inspector().pin(el(".card"));
    const fixture = document.querySelector("#fixture")!;
    inspector().highlight(fixture);
    await frames();
    expect(ui(".outline-pinned")!.getBoundingClientRect().width).toBe(
      fixture.getBoundingClientRect().width,
    );
  });
});
