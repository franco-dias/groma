import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSelector } from "../src/edits/selector";
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
  typeOver,
  ui,
  wait,
} from "./helpers";

const STORE = "__groma_overrides:" + location.pathname;
const savedEdits = (): Record<string, Record<string, string>> =>
  JSON.parse(localStorage.getItem(STORE) ?? "{}");

/** The editable value of a property in the All CSS tab; `custom` picks the "Your edits" copy. */
const field = (property: string, custom = false): HTMLElement =>
  ui(`.body[data-for="css"] [data-row="${custom ? "custom:" : ""}${property}"]`)!;

const body = (): HTMLElement => ui('.body[data-for="css"]')!;

function pinInCssTab(selector: string): HTMLElement {
  const target = getElement(selector);
  inspector().pin(target);
  openTab("css");
  return target;
}

beforeEach(() => {
  reset();
  page(`
    <div class="wrap">
      <p class="box md:flex" style="color: green; padding-top: 12px">One</p>
      <p class="box">Two</p>
    </div>
    <section><div class="wrap"><p class="box">Look-alike</p></div></section>
    <input class="field" value="hello" />
    <h2 class="heading">Title</h2>
  `);
});

describe("editing a CSS value", () => {
  it("applies the edit to the page, saves it and lists it under Your edits", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");

    expect(getComputedStyle(box).paddingTop).toBe("40px");
    expect(Object.values(savedEdits())).toEqual([{ "padding-top": "40px" }]);
    expect(texts(".heading.is-custom")).toEqual(["Your edits"]);
    expect(field("padding-top", true).textContent).toBe("40px");
  });

  it("keeps the edit when its value is focused and left untouched", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");
    for (const untouched of [field("padding-top", true), field("padding-top")]) {
      untouched.dispatchEvent(new FocusEvent("focus"));
      untouched.dispatchEvent(new FocusEvent("blur"));
    }
    expect(getComputedStyle(box).paddingTop).toBe("40px");
    expect(Object.values(savedEdits())).toEqual([{ "padding-top": "40px" }]);
  });

  it("cancels typing on Escape without touching the edit", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");
    const value = field("padding-top");
    value.textContent = "999px";
    pressKey(value, "Escape");
    value.dispatchEvent(new FocusEvent("blur"));
    expect(getComputedStyle(box).paddingTop).toBe("40px");
  });

  it("resets to the page's own inline value, not to nothing", () => {
    const box = pinInCssTab(".box");
    typeOver(field("color"), "red");
    expect(box.style.color).toBe("red");

    ui(".row.is-overridden .reset")!.click();
    expect(box.style.color).toBe("green");
    expect(savedEdits()).toEqual({});
  });

  it("removes the edit when its value is cleared", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");
    typeOver(field("padding-top", true), "");
    expect(box.style.paddingTop).toBe("12px");
    expect(savedEdits()).toEqual({});
  });

  it("nudges a number with the arrow keys, live: 1, Shift 10, Alt 0.1", () => {
    const box = pinInCssTab(".box");
    const value = field("padding-top");
    pressKey(value, "ArrowUp");
    expect(box.style.paddingTop).toBe("13px");
    pressShortcut(value, { key: "ArrowUp", shiftKey: true });
    expect(box.style.paddingTop).toBe("23px");
    pressShortcut(value, { key: "ArrowDown", altKey: true });
    expect(box.style.paddingTop).toBe("22.9px");
  });

  it("keeps the list where it was scrolled after an edit", () => {
    pinInCssTab(".box");
    body().scrollTop = 200;
    typeOver(field("font-size"), "20px");
    expect(body().scrollTop).toBe(200);
  });

  it("still applies the edit when the browser refuses to store it", () => {
    const box = pinInCssTab(".box");
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
    try {
      typeOver(field("padding-top"), "40px");
    } finally {
      Storage.prototype.setItem = setItem;
    }
    expect(box.style.paddingTop).toBe("40px");
  });

  it("does not let tag, id, classes and rect be edited", () => {
    pinInCssTab(".box");
    const readOnly = all('.body[data-for="css"] .row')
      .filter((row) => ["tag", "classes", "top", "width"].includes(row.querySelector(".name")!.textContent!))
      .slice(0, 3)
      .map((row) => row.querySelector<HTMLElement>(".value")!.isContentEditable);
    expect(readOnly).toEqual([false, false, false]);
  });
});

const names = () => texts('.body[data-for="css"] .row .name');

describe("the All CSS list", () => {
  it("hides default values until asked, and filters by property name", () => {
    pinInCssTab(".box");
    expect(names()).not.toContain("position");

    ui<HTMLInputElement>('[data-option="hideDefaults"]')!.click();
    expect(names()).toContain("position");
    ui<HTMLInputElement>('[data-option="hideDefaults"]')!.click();

    const search = ui<HTMLInputElement>(".search input")!;
    search.value = "padding";
    search.dispatchEvent(new Event("input"));
    expect(names().every((name) => name.includes("padding"))).toBe(true);
    ui(".search .clear")!.click();
    expect(names()).toContain("display");
  });
});

describe("replaying saved edits", () => {
  it("puts the edits back after the page re-renders", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");
    box.style.paddingTop = "12px"; // the page re-rendered

    inspector().replayOverrides();
    expect(box.style.paddingTop).toBe("40px");
  });

  it("finds elements whose classes need escaping, and only those elements", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");
    const [selector] = Object.keys(savedEdits());
    expect(Array.from(document.querySelectorAll(selector))).toEqual([box]);
  });

  it("can be limited to one part of the page", () => {
    const box = pinInCssTab(".box");
    typeOver(field("padding-top"), "40px");
    box.style.paddingTop = "12px";
    inspector().replayOverrides(getElement("section"));
    expect(box.style.paddingTop).toBe("12px");
  });
});

describe("selectors", () => {
  it("lead back to the same element, for every element of the page", () => {
    for (const target of Array.from(document.querySelectorAll("#fixture *"))) {
      expect(document.querySelector(getSelector(target))).toBe(target);
    }
  });
});

const editor = (): HTMLElement => ui(".editor")!;

const apply = (text: string) => {
  editor().textContent = text;
  pressShortcut(editor(), { key: "Enter", ctrlKey: true });
};

describe("editing content", () => {
  it("changes an element's text on Ctrl/⌘+Enter and restores it on Reset", () => {
    const heading = pinInCssTab(".heading");
    apply("Changed");
    expect(heading.innerHTML).toBe("Changed");

    // Reset works after the element is pinned again, and never empties it.
    inspector().pin(heading);
    ui(".footer .reset")!.click();
    expect(heading.innerHTML).toBe("Title");
  });

  it("edits a form control through its value, and replays it as a value", () => {
    const input = pinInCssTab(".field") as HTMLInputElement;
    expect(texts(".content .heading")).toEqual(["Value"]);
    apply("edited");
    expect(input.value).toBe("edited");

    input.value = "hello"; // the page re-rendered
    inspector().replayOverrides();
    expect(input.value).toBe("edited");
  });

  it("offers no editor for an element that holds other elements", () => {
    pinInCssTab(".wrap");
    expect(ui(".editor")).toBeNull();
  });
});

afterEach(() => wait(0));
