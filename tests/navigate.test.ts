import { beforeEach, describe, expect, it } from "vitest";
import { doubleClick, getElement, inspector, page, reset, ui } from "./helpers";

/** A key the way the browser sends it, from `target`: it can be cancelled, and it crosses the shadow root. */
function press(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(event);
  return event;
}

/** A key typed with the focus on the panel, on a tab button. */
const pressInPanel = (key: string): KeyboardEvent => press(ui(".tab")!, key);

const pinned = (): Element | null => inspector().pinnedElement();

beforeEach(() => {
  reset();
  page(`
    <main class="root">
      <section class="a">
        <p class="a1">one</p>
        <script class="skipped"></script>
        <p class="a2">two</p>
        <p class="hidden" style="display: none">hidden</p>
        <p class="a4">four</p>
      </section>
      <section class="b"></section>
      <input class="field" value="text">
    </main>
  `);
  inspector().pin(getElement(".a"));
});

describe("arrow keys with the focus in the panel", () => {
  it("move the pin to the first child, and on to the siblings, skipping what cannot be inspected", () => {
    pressInPanel("ArrowDown");
    expect(pinned()).toBe(getElement(".a1"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".a2"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".a4"));
    pressInPanel("ArrowLeft");
    expect(pinned()).toBe(getElement(".a2"));
  });

  it("move the pin to the parent", () => {
    inspector().pin(getElement(".a2"));
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(getElement(".a"));
  });

  it("move the pin to the next section and back", () => {
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".b"));
    pressInPanel("ArrowLeft");
    expect(pinned()).toBe(getElement(".a"));
  });

  it("keep the key from the page", () => {
    expect(pressInPanel("ArrowDown").defaultPrevented).toBe(true);
  });

  it("do nothing at the ends: no further sibling, no child, nothing above body", () => {
    inspector().pin(getElement(".a4"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".a4"));
    pressInPanel("ArrowDown");
    expect(pinned()).toBe(getElement(".a4"));

    inspector().pin(document.body);
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(document.body);
  });

  it("go up to body and no further", () => {
    inspector().pin(getElement(".root"));
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(document.getElementById("fixture"));
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(document.body);
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(document.body);
  });

  it("do nothing with a modifier held", () => {
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      shiftKey: true,
      bubbles: true,
      composed: true,
    });
    ui(".tab")!.dispatchEvent(event);
    expect(pinned()).toBe(getElement(".a"));
  });

  it("stay the panel's while a menu is open", () => {
    ui(".more-button")!.click();
    expect(pressInPanel("ArrowDown").defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });

  it("stay a field's while a Specs value is open as a field", () => {
    page(`<div class="row" style="display: flex; gap: 8px; width: 100px; height: 20px">Row</div>`);
    inspector().pin(getElement(".row"));
    const gap = ui<HTMLElement>('.body[data-for="specs"] [data-edits="gap"]')!;
    doubleClick(gap);
    expect(press(gap, "ArrowUp").defaultPrevented).toBe(true);
    expect(gap.textContent).toBe("9px");
    expect(pinned()).toBe(getElement(".row"));
  });

  it("stay an input's, in the All CSS tab", () => {
    ui('.tab[data-tab="css"]')!.click();
    const search = ui<HTMLInputElement>(".search input")!;
    expect(press(search, "ArrowDown").defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });
});

describe("arrow keys on the page", () => {
  it("are the page's while inspect mode is not locked", () => {
    const event = press(getElement(".a1"), "ArrowDown");
    expect(event.defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });

  it("move the pin while inspect mode is locked, and keep the key from the page", () => {
    ui(".launcher")!.click();
    const event = press(getElement(".a1"), "ArrowDown");
    expect(event.defaultPrevented).toBe(true);
    expect(pinned()).toBe(getElement(".a1"));
    press(document.body, "ArrowRight");
    expect(pinned()).toBe(getElement(".a2"));
  });

  it("are a page field's while it has the focus, even when locked", () => {
    ui(".launcher")!.click();
    const event = press(getElement(".field"), "ArrowLeft");
    expect(event.defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });

  it("are the page's while text is being edited on the page", () => {
    ui(".launcher")!.click();
    doubleClick(getElement(".a1"));
    expect(getElement(".a1").isContentEditable).toBe(true);
    const before = pinned();
    const event = press(getElement(".a1"), "ArrowRight");
    expect(event.defaultPrevented).toBe(false);
    expect(pinned()).toBe(before);
  });
});

describe("the moved pin", () => {
  it("is scrolled into view when it is off screen, and nothing else is done to the page", () => {
    page(`<section class="a"><p class="a1" style="margin-top: 4000px">far</p></section>`);
    inspector().pin(getElement(".a"));
    window.scrollTo(0, 0);
    pressInPanel("ArrowDown");
    expect(pinned()).toBe(getElement(".a1"));
    const { top, bottom } = getElement(".a1").getBoundingClientRect();
    expect(top >= 0 && bottom <= window.innerHeight).toBe(true);
    window.scrollTo(0, 0);
  });
});
