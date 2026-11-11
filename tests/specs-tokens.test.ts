import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  all,
  getElement,
  inspector,
  openTab,
  page,
  pressKey,
  pressShortcut,
  reset,
  texts,
  ui,
} from "./helpers";

const SPECS = '.body[data-for="specs"]';
/** The value in the Specs tab that edits a CSS property. */
const value = (property: string): HTMLElement => ui(`${SPECS} [data-edits="${property}"]`)!;

const doubleClick = (node: HTMLElement): boolean =>
  node.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));

/** Opens a value as a field. */
const open = (property: string): HTMLElement => {
  const field = value(property);
  doubleClick(field);
  return field;
};

/** Types `text` in a field that is open, as the keyboard would. */
function type(field: HTMLElement, text: string): void {
  field.textContent = text;
  field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}

const list = (): HTMLElement | null => ui(".token-list");
const names = (): string[] => all(".token-item").map((item) => item.dataset.token!);
const active = (): string[] => all(".token-item.is-active").map((item) => item.dataset.token!);

const TOKENS = `
  <style>
    :root { --brand: #009c5a; --brand-dark: #006b3c; --ink: rgb(27, 26, 23); --space-2: 8px; --space-4: 16px;
      --space-8: 32px; --text-s: 14px; --radius-m: 4px; --font-body: Inter, sans-serif; --ds-color-ink: #1b1a17; --ds-space-4: 16px; }
  </style>`;
const CARD = `
  <div class="card" style="display: flex; gap: 16px; width: 200px; height: 100px; padding: 12px 16px;
    color: #1b1a17; background-color: #009c5a; border-radius: 4px; font-size: 14px">Card</div>`;

const pinCard = (extra = TOKENS): void => {
  page(extra + CARD);
  inspector().pin(getElement(".card"));
};

beforeEach(() => {
  reset();
  pinCard();
});

afterEach(() => {
  ui(".panel")!.style.width = "";
});

describe("tokens under a field in the Specs tab", () => {
  it("lists the tokens that hold the colour of a colour field as it opens", () => {
    open("background-color");
    expect(names()).toEqual(["--brand"]);
    expect(texts(".token-item")).toEqual(["--brand#009c5a"]);
    expect(ui(".token-item .swatch")).not.toBeNull();
  });

  it("matches a colour in any spelling", () => {
    open("color");
    // --ink is rgb(), --ds-color-ink is a hex: both are the field's #1B1A17.
    expect(names().toSorted()).toEqual(["--ds-color-ink", "--ink"]);
  });

  it("lists lengths for a length, and no colours", () => {
    open("gap");
    expect(names().toSorted()).toEqual(["--ds-space-4", "--space-4"]);
    expect(ui(".token-item .swatch")).toBeNull();
    expect(texts(".token-value")).toEqual(["16px", "16px"]);
  });

  it("filters by what is typed, in the name, whatever the case and the dashes", () => {
    const field = open("gap");
    type(field, "SPACE");
    // Typed text that is not a length holds no token: the names that contain it, shortest first.
    expect(names()).toEqual(["--space-2", "--space-4", "--space-8", "--ds-space-4"]);
    type(field, "--sp");
    expect(names()).toEqual(["--space-2", "--space-4", "--space-8"]);
    type(field, "nothing like it");
    expect(list()).toBeNull();
    type(field, "radius");
    expect(names()).toEqual(["--radius-m"]);
  });

  it("filters colours by name, and never offers a length for a colour", () => {
    const field = open("background-color");
    type(field, "brand");
    expect(names()).toEqual(["--brand", "--brand-dark"]);
    type(field, "space");
    expect(list()).toBeNull();
  });

  it("takes a bare number as pixels when it looks for the tokens that hold it", () => {
    const field = open("gap");
    type(field, "8");
    // The names that contain "8" follow: --space-8.
    expect(names()).toEqual(["--space-2", "--space-8"]);
  });

  it("shows at most eight", () => {
    const many = Array.from({ length: 12 }, (_, index) => `--s-${index}: ${index + 1}px;`).join(" ");
    pinCard(`<style>:root { ${many} }</style>`);
    const field = open("gap");
    type(field, "--s-");
    expect(names()).toHaveLength(8);
  });

  it("gives no list to a property that takes no tokens, nor on a page with none", () => {
    open("display");
    expect(list()).toBeNull();

    pinCard("");
    open("gap");
    expect(list()).toBeNull();
    open("background-color");
    expect(list()).toBeNull();
  });

  it("lists only the tokens with the prefixes the page set", () => {
    inspector().configure({ tokenPrefixes: ["--ds-"] });
    const field = open("gap");
    expect(names()).toEqual(["--ds-space-4"]);
    type(field, "space");
    expect(names()).toEqual(["--ds-space-4"]);
  });

  it("closes the list with the field", () => {
    const field = open("gap");
    expect(list()).not.toBeNull();
    field.dispatchEvent(new FocusEvent("blur"));
    expect(list()).toBeNull();
  });

  it("writes var(--token) when a token is clicked, without taking the focus from the field", () => {
    const field = open("background-color");
    type(field, "dark");
    const press = new MouseEvent("mousedown", { bubbles: true, cancelable: true, composed: true });
    ui('.token-item[data-token="--brand-dark"]')!.dispatchEvent(press);
    // A press that is not prevented would blur the field, and the field would apply "dark".
    expect(press.defaultPrevented).toBe(true);
    expect(field.isContentEditable).toBe(true);

    ui('.token-item[data-token="--brand-dark"]')!.click();
    expect(getComputedStyle(getElement(".card")).backgroundColor).toBe("rgb(0, 107, 60)");
    expect(getElement(".card").style.backgroundColor).toBe("var(--brand-dark)");
    expect(list()).toBeNull();
    expect(value("background-color").isContentEditable).toBe(false);

    openTab("edits");
    expect(texts(".edit-row")).toEqual(["background-colorrgb(0, 156, 90) → var(--brand-dark)↩"]);
  });

  it("writes a length token the same way", () => {
    open("gap");
    ui('.token-item[data-token="--space-4"]')!.click();
    expect(getElement(".card").style.gap).toBe("var(--space-4)");

    const field = open("padding-top");
    type(field, "space-8");
    ui('.token-item[data-token="--space-8"]')!.click();
    expect(getComputedStyle(getElement(".card")).paddingTop).toBe("32px");
  });

  it("walks the list with the arrow keys and applies the highlighted token on Enter", () => {
    const field = open("background-color");
    type(field, "brand");
    expect(active()).toEqual([]);
    pressKey(field, "ArrowDown");
    expect(active()).toEqual(["--brand"]);
    pressKey(field, "ArrowDown");
    expect(active()).toEqual(["--brand-dark"]);
    pressKey(field, "ArrowDown");
    expect(active()).toEqual(["--brand"]);
    pressKey(field, "ArrowUp");
    expect(active()).toEqual(["--brand-dark"]);
    pressKey(field, "Enter");

    expect(getElement(".card").style.backgroundColor).toBe("var(--brand-dark)");
    expect(list()).toBeNull();
  });

  it("applies the typed text on Enter when no token is highlighted", () => {
    const field = open("background-color");
    type(field, "brand");
    pressKey(field, "Enter");
    // "brand" is not a colour: the browser rejects it and the page keeps its own.
    expect(getElement(".card").style.backgroundColor).not.toBe("var(--brand)");
    field.textContent = "#ff0000";
  });

  it("starts from the last token with the up arrow", () => {
    const field = open("background-color");
    type(field, "brand");
    pressKey(field, "ArrowUp");
    expect(active()).toEqual(["--brand-dark"]);
  });

  it("closes the list on the first Esc, and cancels the field on the second", () => {
    const field = open("background-color");
    type(field, "brand");
    pressKey(field, "ArrowDown");
    pressKey(field, "Escape");
    expect(list()).toBeNull();
    expect(field.isContentEditable).toBe(true);
    expect(field.textContent).toBe("brand");

    pressKey(field, "Escape");
    expect(value("background-color").isContentEditable).toBe(false);
    expect(getElement(".card").style.backgroundColor).toBe("rgb(0, 156, 90)");
  });

  it("cancels the field on the first Esc when nothing in the list is highlighted", () => {
    const field = open("background-color");
    expect(list()).not.toBeNull();
    pressKey(field, "Escape");
    expect(value("background-color").isContentEditable).toBe(false);
    expect(list()).toBeNull();
  });

  it("opens the list again when the user types after closing it", () => {
    const field = open("background-color");
    type(field, "brand");
    pressKey(field, "ArrowDown");
    pressKey(field, "Escape");
    type(field, "brand-");
    expect(names()).toEqual(["--brand-dark"]);
  });

  it("keeps nudging a number with the arrows, and leaves the list alone", () => {
    const field = open("gap");
    pressKey(field, "ArrowUp");
    expect(getComputedStyle(getElement(".card")).gap).toBe("17px");
    expect(field.textContent).toBe("17px");
    pressShortcut(field, { key: "ArrowDown", shiftKey: true });
    expect(getComputedStyle(getElement(".card")).gap).toBe("7px");
    expect(active()).toEqual([]);
  });

  it("fits a panel 320px wide, with a long name cut by an ellipsis", () => {
    const long = "--a-design-token-with-a-very-long-name-for-the-brand-green-in-the-dark-theme";
    pinCard(`<style>:root { ${long}: #009c5a; --brand: #009c5a; }</style>`);
    ui(".panel")!.style.width = "320px";
    open("background-color");

    const body = ui(SPECS)!;
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
    const longItem = ui(`.token-item[data-token="${long}"]`)!;
    const [item, name, token] = [longItem, longItem.querySelector<HTMLElement>(".token-name")!, list()!];
    expect(token.scrollWidth).toBeLessThanOrEqual(token.clientWidth);
    expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(body.getBoundingClientRect().right);
    expect(getComputedStyle(name).textOverflow).toBe("ellipsis");
  });
});

/** A tall element, so the tab scrolls and its lowest field is at the bottom edge. */
const pinTall = (): void => {
  page(
    TOKENS +
      `<div class="card" style="display: flex; gap: 16px; width: 200px; height: 100px; padding: 12px 16px;
        color: #1b1a17; background-color: #009c5a; border: 1px solid #009c5a; border-radius: 4px; font-size: 14px;
        box-shadow: 0 1px 2px #000; background-image: linear-gradient(red, blue); transition: opacity 0.2s ease-in">Card</div>`,
  );
  inspector().pin(getElement(".card"));
};

/** Opens the lowest field of a tab `height` tall, with a list taller than the room under it. */
function openLowest(height: string): { box: DOMRect; items: DOMRect; at: DOMRect; list: HTMLElement } {
  pinTall();
  const body = ui(SPECS)!;
  ui(".panel")!.style.height = height;
  body.scrollTop = body.scrollHeight;
  const field = open("font-size");
  // Every length token: a list taller than the room left under the field.
  type(field, "-");
  expect(names().length).toBeGreaterThan(4);
  const found = list()!;
  return {
    box: body.getBoundingClientRect(),
    items: found.getBoundingClientRect(),
    at: field.getBoundingClientRect(),
    list: found,
  };
}

describe("where the list sits", () => {
  it("opens above a field near the bottom of the tab, inside the tab", () => {
    const { box, items, at, list: tokenList } = openLowest("600px");
    expect(items.top).toBeGreaterThanOrEqual(box.top);
    expect(items.bottom).toBeLessThanOrEqual(at.top);
    expect(tokenList.style.maxHeight).toBe("");
    ui(".panel")!.style.height = "";
  });

  it("is cut to the room, and scrolls, when neither side of the field has enough", () => {
    const { box, items, at, list: tokenList } = openLowest("420px");
    expect(items.top).toBeGreaterThanOrEqual(box.top);
    expect(items.bottom).toBeLessThanOrEqual(box.bottom);
    // Never over the field being typed in.
    expect(items.bottom <= at.top || items.top >= at.bottom).toBe(true);
    expect(tokenList.scrollHeight).toBeGreaterThan(tokenList.clientHeight);
    ui(".panel")!.style.height = "";
  });

  it("opens under a field with room below it", () => {
    const field = open("gap");
    const items = list()!.getBoundingClientRect();
    expect(items.top).toBeGreaterThanOrEqual(field.getBoundingClientRect().bottom);
  });
});
