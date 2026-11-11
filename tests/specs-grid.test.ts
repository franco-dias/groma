import { beforeEach, describe, expect, it } from "vitest";
import { all, el, inspector, openTab, page, reset, texts, ui } from "./helpers";

const SPECS = '.body[data-for="specs"]';

/** The row of buttons that sets a property of the container. */
const control = (property: string): HTMLElement => ui(`${SPECS} .flex-control[data-prop="${property}"]`)!;
const checked = (property: string): string[] =>
  Array.from(control(property).querySelectorAll<HTMLElement>('[aria-checked="true"]'), (b) => b.dataset.value!);
const press = (property: string, value: string): void =>
  control(property).querySelector<HTMLElement>(`[data-value="${value}"]`)!.click();

/** The row of the columns or the rows. */
const tracks = (axis: "columns" | "rows"): HTMLElement | null =>
  ui(`${SPECS} .tracks[data-prop="grid-template-${axis}"]`);
const sizes = (axis: "columns" | "rows"): string[] =>
  Array.from(tracks(axis)!.querySelectorAll(".track .value"), (node) => node.textContent ?? "");
const count = (axis: "columns" | "rows"): string => tracks(axis)!.querySelector(".track-count")!.textContent ?? "";
const step = (axis: "columns" | "rows", sign: "−" | "+"): void =>
  Array.from(tracks(axis)!.querySelectorAll<HTMLElement>(".step"))
    .find((button) => button.textContent === sign)!
    .click();

const doubleClick = (node: Element): boolean =>
  node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));

/** Double-clicks the size of a track, types over it and leaves the field. */
function retype(axis: "columns" | "rows", index: number, text: string): void {
  const field = tracks(axis)!.querySelector<HTMLElement>(`[data-track="${index}"]`)!;
  doubleClick(field);
  field.textContent = text;
  field.dispatchEvent(new FocusEvent("blur"));
}

const editRows = (): string[] => {
  openTab("edits");
  const rows = texts(".edit-row");
  openTab("specs");
  return rows;
};

const undo = (): void => {
  openTab("edits");
  ui('[data-action="undo"]')!.click();
  openTab("specs");
};

let grid: HTMLElement;

/** A grid 300px wide with three items; `style` adds to it. */
function pinGrid(style: string): HTMLElement {
  page(`
    <div class="grid" style="display: grid; width: 300px; ${style}">
      <div class="child">A</div><div>B</div><div>C</div>
    </div>
  `);
  grid = el(".grid");
  inspector().pin(grid);
  return grid;
}

beforeEach(reset);

describe("where a grid puts each item in its cell", () => {
  beforeEach(() => {
    pinGrid("grid-template-columns: repeat(3, 1fr)");
  });

  it("shows both axes as buttons, with the default read as stretch", () => {
    expect(texts(`${SPECS} .flex-control .label`)).toEqual(["Justify", "Align"]);
    expect(checked("justify-items")).toEqual(["stretch"]);
    expect(checked("align-items")).toEqual(["stretch"]);
  });

  it("says which axis each one works on, and names the property", () => {
    expect(texts(`${SPECS} .flex-control .hint`)).toEqual(["across each cell", "down each cell"]);
    expect(control("justify-items").querySelector<HTMLElement>(".label")!.title).toContain("justify-items");
    expect(control("justify-items").querySelector<HTMLElement>('[data-value="center"]')!.title).toBe(
      "justify-items: center",
    );
  });

  it("edits the page with a click", () => {
    press("justify-items", "center");
    press("align-items", "end");

    expect(getComputedStyle(grid).justifyItems).toBe("center");
    expect(getComputedStyle(grid).alignItems).toBe("end");
    expect(checked("justify-items")).toEqual(["center"]);
    expect(editRows()).toEqual(["justify-itemsnormal → center↩", "align-itemsnormal → end↩"]);
  });

  it("turns only the drawings that move the items down the cell", () => {
    const turn = (property: string): string =>
      getComputedStyle(control(property).querySelector('[data-value="center"] .icon')!).transform;
    expect(turn("justify-items")).toBe("none");
    expect(turn("align-items")).not.toBe("none");
  });
});

describe("the columns and rows of a grid", () => {
  it("shows the number of columns and each one's size, as the page declares them", () => {
    pinGrid("grid-template-columns: 100px repeat(2, 1fr)");
    expect(count("columns")).toBe("3");
    expect(sizes("columns")).toEqual(["100", "1fr", "1fr"]);
  });

  it("adds a column like the last one, and removes the last, as one edit of the list", () => {
    pinGrid("grid-template-columns: 1fr 1fr");
    step("columns", "+");
    expect(grid.style.gridTemplateColumns).toBe("repeat(3, 1fr)");
    expect(count("columns")).toBe("3");
    expect(editRows()).toHaveLength(1);

    step("columns", "−");
    step("columns", "−");
    expect(grid.style.gridTemplateColumns).toBe("1fr");
    // The last column cannot go.
    expect(tracks("columns")!.querySelector<HTMLButtonElement>(".step")!.disabled).toBe(true);

    undo();
    expect(count("columns")).toBe("2");
  });

  it("edits one column's size and leaves the others", () => {
    pinGrid("grid-template-columns: repeat(3, 1fr)");
    retype("columns", 1, "2fr");

    expect(grid.style.gridTemplateColumns).toBe("1fr 2fr 1fr");
    expect(sizes("columns")).toEqual(["1fr", "2fr", "1fr"]);
  });

  it("takes a bare number as pixels, and an emptied field as the column removed", () => {
    pinGrid("grid-template-columns: repeat(3, 1fr)");
    retype("columns", 0, "120");
    expect(grid.style.gridTemplateColumns).toBe("120px 1fr 1fr");

    retype("columns", 0, "");
    expect(grid.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
  });

  it("drops a size the browser rejects", () => {
    pinGrid("grid-template-columns: 1fr 1fr");
    retype("columns", 0, "banana");
    expect(grid.style.gridTemplateColumns).toBe("1fr 1fr");
  });

  it("says whether each column is fixed, hugs or fills, and changes it from a menu", () => {
    pinGrid("grid-template-columns: 100px auto 1fr");
    const intents = () => Array.from(tracks("columns")!.querySelectorAll<HTMLElement>(".track .intent"));
    expect(intents().map((button) => button.title.split(".")[0])).toEqual([
      "This column is fixed",
      "This column is hugging",
      "This column is filling",
    ]);

    intents()[0].click();
    expect(texts(".row-menu .more-item")).toEqual([
      "fixeda set size",
      "hugauto: as big as its content",
      "fill1fr: a share of the space left",
    ]);
    expect(texts('.row-menu [aria-checked="true"]')).toEqual(["fixeda set size"]);
    ui('.row-menu [data-value="fill"]')!.click();
    expect(grid.style.gridTemplateColumns).toBe("1fr auto 1fr");

    // Fixed keeps the size the column has now.
    const width = el(".child").getBoundingClientRect().width;
    intents()[0].click();
    ui('.row-menu [data-value="fixed"]')!.click();
    expect(parseFloat(grid.style.gridTemplateColumns)).toBeCloseTo(width);
  });

  it("keeps a list that is not one size per column as text, with the number laid out", () => {
    pinGrid("grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))");
    const row = tracks("columns")!;
    expect(row.querySelector(".stepper")).toBeNull();
    expect(row.querySelector(".value")!.textContent).toBe("repeat(auto-fill, minmax(100px, 1fr))");
    expect(row.querySelector(".hint")!.textContent).toBe("3 laid out");

    const field = row.querySelector<HTMLElement>(".value")!;
    doubleClick(field);
    field.textContent = "1fr 1fr";
    field.dispatchEvent(new FocusEvent("blur"));
    expect(count("columns")).toBe("2");
  });

  it("does not offer the sizes of a declaration the browser did not lay out", () => {
    page(`
      <style>
        .grid { display: grid; width: 300px; grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 1px) { .grid { grid-template-columns: 1fr; } }
      </style>
      <div class="grid"><div>A</div><div>B</div><div>C</div></div>
    `);
    inspector().pin(el(".grid"));
    expect(tracks("columns")!.querySelector(".stepper")).toBeNull();
    expect(tracks("columns")!.querySelector(".hint")!.textContent).toBe("3 laid out");
  });

  it("keeps the track sizes after one is fixed at a size layout rounds", () => {
    // Thirds of 100px are not whole pixels.
    pinGrid("width: 100px; grid-template-columns: repeat(3, 1fr)");
    tracks("columns")!.querySelector<HTMLElement>(".track .intent")!.click();
    ui('.row-menu [data-value="fixed"]')!.click();

    expect(grid.style.gridTemplateColumns).toMatch(/^33\.\d+px 1fr 1fr$/);
    expect(count("columns")).toBe("3");
  });

  it("shows a size inside a function with its unit", () => {
    pinGrid("grid-template-columns: minmax(100px, 1fr) 80px");
    expect(sizes("columns")).toEqual(["minmax(100px, 1fr)", "80"]);
  });

  it("shows many equal columns as one size, which changes them all", () => {
    pinGrid("grid-template-columns: repeat(6, 1fr)");
    expect(count("columns")).toBe("6");
    expect(sizes("columns")).toEqual(["1fr"]);
    expect(tracks("columns")!.querySelector(".track .hint")!.textContent).toBe("each");

    retype("columns", 0, "40");
    expect(grid.style.gridTemplateColumns).toBe("repeat(6, 40px)");
    step("columns", "−");
    step("columns", "−");
    // Four are few enough to show one by one.
    expect(sizes("columns")).toEqual(["40", "40", "40", "40"]);
  });

  it("shows no columns for a grid that declares none", () => {
    pinGrid("");
    expect(tracks("columns")).toBeNull();
    pinGrid("grid-template-columns: none");
    expect(tracks("columns")).toBeNull();
  });

  it("shows the rows only when the page declares them", () => {
    pinGrid("grid-template-columns: 1fr");
    expect(tracks("rows")).toBeNull();

    pinGrid("grid-template-columns: 1fr; grid-template-rows: 40px auto");
    // The third row is the grid's own.
    expect(count("rows")).toBe("2");
    expect(sizes("rows")).toEqual(["40", "auto"]);
    step("rows", "+");
    expect(grid.style.gridTemplateRows).toBe("40px auto auto");
  });

  it("is not there for an element that is not a grid", () => {
    page(`<div class="plain" style="width: 100px">Plain</div>`);
    inspector().pin(el(".plain"));
    expect(all(`${SPECS} .tracks`)).toEqual([]);
    expect(all(`${SPECS} .flex-control`)).toEqual([]);
  });
});

describe("an item of a grid", () => {
  const intents = (): string[] => texts(".intent");
  function choose(axis: "width" | "height", intent: string): void {
    ui(`.intent.is-${axis}`)!.click();
    ui(`.row-menu [data-value="${intent}"]`)!.click();
  }
  const pinChild = (gridStyle: string, childStyle = ""): HTMLElement => {
    page(`
      <div style="display: grid; width: 300px; height: 200px; grid-template-columns: 1fr 1fr; ${gridStyle}">
        <div class="child" style="${childStyle}">A</div><div>B</div>
      </div>
    `);
    inspector().pin(el(".child"));
    return el(".child");
  };

  it("reads as filling its cell on both axes, and as hugging in a grid that does not stretch", () => {
    pinChild("");
    expect(intents()).toEqual(["fill", "fill"]);

    pinChild("justify-items: start; align-items: center");
    expect(intents()).toEqual(["hug", "hug"]);

    pinChild("", "justify-self: end");
    expect(intents()).toEqual(["hug", "fill"]);
  });

  it("hugs and fills by its place in the cell, not by a width", () => {
    const child = pinChild("");
    choose("width", "hug");
    expect(child.style.justifySelf).toBe("start");
    expect(child.style.width).toBe("");
    expect(child.getBoundingClientRect().width).toBeLessThan(150);
    expect(intents()).toEqual(["hug", "fill"]);

    choose("width", "fill");
    expect(child.style.justifySelf).toBe("stretch");
    expect(child.getBoundingClientRect().width).toBe(150);

    choose("height", "hug");
    expect(child.style.alignSelf).toBe("start");
    expect(intents()).toEqual(["fill", "hug"]);
  });

  it("shows the columns and rows it takes when it is placed, to edit", () => {
    pinChild("");
    expect(ui(`${SPECS} [data-edits="grid-column"]`)).toBeNull();

    pinChild("", "grid-column: span 2; grid-row: 1 / 3");
    expect(ui(`${SPECS} [data-edits="grid-column"]`)!.textContent).toBe("span 2");
    expect(ui(`${SPECS} [data-edits="grid-row"]`)!.textContent).toBe("1 / 3");
  });
});
