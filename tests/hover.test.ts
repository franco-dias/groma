import { beforeEach, describe, expect, it } from "vitest";
import {
  all,
  click,
  getElement,
  holdAlt,
  hover,
  inspector,
  page,
  releaseAlt,
  reset,
  texts,
  ui,
} from "./helpers";

const boxes = (kind: string): DOMRect[] =>
  all(`.overlay > .${kind}`).map((box) => box.getBoundingClientRect());

beforeEach(() => {
  reset();
  page(`
    <div class="card" style="width: 200px; height: 100px; margin: 10px; padding: 20px; border: 5px solid; box-sizing: border-box">
      <p class="text" style="margin: 0">Hello</p>
    </div>
    <div class="zoomed" style="width: 100px; height: 50px; padding: 10px; box-sizing: border-box; transform: scale(2); transform-origin: 0 0; margin-top: 20px"></div>
  `);
});

describe("inspect mode (Alt)", () => {
  it("does nothing until Alt is held", () => {
    hover(getElement(".card"));
    expect(all(".overlay > div")).toHaveLength(0);
    expect(document.body.style.cursor).toBe("");
  });

  it("draws the hovered element's box model", () => {
    holdAlt();
    hover(getElement(".card"));

    expect(document.body.style.cursor).toBe("crosshair");
    // Four strips each for a ring that exists on every side.
    expect(boxes("margin")).toHaveLength(4);
    expect(boxes("border")).toHaveLength(4);
    expect(boxes("padding")).toHaveLength(4);
    expect(boxes("margin")[0].height).toBe(10);
    expect(boxes("border")[0].height).toBe(5);
    expect(boxes("padding")[0].height).toBe(20);
    // Content: 200 - 2 × (5 + 20) wide, 100 - 2 × (5 + 20) tall.
    const [content] = boxes("content-box");
    expect([content.width, content.height]).toEqual([150, 50]);
    expect(boxes("child")).toHaveLength(1);
  });

  it("scales the box model with CSS transforms", () => {
    holdAlt();
    hover(getElement(".zoomed"));
    // 10px of padding, drawn at 2×.
    expect(boxes("padding")[0].height).toBe(20);
  });

  it("names the hovered element in a chip: name and size in its own pixels", () => {
    holdAlt();
    hover(getElement(".zoomed"));
    expect(texts(".tooltip > *").slice(0, 2)).toEqual(["div", "100 × 50"]);
  });

  it("does not redraw while the pointer stays on one element", () => {
    holdAlt();
    hover(getElement(".card"));
    const first = all(".overlay > div")[0];
    hover(getElement(".card"));
    expect(all(".overlay > div")[0]).toBe(first);
  });

  it("draws again when the page moves the hovered element under a still pointer", () => {
    holdAlt();
    hover(getElement(".card"));
    const before = boxes("content-box")[0].left;

    getElement(".card").style.position = "relative";
    getElement(".card").style.left = "60px";
    hover(getElement(".card"));
    expect(boxes("content-box")[0].left).toBe(before + 60);
  });

  it("clears when Alt is released", () => {
    holdAlt();
    hover(getElement(".card"));
    releaseAlt();
    expect(all(".overlay > div")).toHaveLength(0);
    expect(ui(".tooltip")!.style.display).toBe("none");
    expect(document.body.style.cursor).toBe("");
  });

  it("turns off when the window loses focus, because the Alt keyup never arrives", () => {
    holdAlt();
    hover(getElement(".card"));
    window.dispatchEvent(new Event("blur"));
    expect(document.body.style.cursor).toBe("");
    hover(getElement(".text"));
    expect(all(".overlay > div")).toHaveLength(0);
  });
});

describe("pinning (Alt + click)", () => {
  it("pins the clicked element and keeps the whole press from the page", () => {
    const seen: string[] = [];
    for (const type of ["mousedown", "mouseup", "click"]) {
      getElement(".card").addEventListener(type, () => seen.push(type));
    }
    holdAlt();
    click(getElement(".card"));

    expect(inspector().pinnedElement()).toBe(getElement(".card"));
    expect(seen).toEqual([]);
  });

  it("lets the page handle clicks when Alt is not held", () => {
    let clicks = 0;
    getElement(".card").addEventListener("click", () => clicks++);
    click(getElement(".card"));
    expect(clicks).toBe(1);
    expect(inspector().pinnedElement()).toBeNull();
  });
});
