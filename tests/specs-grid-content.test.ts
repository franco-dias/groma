import { beforeEach, describe, expect, it } from "vitest";
import { getElement, inspector, page, reset, texts, ui } from "./helpers";

const SPECS = '.body[data-for="specs"]';

const control = (property: string): HTMLElement | null =>
  ui(`${SPECS} .flex-control[data-prop="${property}"]`);

const checked = (property: string): string[] =>
  Array.from(
    control(property)!.querySelectorAll<HTMLElement>('[aria-checked="true"]'),
    (button) => button.dataset.value!,
  );

function pinGrid(style: string): void {
  page(`<div class="grid" style="display: grid; ${style}"><div>A</div><div>B</div><div>C</div></div>`);
  inspector().pin(getElement(".grid"));
}

beforeEach(reset);

describe("justify-content and align-content on a grid", () => {
  it("are not shown when the tracks fill the container on both axes", () => {
    pinGrid("width: 300px; grid-template-columns: repeat(3, 1fr)");
    expect(control("justify-content")).toBeNull();
    expect(control("align-content")).toBeNull();
  });

  it("show justify-content when the columns leave room across the grid", () => {
    pinGrid("width: 300px; grid-template-columns: repeat(3, 50px)");
    expect(control("justify-content")).not.toBeNull();
    expect(control("align-content")).toBeNull();
    expect(checked("justify-content")).toEqual(["start"]);
  });

  it("show align-content when the rows leave room down the grid", () => {
    pinGrid("width: 300px; height: 300px; grid-template-columns: 1fr; grid-template-rows: 50px 50px 50px");
    expect(control("align-content")).not.toBeNull();
    expect(control("justify-content")).toBeNull();
  });

  it("show a property that is not normal, whatever room there is", () => {
    pinGrid("width: 300px; grid-template-columns: repeat(3, 1fr); justify-content: center");
    expect(checked("justify-content")).toEqual(["center"]);
  });

  it("do not show for a gap of less than a pixel of room", () => {
    pinGrid("width: 300.5px; grid-template-columns: repeat(3, 100px)");
    expect(control("justify-content")).toBeNull();
  });

  it("count the gaps as room already used", () => {
    pinGrid("width: 320px; column-gap: 10px; grid-template-columns: repeat(3, 100px)");
    expect(control("justify-content")).toBeNull();
  });

  it("count the padding as room not available", () => {
    pinGrid("width: 300px; box-sizing: border-box; padding: 0 20px; grid-template-columns: repeat(3, 80px)");
    expect(control("justify-content")).not.toBeNull();
    pinGrid("width: 340px; box-sizing: border-box; padding: 0 20px; grid-template-columns: repeat(3, 100px)");
    expect(control("justify-content")).toBeNull();
  });

  it("are labelled Distribute, with a hint saying which axis", () => {
    pinGrid("width: 300px; height: 300px; grid-template-columns: repeat(3, 50px); grid-template-rows: 50px");
    expect(texts(`${SPECS} .flex-control[data-prop="justify-content"] .label`)).toEqual(["Distribute"]);
    expect(texts(`${SPECS} .flex-control[data-prop="justify-content"] .hint`)).toEqual([
      "the columns across the grid",
    ]);
    expect(texts(`${SPECS} .flex-control[data-prop="align-content"] .hint`)).toEqual([
      "the rows down the grid",
    ]);
  });

  it("set the property on the page when a button is clicked", () => {
    pinGrid("width: 300px; grid-template-columns: repeat(3, 50px)");
    control("justify-content")!.querySelector<HTMLElement>('[data-value="center"]')!.click();
    expect(getElement(".grid").style.justifyContent).toBe("center");
    expect(checked("justify-content")).toEqual(["center"]);
  });

  it("offer space-between, space-around and space-evenly in a menu", () => {
    pinGrid("width: 300px; grid-template-columns: repeat(3, 50px)");
    control("justify-content")!.querySelector<HTMLElement>('[data-value="more"]')!.click();
    expect(texts(".row-menu .more-item")).toEqual([
      "space-betweenjustify-content",
      "space-aroundjustify-content",
      "space-evenlyjustify-content",
    ]);
    ui('.row-menu [data-value="space-between"]')!.click();
    expect(getElement(".grid").style.justifyContent).toBe("space-between");
    expect(checked("justify-content")).toEqual(["more"]);
  });

  it("set stretch for the rows", () => {
    pinGrid("width: 300px; height: 300px; grid-template-columns: 1fr; grid-template-rows: 50px 50px 50px");
    control("align-content")!.querySelector<HTMLElement>('[data-value="stretch"]')!.click();
    expect(getElement(".grid").style.alignContent).toBe("stretch");
  });

  it("are not on a flex container, which has its own Justify", () => {
    page(`<div class="grid" style="display: flex; width: 300px"><div>A</div></div>`);
    inspector().pin(getElement(".grid"));
    expect(control("align-content")).toBeNull();
  });

  it("fit a panel 320px wide with no sideways scroll", () => {
    pinGrid("width: 300px; height: 300px; grid-template-columns: repeat(3, 50px); grid-template-rows: 50px");
    ui(".panel")!.style.width = "320px";
    const body = ui(SPECS)!;
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  });
});
