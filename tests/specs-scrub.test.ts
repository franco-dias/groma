import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clipboard, getElement, inspector, openTab, page, pressEscape, reset, texts, ui } from "./helpers";

const SPECS = '.body[data-for="specs"]';
/** The value in the Specs tab that edits a CSS property. */
const value = (property: string): HTMLElement => ui(`${SPECS} [data-edits="${property}"]`)!;

/** A pointer event of the one mouse pointer, at `x`. */
function pointer(node: Element, { type, x, ...init }: PointerEventInit & { type: string; x: number }): void {
  node.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: 10,
      bubbles: true,
      composed: true,
      cancelable: true,
      ...init,
    }),
  );
}

const press = (node: Element, init?: PointerEventInit): void =>
  pointer(node, { type: "pointerdown", x: 100, ...init });
const moveTo = (node: Element, x: number): void => pointer(node, { type: "pointermove", x });
/** Moves with modifier keys held, or another button. */
const moveHolding = (node: Element, init: PointerEventInit & { x: number }): void =>
  pointer(node, { type: "pointermove", ...init });
/** Lets go, and then the click the browser sends at the end of a press. */
function release(node: Element, x: number): void {
  pointer(node, { type: "pointerup", x });
  node.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }));
}

/** The tab redraws after a drag, a moment after the click that ends it: wait for that. */
const redrawn = (node: Element): Promise<void> => vi.waitFor(() => expect(node.isConnected).toBe(false));

/** A whole drag: press at 100, move to `x`, let go, and wait for the tab to show the result. */
async function drag(property: string, move: PointerEventInit & { x: number }): Promise<void> {
  const { x, ...init } = move;
  const node = value(property);
  press(node, init);
  moveHolding(node, move);
  release(node, x);
  await redrawn(node);
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
const canUndo = (): boolean => {
  openTab("edits");
  const can = !ui<HTMLButtonElement>('[data-action="undo"]')!.disabled;
  openTab("specs");
  return can;
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

afterEach(() => vi.restoreAllMocks());

describe("dragging a number in the Specs tab", () => {
  it("changes the value live, one per pixel, and the text in place", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 104);
    expect(getComputedStyle(card).gap).toBe("12px");
    // The same node, not a new one: the panel does not rebuild under the pointer.
    expect(node.textContent).toBe("12");
    expect(node.classList.contains("is-scrubbing")).toBe(true);

    moveTo(node, 95);
    expect(getComputedStyle(card).gap).toBe("3px");
    release(node, 95);
    expect(node.classList.contains("is-scrubbing")).toBe(false);
    await redrawn(node);
    expect(editRows()).toEqual(["gap8px → 3px↩"]);
  });

  it("is a click until the pointer has moved 3 pixels", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 102);
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(node.classList.contains("is-scrubbing")).toBe(false);
    release(node, 102);
    expect(clipboard.text).toBe("8px");
    expect(editRows()).toEqual([]);
  });

  it("does not copy at the end of a drag", async () => {
    await drag("gap", { x: 120 });
    expect(clipboard.text).toBe("");
  });

  it("copies again on the next click", async () => {
    await drag("gap", { x: 120 });
    const node = value("gap");
    press(node);
    release(node, 100);
    expect(clipboard.text).toBe("28px");
  });

  it("still opens the field on a double-click", async () => {
    const node = value("gap");
    press(node);
    release(node, 100);
    node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
    expect(node.isContentEditable).toBe(true);
    expect(node.textContent).toBe("8px");
    // In a field a press and a drag belong to the text.
    moveTo(node, 130);
    expect(getComputedStyle(card).gap).toBe("8px");
  });

  it("steps by 10 with Shift and by 0.1 with Alt", async () => {
    await drag("gap", { x: 102 + 1, shiftKey: true });
    expect(getComputedStyle(card).gap).toBe("38px");
    undo();
    await drag("gap", { x: 105, altKey: true });
    expect(getComputedStyle(card).gap).toBe("8.5px");
  });

  it("changes the step in the middle of a drag without a jump", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 105);
    expect(getComputedStyle(card).gap).toBe("13px");
    // Shift pressed at the same x: the value stays; from here each pixel is 10.
    moveHolding(node, { x: 105, shiftKey: true });
    expect(getComputedStyle(card).gap).toBe("13px");
    moveHolding(node, { x: 107, shiftKey: true });
    expect(getComputedStyle(card).gap).toBe("33px");
    release(node, 107);
    await redrawn(node);
    expect(editRows()).toEqual(["gap8px → 33px↩"]);
  });

  it("is one step to undo, however long the drag lasts", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const node = value("gap");
    press(node);
    for (const x of [104, 110, 120]) {
      moveTo(node, x);
      // Longer than the pause that ends a run of arrow-key presses.
      now += 5_000;
    }
    release(node, 120);
    expect(getComputedStyle(card).gap).toBe("28px");
    await redrawn(node);

    undo();
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(editRows()).toEqual([]);
    expect(canUndo()).toBe(false);
  });

  it("computes from the start and the distance, so coming back leaves no edit", async () => {
    const node = value("gap");
    press(node);
    for (const x of [110, 133, 91, 117, 100]) moveTo(node, x);
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(node.textContent).toBe("8");
    release(node, 100);
    await redrawn(node);

    expect(card.style.gap).toBe("8px");
    expect(value("gap").classList.contains("is-edited")).toBe(false);
    expect(editRows()).toEqual([]);
    expect(canUndo()).toBe(false);
  });

  it("leaves the earlier edit as it was when a second drag comes back to where it started", async () => {
    await drag("gap", { x: 110 });
    expect(canUndo()).toBe(true);
    // The panel shows the new value after its redraw.
    const node = value("gap");
    press(node);
    moveTo(node, 130);
    moveTo(node, 100);
    release(node, 100);
    await redrawn(node);
    expect(getComputedStyle(card).gap).toBe("18px");
    expect(editRows()).toEqual(["gap8px → 18px↩"]);
    // The second drag left no step of its own: one undo goes back to the page's value.
    undo();
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(canUndo()).toBe(false);
  });

  it("drags the width, which shows the whole box", async () => {
    expect(value("width").textContent).toBe("232");
    await drag("width", { x: 110 });
    expect(getComputedStyle(card).width).toBe("210px");
    expect(value("width").textContent).toBe("242");
  });

  it("does not apply a negative width, and lets a margin go below zero", async () => {
    await drag("width", { x: -400 });
    // Where CSS rejects the value the page keeps the last one it took.
    expect(parseFloat(getComputedStyle(card).width)).toBeGreaterThanOrEqual(0);
    expect(card.style.width).not.toMatch(/-/);

    await drag("margin-top", { x: 80 });
    expect(getComputedStyle(card).marginTop).toBe("-16px");
  });

  it("drags opacity, radius, a side of the padding and the font size", async () => {
    await drag("border-radius", { x: 108 });
    expect(getComputedStyle(card).borderTopLeftRadius).toBe("12px");
    await drag("padding-left", { x: 104 });
    expect(getComputedStyle(card).paddingLeft).toBe("20px");
    await drag("font-size", { x: 102 + 2 });
    expect(getComputedStyle(card).fontSize).toBe("18px");
    // Opacity is a fraction: 0.001 per pixel with Alt (it was 0.1, which made 0.3 here).
    await drag("opacity", { x: 95, altKey: true });
    expect(getComputedStyle(card).opacity).toBe("0.795");
  });

  it("says in the tooltip which values can be dragged", async () => {
    expect(value("gap").title).toBe("Click to copy · double-click to edit · drag to change");
    expect(value("color").title).toBe("Click to copy · double-click to edit");
    expect(value("display").title).toBe("Click to copy · double-click to edit");
  });

  it("does not drag a color or a keyword", async () => {
    for (const property of ["color", "display"]) {
      const node = value(property);
      const before = node.textContent;
      press(node);
      moveTo(node, 160);
      release(node, 160);
      expect(node.textContent).toBe(before);
      expect(node.classList.contains("is-scrubbing")).toBe(false);
    }
    expect(editRows()).toEqual([]);
  });

  it("ignores a press of another button", async () => {
    const node = value("gap");
    press(node, { button: 2 });
    moveTo(node, 130);
    expect(getComputedStyle(card).gap).toBe("8px");
  });

  it("ends the drag when the browser cancels the pointer", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 110);
    pointer(node, { type: "pointercancel", x: 110 });
    expect(node.classList.contains("is-scrubbing")).toBe(false);
    moveTo(node, 150);
    expect(getComputedStyle(card).gap).toBe("18px");
    await redrawn(node);
    expect(editRows()).toEqual(["gap8px → 18px↩"]);
  });
});

describe("dragging a number in rem mode", () => {
  beforeEach(() => ui('[data-option="unit"] [data-value="rem"]')!.click());

  it("steps by a quarter per pixel and saves rem", async () => {
    await drag("gap", { x: 104 });

    expect(card.style.gap).toBe("1.5rem");
    expect(getComputedStyle(card).gap).toBe("24px");
    expect(editRows()).toEqual(["gap8px → 1.5rem↩"]);
  });

  it("steps by 1 with Shift and by 0.0625 with Alt", async () => {
    await drag("gap", { x: 104, shiftKey: true });
    expect(card.style.gap).toBe("4.5rem");
    undo();
    await drag("gap", { x: 104, altKey: true });

    expect(card.style.gap).toBe("0.75rem");
  });

  it("leaves no edit when the drag comes back", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 130);
    moveTo(node, 100);
    release(node, 100);
    await redrawn(node);

    expect(editRows()).toEqual([]);
    expect(card.style.gap).toBe("8px");
  });
});

describe("dragging opacity", () => {
  it("steps by 0.01 per pixel, 0.1 with Shift and 0.001 with Alt", async () => {
    await drag("opacity", { x: 95 });
    expect(card.style.opacity).toBe("0.75");
    undo();
    await drag("opacity", { x: 97, shiftKey: true });
    expect(card.style.opacity).toBe("0.5");
    undo();
    await drag("opacity", { x: 105, altKey: true });

    expect(card.style.opacity).toBe("0.805");
  });

  it.each([
    { x: 400, opacity: "1" },
    { x: -400, opacity: "0" },
  ])("stays within 0 and 1: a drag to $x ends at $opacity", async ({ x, opacity }) => {
    await drag("opacity", { x });

    expect(card.style.opacity).toBe(opacity);
  });
});

describe("pressing Esc during a drag", () => {
  it("puts the value back with no edit and no step to undo", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 130);
    expect(getComputedStyle(card).gap).toBe("38px");
    pressEscape();

    expect(getComputedStyle(card).gap).toBe("8px");
    expect(node.textContent).toBe("8");
    expect(node.classList.contains("is-scrubbing")).toBe(false);
    expect(editRows()).toEqual([]);
    expect(canUndo()).toBe(false);
  });

  it("ignores the pointer after it, and the click that ends the drag does not copy", async () => {
    const node = value("gap");
    press(node);
    moveTo(node, 130);
    pressEscape();
    moveTo(node, 150);
    release(node, 150);

    expect(getComputedStyle(card).gap).toBe("8px");
    expect(clipboard.text).toBe("");
  });

  it("goes back to the earlier edit when there was one", async () => {
    await drag("gap", { x: 110 });
    const node = value("gap");
    press(node);
    moveTo(node, 140);
    pressEscape();
    release(node, 140);

    expect(getComputedStyle(card).gap).toBe("18px");
    expect(editRows()).toEqual(["gap8px → 18px↩"]);
    undo();
    expect(getComputedStyle(card).gap).toBe("8px");
    expect(canUndo()).toBe(false);
  });

  it("does nothing when no drag is going on", async () => {
    pressEscape();

    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(false);
    expect(editRows()).toEqual([]);
  });
});
