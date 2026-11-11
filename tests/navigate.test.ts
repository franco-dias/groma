import { beforeEach, describe, expect, it } from "vitest";
import { doubleClick, getElement, inspector, page, reset, ui } from "./helpers";

/** A key the way the browser sends it, from `target`: it can be cancelled, and it crosses the shadow root. */
function type(target: Element, keys: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { ...keys, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(event);
  return event;
}

/** Alt and a key, from `target`. */
const press = (target: Element, key: string): KeyboardEvent => type(target, { key, altKey: true });

/** The key alone. */
const pressPlain = (target: Element, key: string): KeyboardEvent => type(target, { key });

/** Alt and a key typed with the focus on the panel, on a tab button. */
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

describe("Alt and an arrow key with the focus in the panel", () => {
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

  it("do nothing at the ends: no child, nothing above body, nothing after the page's last element", () => {
    inspector().pin(getElement(".a4"));
    pressInPanel("ArrowDown");
    expect(pinned()).toBe(getElement(".a4"));

    inspector().pin(document.body);
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(document.body);
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(document.body);
    pressInPanel("ArrowLeft");
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

  it("do nothing with another modifier held", () => {
    const event = type(ui(".tab")!, { key: "ArrowDown", altKey: true, shiftKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });

  it("do nothing without Alt: a plain arrow key is not the inspector's", () => {
    expect(pressPlain(ui(".tab")!, "ArrowDown").defaultPrevented).toBe(false);
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
    expect(pressPlain(gap, "ArrowUp").defaultPrevented).toBe(true);
    expect(gap.textContent).toBe("9px");
    press(gap, "ArrowUp");
    expect(pinned()).toBe(getElement(".row"));
  });

  it("stay an input's, in the All CSS tab", () => {
    ui('.tab[data-tab="css"]')!.click();
    const search = ui<HTMLInputElement>(".search input")!;
    expect(press(search, "ArrowDown").defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });
});

describe("Alt and an arrow key with the focus on the page", () => {
  it("move the pin, with no click in the panel and no lock, and keep the key from the page", () => {
    const event = press(document.body, "ArrowDown");
    expect(event.defaultPrevented).toBe(true);
    expect(pinned()).toBe(getElement(".a1"));
    press(document.body, "ArrowRight");
    expect(pinned()).toBe(getElement(".a2"));
  });

  it("leave a plain arrow key to the page, also while inspect mode is locked", () => {
    ui(".launcher")!.click();
    const event = pressPlain(getElement(".a1"), "ArrowDown");
    expect(event.defaultPrevented).toBe(false);
    expect(pinned()).toBe(getElement(".a"));
  });

  it("do nothing with no element pinned", () => {
    ui<HTMLElement>(".close")!.click();
    expect(press(document.body, "ArrowDown").defaultPrevented).toBe(false);
  });

  it("are a page field's while it has the focus", () => {
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

describe("past the first and the last sibling", () => {
  beforeEach(() => {
    page(`
      <header class="head"><h1 class="title">Title</h1><p class="lead">Lead</p></header>
      <div class="cards">
        <article class="dark"><h2 class="dark-title">Dark</h2></article>
        <article class="light">Light</article>
      </div>
      <footer class="foot">Foot</footer>
    `);
  });

  it("→ goes on to the first child of the parent's next sibling, and ← comes back", () => {
    inspector().pin(getElement(".lead"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".dark"));
    pressInPanel("ArrowLeft");
    expect(pinned()).toBe(getElement(".lead"));
  });

  it("← goes on to the last child of the parent's previous sibling", () => {
    inspector().pin(getElement(".dark"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".light"));
    pressInPanel("ArrowLeft");
    pressInPanel("ArrowLeft");
    expect(pinned()).toBe(getElement(".lead"));
  });

  it("ends on the parent's sibling itself when it has no children", () => {
    inspector().pin(getElement(".light"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".foot"));
  });

  it("climbs as many levels as it takes, and comes back down no deeper than it was", () => {
    inspector().pin(getElement(".dark-title"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".light"));
    inspector().pin(getElement(".dark-title"));
    pressInPanel("ArrowLeft");
    expect(pinned()).toBe(getElement(".lead"));
  });
});

describe("a wrapper with no box of its own (display: contents)", () => {
  beforeEach(() => {
    page(`
      <ul class="list">
        <li class="one">one</li>
        <div class="wrap" style="display: contents"><li class="two">two</li><li class="three">three</li></div>
        <li class="four">four</li>
      </ul>
    `);
  });

  it("is looked through: its children are siblings of the elements around it", () => {
    inspector().pin(getElement(".one"));
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".two"));
    pressInPanel("ArrowRight");
    pressInPanel("ArrowRight");
    expect(pinned()).toBe(getElement(".four"));
    pressInPanel("ArrowLeft");
    expect(pinned()).toBe(getElement(".three"));
  });

  it("is skipped on the way up", () => {
    inspector().pin(getElement(".two"));
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(getElement(".list"));
  });
});

describe("↓ after ↑", () => {
  it("goes back to the child the pin came from, not to the first one", () => {
    inspector().pin(getElement(".a2"));
    pressInPanel("ArrowUp");
    expect(pinned()).toBe(getElement(".a"));
    pressInPanel("ArrowDown");
    expect(pinned()).toBe(getElement(".a2"));
  });

  it("goes to the first child once the pin moved elsewhere in between", () => {
    inspector().pin(getElement(".a2"));
    pressInPanel("ArrowUp");
    pressInPanel("ArrowRight");
    pressInPanel("ArrowLeft");
    pressInPanel("ArrowDown");
    expect(pinned()).toBe(getElement(".a1"));
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
