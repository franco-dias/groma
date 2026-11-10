import { beforeEach, describe, expect, it } from "vitest";
import { all, click, el, holdAlt, hover, inspector, page, releaseAlt, reset, texts, ui } from "./helpers";

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
    hover(el(".card"));
    expect(all(".overlay > div")).toHaveLength(0);
    expect(document.body.style.cursor).toBe("");
  });

  it("draws the hovered element's box model", () => {
    holdAlt();
    hover(el(".card"));

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
    hover(el(".zoomed"));
    // 10px of padding, drawn at 2×.
    expect(boxes("padding")[0].height).toBe(20);
  });

  it("names the hovered element in a chip: name and size in its own pixels", () => {
    holdAlt();
    hover(el(".zoomed"));
    expect(texts(".tooltip > *").slice(0, 2)).toEqual(["div", "100 × 50"]);
  });

  it("does not redraw while the pointer stays on one element", () => {
    holdAlt();
    hover(el(".card"));
    const first = all(".overlay > div")[0];
    hover(el(".card"));
    expect(all(".overlay > div")[0]).toBe(first);
  });

  it("clears when Alt is released", () => {
    holdAlt();
    hover(el(".card"));
    releaseAlt();
    expect(all(".overlay > div")).toHaveLength(0);
    expect(ui(".tooltip")!.style.display).toBe("none");
    expect(document.body.style.cursor).toBe("");
  });

  it("turns off when the window loses focus, because the Alt keyup never arrives", () => {
    holdAlt();
    hover(el(".card"));
    window.dispatchEvent(new Event("blur"));
    expect(document.body.style.cursor).toBe("");
    hover(el(".text"));
    expect(all(".overlay > div")).toHaveLength(0);
  });
});

describe("pinning (Alt + click)", () => {
  it("pins the clicked element and keeps the whole press from the page", () => {
    const seen: string[] = [];
    for (const type of ["mousedown", "mouseup", "click"]) {
      el(".card").addEventListener(type, () => seen.push(type));
    }
    holdAlt();
    click(el(".card"));

    expect(inspector().pinnedElement()).toBe(el(".card"));
    expect(seen).toEqual([]);
  });

  it("lets the page handle clicks when Alt is not held", () => {
    let clicks = 0;
    el(".card").addEventListener("click", () => clicks++);
    click(el(".card"));
    expect(clicks).toBe(1);
    expect(inspector().pinnedElement()).toBeNull();
  });
});
