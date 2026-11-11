import { beforeEach, describe, expect, it } from "vitest";
import {
  getElement,
  frames,
  inspector,
  openTab,
  page,
  pressKey,
  reset,
  slidePanel,
  texts,
  ui,
  wait,
} from "./helpers";

const shown = (selector: string): boolean => getComputedStyle(ui(selector)!).display !== "none";
const savedLayout = () => JSON.parse(localStorage.getItem("__groma_panel") ?? "{}");

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
    inspector().pin(getElement(".card"));
    expect(shown(".panel")).toBe(true);
    expect(ui(".panel")!.dataset.tab).toBe("specs");
    expect(shown('.body[data-for="specs"]')).toBe(true);
    expect(shown('.body[data-for="css"]')).toBe(false);
  });

  it("switches tabs and remembers the last one", () => {
    inspector().pin(getElement(".card"));
    openTab("layers");
    expect(shown('.body[data-for="layers"]')).toBe(true);
    expect(shown('.body[data-for="specs"]')).toBe(false);
    expect(shown(".action-bar")).toBe(false);
    expect(savedLayout().tab).toBe("layers");
  });

  it("hides the Changes tab on a page that is not a Claude Design export", () => {
    inspector().pin(getElement(".card"));
    expect(ui('.tab[data-tab="changes"]')!.hidden).toBe(true);
  });

  it("collapses to a rail that names the element, and expands again", () => {
    inspector().pin(getElement(".card"));
    ui(".collapse")!.click();
    expect(ui(".panel")!.offsetWidth).toBe(28);
    expect(texts(".rail .name")).toEqual(["Inspect · div"]);

    ui(".rail")!.click();
    expect(ui(".panel")!.offsetWidth).toBe(380);
  });

  it("expands when another element is pinned", () => {
    inspector().pin(getElement(".card"));
    ui(".collapse")!.click();
    inspector().pin(document.body.querySelector("#fixture")!);
    expect(ui(".panel")!.offsetWidth).toBe(380);
  });

  it("resizes by its left edge, between 320 and 560 px, and remembers the width", () => {
    inspector().pin(getElement(".card"));
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
    inspector().pin(getElement(".card"));
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
    inspector().pin(getElement(".card"));
    openTab("css");
    pressKey(ui(".search input")!, "ArrowDown");
    document.removeEventListener("keydown", count);
    expect(pageKeys).toBe(0);
  });
});

describe("pinned outline", () => {
  it("sits on the element with a tag that names it", async () => {
    inspector().pin(getElement(".card"));
    await frames();
    const outline = ui(".outline-pinned")!.getBoundingClientRect();
    const card = getElement(".card").getBoundingClientRect();
    expect([outline.left, outline.top, outline.width, outline.height]).toEqual([
      card.left,
      card.top,
      card.width,
      card.height,
    ]);
    expect(texts(".pin-tag")).toEqual(["div200 × 100"]);
  });

  it("follows the element when the page moves it", async () => {
    inspector().pin(getElement(".card"));
    getElement(".card").style.marginLeft = "140px";
    await frames();
    expect(ui(".outline-pinned")!.getBoundingClientRect().left).toBe(
      getElement(".card").getBoundingClientRect().left,
    );
  });

  it("can be switched off from the All CSS tab", async () => {
    inspector().pin(getElement(".card"));
    const toggle = ui<HTMLInputElement>('[data-option="highlightPinned"]')!;
    toggle.click();
    await frames();
    expect(shown(".outline-pinned")).toBe(false);
    toggle.click();
    await frames();
    expect(shown(".outline-pinned")).toBe(true);
  });

  it("can be moved to another element by the page (Groma.highlight)", async () => {
    inspector().pin(getElement(".card"));
    const fixture = document.querySelector("#fixture")!;
    inspector().highlight(fixture);
    await frames();
    expect(ui(".outline-pinned")!.getBoundingClientRect().width).toBe(fixture.getBoundingClientRect().width);
  });
});

const shortcut = (target: EventTarget = document): boolean =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      code: "KeyG",
      key: "˝",
      altKey: true,
      shiftKey: true,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );

describe("opening the panel with nothing pinned", () => {
  it("opens on Alt + Shift + G, with a hint instead of the tabs' content", () => {
    expect(shortcut()).toBe(false);
    expect(shown(".panel")).toBe(true);
    expect(inspector().pinnedElement()).toBeNull();
    expect(shown(".empty")).toBe(true);
    expect(ui(".empty")!.textContent).toContain("Nothing pinned");
    expect(shown('.body[data-for="specs"]')).toBe(false);
    expect(shown(".action-bar")).toBe(false);
  });

  it("does nothing on G alone or with one modifier", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG", altKey: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG", shiftKey: true, bubbles: true }));
    expect(ui(".panel") === null || !shown(".panel")).toBe(true);
  });

  it("closes on the same keys, also when the focus is in the panel, and on ✕", () => {
    shortcut();
    shortcut(ui(".tab-bar")!);
    expect(shown(".panel")).toBe(false);
    shortcut();
    ui(".close")!.click();
    expect(shown(".panel")).toBe(false);
  });

  it("closes a panel that shows an element, and unpins it", () => {
    inspector().pin(getElement(".card"));
    shortcut();
    expect(shown(".panel")).toBe(false);
    expect(inspector().pinnedElement()).toBeNull();
  });

  it("reaches the » menu and the reference", () => {
    shortcut();
    ui(".more-button")!.click();
    ui('.more-item[data-tab="reference"]')!.click();
    expect(shown('.body[data-for="reference"]')).toBe(true);
    expect(shown(".empty")).toBe(false);
  });

  it("stays open when a setting changes, and shows an element pinned later", () => {
    shortcut();
    inspector().configure({ copyFormat: "sx" });
    expect(shown(".panel")).toBe(true);
    inspector().pin(getElement(".card"));
    expect(shown(".empty")).toBe(false);
    expect(shown('.body[data-for="specs"]')).toBe(true);
    expect(ui(".title-size")!.textContent).toBe("200 × 100");
  });

  it("takes its width out of the page, as a panel with an element does", () => {
    shortcut();
    expect(parseFloat(getComputedStyle(document.documentElement).marginRight)).toBe(
      ui(".panel")!.offsetWidth,
    );
  });

  it("shows only the rail when collapsed", () => {
    shortcut();
    ui(".more-button")!.click();
    ui(".more-item.collapse")!.click();
    expect(shown(".empty")).toBe(false);
    expect(ui(".rail .name")!.textContent).toBe("Inspect");
  });
});

const pageMargin = (): number => parseFloat(getComputedStyle(document.documentElement).marginRight);

const panel = (): HTMLElement => ui(".panel")!;

/** The gap between the page's right edge and the panel's left edge. */
const gap = (): number =>
  panel().getBoundingClientRect().left - document.documentElement.getBoundingClientRect().right;

const offset = (): number => new DOMMatrix(getComputedStyle(panel()).transform).m41;

const sliding = (): boolean =>
  panel()
    .getAnimations()
    .some((animation) => animation.playState === "running");

describe("sliding in and out", () => {
  it("slides in from the right edge when it opens", async () => {
    // Let the browser see the panel closed first: `reset()` has just closed it.
    await frames();
    slidePanel();
    inspector().pin(getElement(".card"));
    await frames();
    expect(sliding()).toBe(true);
    expect(offset()).toBeGreaterThan(0);
    await wait(300);
    expect(sliding()).toBe(false);
    expect(offset()).toBe(0);
  });

  it("slides out before it goes", async () => {
    inspector().pin(getElement(".card"));
    slidePanel();
    ui(".close")!.click();
    // Closed for the rest of the inspector from this moment...
    expect(inspector().pinnedElement()).toBeNull();
    await frames();
    // ...while it is still on screen, on its way out.
    expect(shown(".panel")).toBe(true);
    expect(offset()).toBeGreaterThan(0);
    await wait(300);
    expect(shown(".panel")).toBe(false);
  });

  it("pushes the page along as it slides in, never ahead of the panel", async () => {
    await frames();
    slidePanel();
    inspector().pin(getElement(".card"));
    expect(pageMargin()).toBe(0);
    await frames();
    await frames();
    expect(pageMargin()).toBeGreaterThan(0);
    expect(pageMargin()).toBeLessThan(panel().offsetWidth);
    // The page's edge stays on the panel's edge all the way.
    expect(Math.abs(gap())).toBeLessThan(1);
    await wait(300);
    expect(pageMargin()).toBe(panel().offsetWidth);
  });

  it("lets the page back along as it slides out, and restores it at the end", async () => {
    inspector().pin(getElement(".card"));
    const width = panel().offsetWidth;
    slidePanel();
    ui(".close")!.click();
    await frames();
    await frames();
    expect(pageMargin()).toBeGreaterThan(0);
    expect(pageMargin()).toBeLessThan(width);
    expect(Math.abs(gap())).toBeLessThan(1);
    await wait(300);
    expect(document.documentElement.style.marginRight).toBe("");
  });

  it("leaves the page alone in float mode while it slides", async () => {
    inspector().pin(getElement(".card"));
    ui(".more-button")!.click();
    ui('[data-action="push"]')!.click();
    ui(".close")!.click();
    await frames();
    slidePanel();
    inspector().pin(getElement(".card"));
    await frames();
    expect(pageMargin()).toBe(0);
  });

  it("comes back when it is opened again while sliding out", async () => {
    inspector().pin(getElement(".card"));
    slidePanel();
    ui(".close")!.click();
    await frames();
    inspector().pin(getElement(".card"));
    await wait(300);
    expect(shown(".panel")).toBe(true);
    expect(offset()).toBe(0);
  });
});
