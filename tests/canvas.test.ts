import { beforeEach, describe, expect, it } from "vitest";
import { pageCopy, showCanvas } from "../src/canvas/canvas";
import { isGromaFrame } from "../src/page";
import {
  all,
  click,
  clipboard,
  doubleClick,
  getElement,
  frames,
  holdAlt,
  hover,
  inspector,
  page,
  pressKey,
  reset,
  rightClick,
  texts,
  ui,
  wait,
} from "./helpers";

/** The page the frame shows. Two boxes 40px apart, and a rule that only a narrow frame matches. */
const FRAMED_PAGE = `<!doctype html>
<style>
  body { margin: 0 }
  .box { position: absolute; top: 50px; width: 200px; height: 100px }
  #card { left: 20px }
  #other { left: 260px }
  @media (max-width: 400px) { #card { width: 120px } }
</style>
<div id="card" class="box">Card</div>
<div id="other" class="box">Other</div>`;

const frame = (): HTMLIFrameElement => ui<HTMLIFrameElement>(".canvas iframe")!;
const framed = (selector: string): HTMLElement =>
  frame().contentDocument!.querySelector<HTMLElement>(selector)!;
const saved = (): { on?: boolean; width?: number; height?: number } =>
  JSON.parse(localStorage.getItem("__groma_canvas") ?? "{}");
const zoom = (): number => frame().getBoundingClientRect().width / frame().offsetWidth;
const zoomLabel = (): string => ui(".canvas-zoom")!.textContent ?? "";
const sizeLabel = (): string => ui(".canvas-size")!.textContent ?? "";
const bar = (action: string): HTMLElement => ui(`.canvas-bar [data-action="${action}"]`)!;

async function until(condition: () => boolean, remaining = 300): Promise<void> {
  if (remaining === 0) throw new Error("Timed out waiting for the canvas");
  if (condition()) return;
  await wait(10);
  return until(condition, remaining - 1);
}

/** Turns the canvas on with `html` in the frame, and waits for the frame to load it. */
async function openCanvas(html = FRAMED_PAGE): Promise<void> {
  showCanvas({ source: URL.createObjectURL(new Blob([html], { type: "text/html" })) });
  await until(() => {
    const doc = frame().contentDocument;
    return doc?.readyState === "complete" && doc.URL.startsWith("blob:");
  });
  await wait(0);
}

/** Where a box of the framed page should be drawn in the window. */
function onScreen(target: Element): { left: number; top: number; width: number; height: number } {
  const origin = frame().getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  return {
    left: origin.left + rect.left * zoom(),
    top: origin.top + rect.top * zoom(),
    width: rect.width * zoom(),
    height: rect.height * zoom(),
  };
}

function expectOver(node: Element, box: ReturnType<typeof onScreen>): void {
  const rect = node.getBoundingClientRect();
  expect(rect.left).toBeCloseTo(box.left, 1);
  expect(rect.top).toBeCloseTo(box.top, 1);
  expect(rect.width).toBeCloseTo(box.width, 1);
  expect(rect.height).toBeCloseTo(box.height, 1);
}

function dragHandle(handle: string, { dx, dy }: { dx: number; dy: number }): void {
  const target = ui(`.canvas-handle.${handle}`)!;
  const at = { clientX: 500, clientY: 400, pointerId: 1, bubbles: true, cancelable: true };
  target.dispatchEvent(new PointerEvent("pointerdown", at));
  target.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 500 + dx, clientY: 400 + dy }));
  target.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: 500 + dx, clientY: 400 + dy }));
}

beforeEach(() => {
  reset();
  page(`<div id="card" style="width: 200px; height: 100px">Card</div>`);
});

describe("turning the canvas on", () => {
  it("shows the page in a frame, at the default size, fitted to the window", async () => {
    await openCanvas();
    expect(framed("#card").textContent).toBe("Card");
    expect(sizeLabel()).toBe("1280 × 800");
    expect(frame().offsetWidth).toBe(1280);
    // 1280 × 800 does not fit beside the margins of a 1280 × 800 window.
    expect(zoom()).toBeLessThan(1);
    const box = frame().getBoundingClientRect();
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  it("is remembered", async () => {
    await openCanvas();
    expect(saved().on).toBe(true);
    bar("exit").click();
    expect(saved().on).toBe(false);
    expect(ui(".canvas")).toBeNull();
  });

  it("covers the page underneath and leaves it as it was", async () => {
    const before = document.documentElement.getAttribute("style");
    await openCanvas();
    const canvas = ui(".canvas")!.getBoundingClientRect();
    expect(canvas.width).toBe(document.documentElement.clientWidth);
    inspector().pin(framed("#card"));
    // Push mode has nothing to push: the page is in the frame, beside the panel.
    expect(document.documentElement.getAttribute("style")).toBe(before);
    expect(ui(".canvas")!.getBoundingClientRect().right).toBe(ui(".panel")!.getBoundingClientRect().left);
  });
});

describe("inspecting on the canvas", () => {
  it("draws the hover boxes over the element in the frame, at the canvas zoom", async () => {
    await openCanvas();
    holdAlt();
    hover(framed("#card"));
    expectOver(ui(".overlay .content-box")!, onScreen(framed("#card")));
    expect(texts(".tooltip span")[0]).toBe("200 × 100");
  });

  it("edits text in place in the frame while locked, and leaves the frame's attributes as they were", async () => {
    await openCanvas();
    ui(".launcher")!.click();
    const card = framed("#card");
    doubleClick(card);
    expect(card.isContentEditable).toBe(true);
    card.textContent = "Framed";
    pressKey(card, "Enter");

    expect(card.hasAttribute("contenteditable")).toBe(false);
    expect(card.textContent).toBe("Framed");
    expect(inspector().pinnedElement()).toBe(card);
  });

  it("pins on a click and outlines the element where it shows", async () => {
    await openCanvas();
    holdAlt();
    click(framed("#card"));
    expect(inspector().pinnedElement()).toBe(framed("#card"));
    await frames();
    expectOver(ui(".outline-pinned")!, onScreen(framed("#card")));
    expect(ui(".title-size")!.textContent).toBe("200 × 100");
  });

  it("measures in the page's own pixels, whatever the zoom", async () => {
    await openCanvas();
    inspector().pin(framed("#card"));
    holdAlt();
    hover(framed("#other"));
    expect(zoom()).not.toBe(1);
    expect(texts(".measure-label")).toEqual(["40"]);
  });

  it("lists the layers under the pointer of a right-click in the frame", async () => {
    await openCanvas();
    holdAlt();
    rightClick(framed("#card"));
    expect(texts(".menu-item .layer-name")).toEqual(["div.box"]);
    const card = onScreen(framed("#card"));
    const menu = ui(".menu")!.getBoundingClientRect();
    expect(menu.left).toBeCloseTo(card.left + card.width / 2 + 8, 0);
  });

  it("cuts the marks at the edge of the frame", async () => {
    await openCanvas();
    inspector().pin(framed("#card"));
    await frames();
    const clip = ui(".page-clip")!;
    expect(clip.classList.contains("is-framed")).toBe(true);
    expectOver(clip, frame().getBoundingClientRect());
    expect(getComputedStyle(clip).overflow).toBe("hidden");
  });

  it("clears what was drawn when the canvas moves the page", async () => {
    await openCanvas();
    holdAlt();
    hover(framed("#card"));
    expect(all(".overlay > div").length).toBeGreaterThan(0);
    bar("zoom-in").click();
    expect(all(".overlay > div")).toHaveLength(0);
  });
});

describe("the frame", () => {
  it("takes a preset size, which the page's media queries see", async () => {
    await openCanvas();
    expect(framed("#card").offsetWidth).toBe(200);
    ui('.canvas-bar [data-size="375x812"]')!.click();
    expect(sizeLabel()).toBe("375 × 812");
    expect(frame().offsetWidth).toBe(375);
    expect(framed("#card").offsetWidth).toBe(120);
    expect(saved()).toMatchObject({ width: 375, height: 812 });
  });

  it("brings the panel up to date when the page lays itself out at the new size", async () => {
    await openCanvas();
    inspector().pin(framed("#card"));
    expect(ui(".title-size")!.textContent).toBe("200 × 100");
    ui('.canvas-bar [data-size="375x812"]')!.click();
    expect(ui(".title-size")!.textContent).toBe("120 × 100");
    dragHandle("is-x", { dx: 400, dy: 0 });
    expect(ui(".title-size")!.textContent).toBe("200 × 100");
  });

  it("is resized by dragging its edges, in page pixels at any zoom", async () => {
    await openCanvas();
    const scale = zoom();
    dragHandle("is-x", { dx: -100, dy: 0 });
    expect(frame().offsetWidth).toBe(Math.round(1280 - 100 / scale));
    expect(frame().offsetHeight).toBe(800);
    dragHandle("is-y", { dx: 0, dy: -50 });
    expect(frame().offsetHeight).toBe(Math.round(800 - 50 / scale));
    expect(saved().width).toBe(frame().offsetWidth);
    expect(sizeLabel()).toBe(`${frame().offsetWidth} × ${frame().offsetHeight}`);
  });

  it("keeps the handles on the frame's edges", async () => {
    await openCanvas();
    const box = frame().getBoundingClientRect();
    expect(ui(".canvas-handle.is-x")!.getBoundingClientRect().left).toBeCloseTo(box.right, 1);
    expect(ui(".canvas-handle.is-y")!.getBoundingClientRect().top).toBeCloseTo(box.bottom, 1);
  });
});

const frameLeft = (): number => frame().getBoundingClientRect().left;

describe("zoom and position", () => {
  it("zooms with the toolbar and goes back with Fit", async () => {
    await openCanvas();
    const fitted = zoomLabel();
    bar("zoom-reset").click();
    expect(zoomLabel()).toBe("100%");
    expect(zoom()).toBe(1);
    bar("zoom-in").click();
    expect(zoomLabel()).toBe("125%");
    bar("zoom-out").click();
    expect(zoomLabel()).toBe("100%");
    bar("fit").click();
    expect(zoomLabel()).toBe(fitted);
  });

  it("zooms on Ctrl + wheel over the page, around the pointer", async () => {
    await openCanvas();
    const card = framed("#card");
    const before = onScreen(card);
    const zoomBefore = zoom();
    const event = new WheelEvent("wheel", {
      deltaY: -50,
      ctrlKey: true,
      clientX: 20,
      clientY: 50,
      bubbles: true,
      cancelable: true,
    });
    card.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(zoom()).toBeGreaterThan(zoomBefore);
    // The pointer was on the card's corner: the corner has not moved.
    const after = onScreen(card);
    expect(after.left).toBeCloseTo(before.left, 1);
    expect(after.top).toBeCloseTo(before.top, 1);
  });

  it("moves the frame on a wheel over the canvas and on a drag of the canvas", async () => {
    await openCanvas();
    const canvas = ui(".canvas")!;
    const start = frameLeft();
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaX: 30, bubbles: true, cancelable: true }));
    expect(frameLeft()).toBeCloseTo(start - 30, 1);

    const at = { clientX: 5, clientY: 300, pointerId: 1, bubbles: true, cancelable: true };
    canvas.dispatchEvent(new PointerEvent("pointerdown", at));
    canvas.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 45 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: 45 }));
    expect(frameLeft()).toBeCloseTo(start - 30 + 40, 1);
  });

  it("keeps a fitted frame fitted when the panel takes room", async () => {
    await openCanvas();
    const before = zoom();
    inspector().pin(framed("#card"));
    await until(() => zoom() < before);
    expect(frame().getBoundingClientRect().right).toBeLessThanOrEqual(
      ui(".panel")!.getBoundingClientRect().left,
    );
  });
});

/** A press on `target`, a move of `dx` and a release, with `button`. Coordinates are the target's document's. */
function dragOn(target: Element, { dx, button = 0 }: { dx: number; button?: number }): void {
  const at = {
    clientX: 100,
    clientY: 100,
    pointerId: 1,
    button,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  target.dispatchEvent(new PointerEvent("pointerdown", at));
  target.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: 100 + dx }));
  target.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: 100 + dx }));
}

const space = (type: "keydown" | "keyup", target: EventTarget = document): KeyboardEvent => {
  const event = new KeyboardEvent(type, {
    code: "Space",
    key: " ",
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  target.dispatchEvent(event);
  return event;
};

describe("moving the canvas from over the page", () => {
  it("moves it on a drag while Space is held, and gives the page its pointer back after", async () => {
    await openCanvas();
    const start = frameLeft();
    expect(space("keydown").defaultPrevented).toBe(true);
    // The frame lets the pointer through, so the press lands on the canvas.
    expect(getComputedStyle(frame()).pointerEvents).toBe("none");
    dragOn(ui(".canvas-frame")!, { dx: 60 });
    expect(frameLeft()).toBeCloseTo(start + 60, 1);

    space("keyup");
    expect(getComputedStyle(frame()).pointerEvents).toBe("auto");
    dragOn(ui(".canvas-frame")!, { dx: 60 });
    expect(frameLeft()).toBeCloseTo(start + 60, 1);
  });

  it("also takes Space pressed while the focus is in the page", async () => {
    await openCanvas();
    expect(space("keydown", framed("#card")).defaultPrevented).toBe(true);
    expect(ui(".canvas")!.classList.contains("is-panning")).toBe(true);
    space("keyup", framed("#card"));
    expect(ui(".canvas")!.classList.contains("is-panning")).toBe(false);
  });

  it("leaves Space to a field the user types in", async () => {
    await openCanvas(
      `<input id="field" /><textarea id="area"></textarea><p id="note" contenteditable>Note</p>`,
    );
    for (const id of ["#field", "#area", "#note"]) {
      expect(space("keydown", framed(id)).defaultPrevented).toBe(false);
    }
    expect(ui(".canvas")!.classList.contains("is-panning")).toBe(false);
  });

  const CONTROLS = `<button id="go">Go</button><input id="check" type="checkbox" /><div style="height: 300px"></div>`;

  it("works while a button or a checkbox of the page has the focus, without pressing it", async () => {
    await openCanvas(CONTROLS);
    let clicks = 0;
    framed("#go").addEventListener("click", () => clicks++);
    const start = frameLeft();
    for (const id of ["#go", "#check"]) {
      expect(space("keydown", framed(id)).defaultPrevented).toBe(true);
      dragOn(ui(".canvas-frame")!, { dx: 30 });
      // The key repeats while it is held, also after the drag.
      space("keydown", framed(id));
      expect(space("keyup", framed(id)).defaultPrevented).toBe(true);
    }
    expect(frameLeft()).toBeCloseTo(start + 60, 1);
    expect(clicks).toBe(0);
    expect((framed("#check") as HTMLInputElement).checked).toBe(false);
  });

  it("presses the focused control when Space is released with no drag, once", async () => {
    await openCanvas(CONTROLS);
    let clicks = 0;
    framed("#go").addEventListener("click", () => clicks++);
    space("keydown", framed("#go"));
    // The key repeats while it is held.
    space("keydown", framed("#go"));
    space("keyup", framed("#go"));
    expect(clicks).toBe(1);

    space("keydown", framed("#check"));
    space("keyup", framed("#check"));
    expect((framed("#check") as HTMLInputElement).checked).toBe(true);
  });

  it("works while the focus is in the inspector's panel", async () => {
    await openCanvas();
    inspector().pin(framed("#card"));
    const tab = ui('.tab[data-tab="layers"]')!;
    expect(space("keydown", tab).defaultPrevented).toBe(true);
    expect(ui(".canvas")!.classList.contains("is-panning")).toBe(true);
    dragOn(ui(".canvas-frame")!, { dx: 30 });
    space("keyup", tab);
    expect(ui(".panel")!.dataset.tab).toBe("specs");
    // ...and still types in the panel's search field.
    expect(space("keydown", ui(".search input")!).defaultPrevented).toBe(false);
  });

  it("keeps the toolbar working while Space is held", async () => {
    await openCanvas();
    const start = frameLeft();
    space("keydown");
    dragOn(bar("fit"), { dx: 60 });
    expect(frameLeft()).toBe(start);
    space("keyup");
  });

  it("moves it on a middle-button drag over the page, and leaves a plain drag to the page", async () => {
    await openCanvas();
    const start = frameLeft();
    // The page's own coordinates: 40 screen pixels are 40 / zoom of the page's.
    dragOn(framed("#card"), { dx: 40 / zoom(), button: 1 });
    expect(frameLeft()).toBeCloseTo(start + 40, 1);
    dragOn(framed("#card"), { dx: 40 / zoom(), button: 0 });
    expect(frameLeft()).toBeCloseTo(start + 40, 1);
  });

  it("does nothing with Space when the canvas is off", () => {
    expect(space("keydown").defaultPrevented).toBe(false);
  });
});

const blocked = () => ui(".canvas-blocked")!;

const item = () => ui('.more-item[data-action="canvas"]')!;

describe("switching", () => {
  it("keeps the element pinned when the canvas opens and when it closes", async () => {
    inspector().pin(getElement("#card"));
    await openCanvas();
    expect(inspector().pinnedElement()).toBe(framed("#card"));
    bar("exit").click();
    expect(inspector().pinnedElement()).toBe(getElement("#card"));
  });

  it("shows its state in the » menu, which also turns it off", async () => {
    inspector().pin(getElement("#card"));
    ui(".more-button")!.click();
    expect(item().getAttribute("aria-checked")).toBe("false");
    await openCanvas();
    ui(".more-button")!.click();
    ui(".more-button")!.click();
    expect(item().getAttribute("aria-checked")).toBe("true");
    item().click();
    expect(ui(".canvas")).toBeNull();
    expect(item().getAttribute("aria-checked")).toBe("false");
  });

  it("says so when a link in the frame leads to a page it cannot read, and offers the way back", async () => {
    await openCanvas();
    // A data: page is another origin, as another site is.
    frame().src = "data:text/html,<p>Elsewhere</p>";
    await until(() => !blocked().hidden);
    expect(blocked().textContent).toContain("cannot be shown on a canvas");
    ui('.canvas-blocked [data-action="exit"]')!.click();
    expect(ui(".canvas")).toBeNull();
    expect(saved().on).toBe(false);
  });
});

/** Opens the canvas on an address the browser will not let us read, with `FRAMED_PAGE` as the copy. */
async function openRefused(): Promise<void> {
  showCanvas({ source: "data:text/html,<p>Refused</p>", copy: () => FRAMED_PAGE });
  await until(() => Boolean(frame().contentDocument?.querySelector("#card")));
  await wait(0);
}

describe("a page whose address the browser refuses to frame", () => {
  it("is shown from a copy of the open page instead, and inspected as usual", async () => {
    await openRefused();
    expect(ui(".canvas-blocked")!.hidden).toBe(true);
    holdAlt();
    click(framed("#card"));
    expect(inspector().pinnedElement()).toBe(framed("#card"));
    expect(ui(".title-size")!.textContent).toBe("200 × 100");
  });

  it("keeps this page's address for links and saved edits: the copy has none", async () => {
    await openRefused();
    inspector().pin(framed("#card"));
    ui('[data-action="link"]')!.click();
    await until(() => clipboard.text !== "");
    const link = new URL(clipboard.text);
    expect(link.origin + link.pathname).toBe(location.origin + location.pathname);
    expect(link.searchParams.get("inspect")).toBe("#card");
  });

  it("goes back to the page without leaving it", async () => {
    await openRefused();
    bar("exit").click();
    expect(ui(".canvas")).toBeNull();
    expect(getElement("#card").textContent).toBe("Card");
  });

  it("copies the page as it is now, without the inspector", () => {
    inspector().pin(getElement("#card"));
    const html = pageCopy(document);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('id="card"');
    expect(html).not.toContain("groma-inspector");
    // The page itself keeps its inspector.
    expect(document.querySelector("groma-inspector")).not.toBeNull();
  });

  it("loads the original file the user chooses over the copy", async () => {
    await openRefused();
    const picker = ui<HTMLInputElement>('.canvas input[type="file"]')!;
    const files = new DataTransfer();
    files.items.add(
      new File([`<!doctype html><p id="original">From the file</p>`], "page.html", { type: "text/html" }),
    );
    picker.files = files.files;
    picker.dispatchEvent(new Event("change"));
    await until(() => Boolean(frame().contentDocument?.querySelector("#original")));
    expect(framed("#original").textContent).toBe("From the file");
    expect(ui(".canvas-blocked")!.hidden).toBe(true);
  });

  it("offers the file only for a page opened from disk", async () => {
    await openRefused();
    expect(bar("choose-file").hidden).toBe(true);
  });

  it("takes the panel's push off the page when the canvas opens with nothing pinned", async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyG",
        altKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.documentElement.style.marginRight).not.toBe("");
    await openCanvas();
    expect(document.documentElement.style.marginRight).toBe("");
    bar("exit").click();
    expect(document.documentElement.style.marginRight).not.toBe("");
  });
});

describe("the copy of the script inside the frame", () => {
  it("knows it is in a canvas frame, and only there", async () => {
    await openCanvas();
    expect(isGromaFrame(frame().contentWindow!)).toBe(true);
    const plain = document.body.appendChild(document.createElement("iframe"));
    expect(isGromaFrame(plain.contentWindow!)).toBe(false);
    expect(isGromaFrame(window)).toBe(false);
    plain.remove();
  });
});
