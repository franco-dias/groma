import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clipboard,
  getElement,
  inspector,
  openTab,
  page,
  pressKey,
  pressShortcut,
  reset,
  texts,
  ui,
  wait,
} from "./helpers";

/** The value in the Specs tab that edits a CSS property. */
const value = (property: string): HTMLElement => ui(`.body[data-for="specs"] [data-edits="${property}"]`)!;

const doubleClick = (node: HTMLElement): boolean =>
  node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));

/** Double-clicks a value, types over it and leaves the field. */
function retype(property: string, text: string): void {
  const field = value(property);
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

let card: HTMLElement;

beforeEach(() => {
  reset();
  page(`
    <div class="card" style="display: flex; gap: 8px; width: 200px; height: 100px; padding: 12px 16px;
      margin-top: 4px; color: rgb(0, 128, 0); background-color: rgba(0, 0, 0, 0.5); border-radius: 4px;
      font-size: 14px; opacity: 0.8">Card</div>
  `);
  card = getElement(".card");
  inspector().pin(card);
});

describe("editing a value in the Specs tab", () => {
  it("turns a value into a field on double-click, holding the CSS value with its unit", () => {
    const gap = value("gap");
    expect(gap.textContent).toBe("8");
    expect(gap.isContentEditable).toBe(false);

    doubleClick(gap);
    expect(gap.isContentEditable).toBe(true);
    expect(gap.textContent).toBe("8px");
  });

  it("applies the edit to the page, marks the value and lists it in the Edits tab", () => {
    retype("gap", "20px");

    expect(getComputedStyle(card).gap).toBe("20px");
    expect(value("gap").textContent).toBe("20");
    expect(value("gap").classList.contains("is-edited")).toBe(true);
    expect(editRows()).toEqual(["gap8px → 20px↩"]);
  });

  it("takes a bare number as pixels where the property wants a length", () => {
    retype("gap", "24");
    expect(getComputedStyle(card).gap).toBe("24px");

    // Where a bare number is a value of its own, it stays one.
    retype("opacity", "0.5");
    expect(getComputedStyle(card).opacity).toBe("0.5");
  });

  it("edits width and height apart, in a size that still copies whole", async () => {
    // The size shown is the whole box; the field holds the CSS width, without the padding.
    expect(texts(".size-row .value")).toEqual(["232 × 124"]);
    doubleClick(value("width"));
    expect(value("width").textContent).toBe("200px");
    value("width").dispatchEvent(new FocusEvent("blur"));

    retype("width", "240");
    expect(getComputedStyle(card).width).toBe("240px");
    expect(getComputedStyle(card).height).toBe("100px");

    ui(".size-row .value")!.click();
    await wait(0);
    expect(clipboard.text).toBe("272 × 124");
  });

  it("names the box that width and height set, and lets it be changed", () => {
    expect(texts(".block-head .note")).toContain("content-box");
    expect(value("width").title).toContain("content-box");

    retype("box-sizing", "border-box");
    expect(getComputedStyle(card).boxSizing).toBe("border-box");
    expect(texts(".block-head .note")).toContain("border-box");
    // Now the field holds the size shown, and says nothing more.
    expect(texts(".size-row .value")).toEqual(["200 × 100"]);
    expect(value("width").title).not.toContain("content-box");
  });

  it("edits all four sides at once from the name of the ring, with bare numbers as pixels", () => {
    const padding = value("padding");
    expect(padding.textContent).toBe("padding");
    doubleClick(padding);
    expect(padding.textContent).toBe("12px 16px");

    padding.textContent = "20 8";
    padding.dispatchEvent(new FocusEvent("blur"));
    expect(getComputedStyle(card).padding).toBe("20px 8px");
    expect(value("padding").textContent).toBe("padding");
    expect(editRows()).toEqual(["padding12px 16px → 20px 8px↩"]);

    retype("margin", "10");
    expect(getComputedStyle(card).margin).toBe("10px");
  });

  it("edits each side of the box", () => {
    retype("padding-left", "30px");
    retype("margin-top", "10px");
    expect(getComputedStyle(card).paddingLeft).toBe("30px");
    expect(getComputedStyle(card).paddingRight).toBe("16px");
    expect(getComputedStyle(card).marginTop).toBe("10px");
  });

  it("edits a colour, and offers a translucent one with its alpha", () => {
    retype("color", "#ff0000");
    expect(getComputedStyle(card).color).toBe("rgb(255, 0, 0)");

    const background = value("background-color");
    doubleClick(background);
    expect(background.textContent).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("edits typography", () => {
    retype("font-size", "18px");
    retype("font-weight", "700");
    expect(getComputedStyle(card).fontSize).toBe("18px");
    expect(getComputedStyle(card).fontWeight).toBe("700");
  });

  it("drops a value the browser rejects and keeps what was there", () => {
    retype("gap", "banana");
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(value("gap").textContent).toBe("8");
    expect(editRows()).toEqual([]);
  });

  it("cancels on Escape", () => {
    const gap = value("gap");
    doubleClick(gap);
    gap.textContent = "99px";
    pressKey(gap, "Escape");

    expect(getComputedStyle(card).gap).toBe("8px");
    expect(value("gap").textContent).toBe("8");
    expect(value("gap").isContentEditable).toBe(false);
  });

  it("applies on Enter", () => {
    const gap = value("gap");
    doubleClick(gap);
    gap.textContent = "12px";
    // Enter leaves the field; a synthetic key does not move the focus, so the test does.
    pressKey(gap, "Enter");
    gap.dispatchEvent(new FocusEvent("blur"));
    expect(getComputedStyle(card).gap).toBe("12px");
  });

  it("nudges a number with the arrow keys, live, as one step to undo", () => {
    const gap = value("gap");
    doubleClick(gap);
    pressKey(gap, "ArrowUp");
    pressShortcut(gap, { key: "ArrowUp", shiftKey: true });
    expect(getComputedStyle(card).gap).toBe("19px");
    expect(gap.textContent).toBe("19px");
    gap.dispatchEvent(new FocusEvent("blur"));

    openTab("edits");
    ui('[data-action="undo"]')!.click();
    expect(getComputedStyle(card).gap).toBe("8px");
  });

  it("removes the edit when the field is emptied", () => {
    retype("gap", "20px");
    retype("gap", "");
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(value("gap").classList.contains("is-edited")).toBe(false);
    expect(editRows()).toEqual([]);
  });

  it("copies on a single click as before, and not while the value is a field", async () => {
    const gap = value("gap");
    gap.click();
    await wait(0);
    expect(clipboard.text).toBe("8px");

    clipboard.text = "";
    doubleClick(gap);
    gap.click();
    await wait(0);
    expect(clipboard.text).toBe("");
  });

  it("leaves values made of several properties to copy only", () => {
    const labels = texts(".cell .label, .wide .label");
    expect(labels).toContain("Display");
    const editableLabels = Array.from(
      document.querySelector("groma-inspector")!.shadowRoot!.querySelectorAll(".cell, .wide"),
    )
      .filter((row) => row.querySelector("[data-edits]"))
      .map((row) => row.querySelector(".label")!.textContent);
    expect(editableLabels).toEqual(expect.arrayContaining(["Display", "Gap", "Radius", "Size", "Weight"]));
    expect(editableLabels).not.toContain("X");
    expect(editableLabels).not.toContain("Border");
  });
});

const colour = (label: string): string => {
  const row = Array.from(ui('.body[data-for="specs"]')!.querySelectorAll(".cell, .wide")).find(
    (candidate) => candidate.querySelector(".label")!.textContent === label,
  )!;
  return getComputedStyle(row.querySelector(".value")!).color;
};

describe("telling editable values from the rest", () => {
  it("dims the values that only copy", () => {
    page(
      `<div class="card" style="display: flex; position: relative; top: 2px; border: 1px solid red">Card</div>`,
    );
    inspector().pin(getElement(".card"));

    expect(colour("Border")).toBe(colour("Position"));
    expect(colour("Border")).not.toBe(colour("Display"));
  });
});

const control = (prop: string): HTMLElement => ui(`.flex-control[data-prop="${prop}"]`)!;

const turn = (prop: string, choice: string): string =>
  getComputedStyle(control(prop).querySelector(`[data-value="${choice}"] .icon`)!).transform;

const press = (prop: string, choice: string): void =>
  control(prop).querySelector<HTMLElement>(`[data-value="${choice}"]`)!.click();

const checked = (prop: string): string[] =>
  Array.from(
    control(prop).querySelectorAll<HTMLElement>('[aria-checked="true"]'),
    (node) => node.dataset.value!,
  );

describe("a flex container's direction and alignment", () => {
  const TURNED = "matrix(0, 1, -1, 0, 0, 0)";

  it("shows them as buttons, with the current value checked and the defaults read as what they do", () => {
    expect(checked("flex-direction")).toEqual(["row"]);
    // "normal" packs the items at the start and stretches them.
    expect(checked("justify-content")).toEqual(["flex-start"]);
    expect(checked("align-items")).toEqual(["stretch"]);
  });

  it("says which axis each one works on, and names the property", () => {
    expect(texts('.flex-control[data-prop="justify-content"] .hint')).toEqual(["along the direction"]);
    expect(texts('.flex-control[data-prop="align-items"] .hint')).toEqual(["across the direction"]);
    expect(control("align-items").querySelector<HTMLElement>(".label")!.title).toContain("align-items");
    expect(control("align-items").querySelector<HTMLElement>('[data-value="center"]')!.title).toBe(
      "align-items: center",
    );
  });

  it("edits the page with a click, as one edit each", () => {
    press("justify-content", "more");
    press("justify-content", "space-between");
    press("align-items", "center");
    press("flex-direction", "column");

    expect(getComputedStyle(card).justifyContent).toBe("space-between");
    expect(getComputedStyle(card).alignItems).toBe("center");
    expect(getComputedStyle(card).flexDirection).toBe("column");
    expect(checked("justify-content")).toEqual(["more"]);
    expect(editRows()).toEqual([
      "justify-contentnormal → space-between↩",
      "align-itemsnormal → center↩",
      "flex-directionrow → column↩",
    ]);
  });

  it("makes no edit for the value that is already there", () => {
    press("flex-direction", "row");
    expect(editRows()).toEqual([]);
  });

  it("turns the drawings to the axis each one moves the items on", () => {
    // In a row, justify works left to right and align top to bottom.
    expect(turn("justify-content", "center")).toBe("none");
    expect(turn("align-items", "center")).toBe(TURNED);

    press("flex-direction", "column");
    expect(turn("justify-content", "center")).toBe(TURNED);
    expect(turn("align-items", "center")).toBe("none");
  });

  it("offers the ways to share out the space as a menu that names the property", () => {
    press("justify-content", "more");
    expect(texts(".row-menu .more-item")).toEqual([
      "space-betweenjustify-content",
      "space-aroundjustify-content",
      "space-evenlyjustify-content",
    ]);
    expect(texts('.row-menu [aria-checked="true"]')).toEqual([]);

    press("justify-content", "space-evenly");
    expect(getComputedStyle(card).justifyContent).toBe("space-evenly");
    expect(ui(".row-menu")).toBeNull();
    // The button that opens the menu is the checked one, and says the value.
    expect(checked("justify-content")).toEqual(["more"]);
    expect(control("justify-content").querySelector<HTMLElement>('[data-value="more"]')!.title).toBe(
      "justify-content: space-evenly",
    );
    press("justify-content", "more");
    expect(texts('.row-menu [aria-checked="true"]')).toEqual(["space-evenlyjustify-content"]);
  });

  it("shows a value no button stands for as text to edit", () => {
    page(`<div class="card" style="display: flex; align-items: baseline">Card</div>`);
    inspector().pin(getElement(".card"));
    expect(checked("align-items")).toEqual([]);
    expect(value("align-items").textContent).toBe("baseline");
  });

  it("is not there for an element that is not a flex container", () => {
    page(`<div class="card">Card</div>`);
    inspector().pin(getElement(".card"));
    expect(ui(".flex-controls")).toBeNull();
  });
});

const pinChild = (html: string): HTMLElement => {
  page(html);
  inspector().pin(getElement(".child"));
  return getElement(".child");
};

/** Opens the menu of an axis and picks an intent. */
function choose(axis: "width" | "height", intent: string): void {
  ui(`.intent.is-${axis}`)!.click();
  ui(`.row-menu [data-value="${intent}"]`)!.click();
}

const intents = (): string[] => texts(".intent");

describe("fixed, hug and fill", () => {
  it("opens a menu on the intent, with the current one checked, and closes it on a click elsewhere", () => {
    pinChild(`<div style="width: 400px"><div class="child" style="width: 120px">Child</div></div>`);
    ui(".intent.is-width")!.click();
    expect(texts(".row-menu .more-item")).toEqual([
      "fixeda set size",
      "hugas big as its content",
      "fillas big as its parent allows",
    ]);
    expect(texts('.row-menu [aria-checked="true"]')).toEqual(["fixeda set size"]);

    ui(".block-head")!.click();
    expect(ui(".row-menu")).toBeNull();
  });

  it("sizes a child of a block with its width alone", () => {
    const child = pinChild(
      `<div style="width: 400px"><div class="child" style="width: 120px">Child</div></div>`,
    );
    choose("width", "fill");
    expect(child.style.width).toBe("100%");
    expect(child.offsetWidth).toBe(400);
    expect(intents()).toEqual(["fill", "hug"]);

    choose("width", "hug");
    expect(child.style.width).toBe("fit-content");
    expect(child.offsetWidth).toBeLessThan(120);
    expect(intents()).toEqual(["hug", "hug"]);

    choose("width", "fixed");
    expect(parseFloat(child.style.width)).toBeCloseTo(child.getBoundingClientRect().width, 1);
    expect(intents()).toEqual(["fixed", "hug"]);
  });

  it("fills along a flex parent by growing, and across it by stretching", () => {
    const child = pinChild(`
      <div style="display: flex; align-items: flex-start; width: 400px; height: 200px">
        <div class="child" style="width: 120px">Child</div>
      </div>
    `);
    choose("width", "fill");
    expect(child.offsetWidth).toBe(400);
    choose("height", "fill");
    expect(child.offsetHeight).toBe(200);
    expect(intents()).toEqual(["fill", "fill"]);

    choose("height", "hug");
    expect(child.offsetHeight).toBeLessThan(200);
    expect(intents()).toEqual(["fill", "hug"]);
  });

  it("undoes a choice that set two properties in one step, and lists both", () => {
    const child = pinChild(`
      <div style="display: flex; width: 400px"><div class="child" style="width: 120px">Child</div></div>
    `);
    choose("width", "fill");
    expect(editRows()).toEqual(["width120px → auto↩", "flex-grow0 → 1↩"]);

    openTab("edits");
    ui('[data-action="undo"]')!.click();
    expect(child.offsetWidth).toBe(120);
    expect(texts(".edit-row")).toEqual([]);
    ui('[data-action="redo"]')!.click();
    expect(child.offsetWidth).toBe(400);
  });

  it("leaves alone a property that already has the value", () => {
    pinChild(`<div style="width: 400px"><div class="child" style="width: 120px">Child</div></div>`);
    choose("width", "fixed");
    expect(editRows()).toEqual([]);
  });
});

afterEach(() => wait(0));

const stage = (style: string) =>
  pinChild(`
    <div style="position: relative; width: 300px; height: 200px">
      <div class="child" style="position: absolute; ${style}">Child</div>
    </div>
  `);

describe("what the stress test on a real design found", () => {
  it("makes no edit on an element the page has removed, and keeps working", () => {
    card.remove();
    retype("gap", "20px");
    expect(editRows()).toEqual([]);

    page(`<div class="other" style="display: flex; gap: 4px">Other</div>`);
    inspector().pin(getElement(".other"));
    expect(value("gap").textContent).toBe("4");
  });

  it("puts the edit on the element the page drew again", () => {
    const again = card.cloneNode(true) as HTMLElement;
    card.replaceWith(again);
    retype("gap", "20px");

    expect(getComputedStyle(again).gap).toBe("20px");
    expect(editRows()).toEqual(["gap8px → 20px↩"]);
  });

  it("keeps the size of a `flex: 1` item that is made fixed, and hugs it to its content", () => {
    const child = pinChild(`
      <div style="display: flex; width: 400px">
        <div class="child" style="flex: 1 1 0px; min-width: 0">Child</div>
      </div>
    `);
    expect(intents()).toEqual(["fill", "fill"]);

    choose("width", "fixed");
    expect(child.getBoundingClientRect().width).toBe(400);
    expect(intents()[0]).toBe("fixed");

    choose("width", "hug");
    const width = child.getBoundingClientRect().width;
    expect(width).toBeGreaterThan(10);
    expect(width).toBeLessThan(100);
  });

  it("makes no edit for the intent the element already has, declared or not", () => {
    // It fills by default; `width: 100%` would push its padding out of the parent.
    pinChild(`<div style="width: 400px"><div class="child" style="padding: 8px">Child</div></div>`);
    expect(intents()[0]).toBe("fill");
    choose("width", "fill");

    expect(getElement(".child").style.width).toBe("");
    expect(ui(".row-menu")).toBeNull();
    expect(editRows()).toEqual([]);
  });

  it("reads an absolute element by the sides it is pinned to", () => {
    stage("top: 0; bottom: 0; left: 0");
    expect(intents()).toEqual(["hug", "fill"]);

    stage("inset: 0");
    expect(intents()).toEqual(["fill", "fill"]);

    stage("top: 0; left: 0");
    expect(intents()).toEqual(["hug", "hug"]);
  });
});
