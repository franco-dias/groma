import { beforeEach, describe, expect, it } from "vitest";
import { all, frames, getElement, inspector, page, reset, ui } from "./helpers";

const columnLines = (): HTMLElement[] => all(".grid-lines .grid-line.is-column");
const rowLines = (): HTMLElement[] => all(".grid-lines .grid-line.is-row");
const gaps = (): HTMLElement[] => all(".grid-lines .grid-gap");

const GRID = `display: grid; width: 300px; height: 120px; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr`;

function pinGrid(style = GRID): void {
  page(
    `<div class="grid" style="${style}"><div>A</div><div>B</div><div>C</div><div>D</div></div><p class="other">other</p>`,
  );
  inspector().pin(getElement(".grid"));
}

const left = (node: HTMLElement): number => node.getBoundingClientRect().left;
const top = (node: HTMLElement): number => node.getBoundingClientRect().top;

beforeEach(reset);

describe("track lines of a pinned grid", () => {
  it("draw one more line than there are tracks on each axis", async () => {
    pinGrid();
    await frames();
    expect(columnLines()).toHaveLength(4);
    expect(rowLines()).toHaveLength(3);
    expect(gaps()).toHaveLength(0);
  });

  it("put the first and last line on the content box edges", async () => {
    pinGrid();
    await frames();
    const box = getElement(".grid").getBoundingClientRect();
    expect(left(columnLines()[0])).toBeCloseTo(box.left, 0);
    expect(left(columnLines()[3])).toBeCloseTo(box.right, 0);
    expect(top(rowLines()[0])).toBeCloseTo(box.top, 0);
    expect(top(rowLines()[2])).toBeCloseTo(box.bottom, 0);
    expect(left(columnLines()[1])).toBeCloseTo(box.left + 100, 0);
  });

  it("keep to the content box when the grid has a gap, a padding and a border", async () => {
    pinGrid(
      `${GRID}; box-sizing: border-box; padding: 10px 20px; border: 3px solid red; column-gap: 12px; row-gap: 8px`,
    );
    await frames();
    const box = getElement(".grid").getBoundingClientRect();
    expect(columnLines()).toHaveLength(4);
    expect(rowLines()).toHaveLength(3);
    expect(left(columnLines()[0])).toBeCloseTo(box.left + 3 + 20, 0);
    expect(left(columnLines()[3])).toBeCloseTo(box.right - 3 - 20, 0);
    expect(top(rowLines()[0])).toBeCloseTo(box.top + 3 + 10, 0);
    expect(top(rowLines()[2])).toBeCloseTo(box.bottom - 3 - 10, 0);
  });

  it("fill the gaps between tracks lightly, one band for each", async () => {
    pinGrid(`${GRID}; column-gap: 12px; row-gap: 8px`);
    await frames();
    expect(gaps()).toHaveLength(3);
    const widths = gaps().map((band) => Math.round(band.getBoundingClientRect().width));
    expect(widths).toContain(12);
  });

  it("follow where justify-content puts the tracks", async () => {
    pinGrid(
      `display: grid; width: 300px; height: 40px; grid-template-columns: repeat(2, 50px); justify-content: center`,
    );
    await frames();
    const box = getElement(".grid").getBoundingClientRect();
    expect(left(columnLines()[0])).toBeCloseTo(box.left + 100, 0);
    expect(left(columnLines()[2])).toBeCloseTo(box.left + 200, 0);
  });

  it("are on a zoomed board where the board is", async () => {
    page(`<div data-artboard style="width: 300px; transform: scale(0.5); transform-origin: 0 0">
      <div class="grid" style="display: grid; grid-template-columns: repeat(3, 100px); grid-template-rows: 40px"><div>A</div></div></div>`);
    inspector().pin(getElement(".grid"));
    await frames();
    const box = getElement(".grid").getBoundingClientRect();
    expect(left(columnLines()[3])).toBeCloseTo(box.right, 0);
    expect(left(columnLines()[1]) - left(columnLines()[0])).toBeCloseTo(50, 0);
  });

  it("do not take pointer events", async () => {
    pinGrid();
    await frames();
    expect(getComputedStyle(columnLines()[0]).pointerEvents).toBe("none");
    expect(getComputedStyle(gaps()[0] ?? columnLines()[0]).pointerEvents).toBe("none");
  });

  it("follow the grid when the page scrolls or the grid changes", async () => {
    pinGrid();
    await frames();
    getElement(".grid").style.width = "200px";
    await frames();
    expect(left(columnLines()[3]) - left(columnLines()[0])).toBeCloseTo(200, 0);
  });

  it("go when another element is pinned, and when the panel is closed", async () => {
    pinGrid();
    await frames();
    inspector().pin(getElement(".other"));
    await frames();
    expect(columnLines()).toHaveLength(0);
    inspector().pin(getElement(".grid"));
    await frames();
    expect(columnLines()).toHaveLength(4);
    ui(".close")!.click();
    await frames();
    expect(columnLines()).toHaveLength(0);
  });

  it("go when the pinned element stops being a grid, and come back with it", async () => {
    pinGrid();
    await frames();
    getElement(".grid").style.display = "block";
    await frames();
    expect(columnLines()).toHaveLength(0);
    getElement(".grid").style.display = "grid";
    await frames();
    expect(columnLines()).toHaveLength(4);
  });

  it("go when the element leaves the page", async () => {
    pinGrid();
    await frames();
    getElement(".grid").remove();
    await frames();
    expect(columnLines()).toHaveLength(0);
  });

  it("are not drawn for a grid that is only hovered", async () => {
    pinGrid();
    inspector().pin(getElement(".other"));
    await frames();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
    getElement(".grid").dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }),
    );
    await frames();
    expect(columnLines()).toHaveLength(0);
  });

  it("are not drawn for an element that is not a grid", async () => {
    pinGrid();
    inspector().pin(getElement(".other"));
    await frames();
    expect(all(".grid-lines .grid-line")).toHaveLength(0);
  });
});
