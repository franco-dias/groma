import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  all,
  click,
  clipboard,
  doubleClick,
  getElement,
  holdAlt,
  hover,
  inspector,
  openTab,
  page,
  pressEscape,
  pressKey,
  releaseAlt,
  reset,
  texts,
  ui,
} from "./helpers";

const lock = (): void => ui(".launcher")!.click();
const unlock = (): void => ui(".launcher .off")!.click();
const undo = (): void => {
  openTab("edits");
  ui('[data-action="undo"]')!.click();
};

/** What the user does in the open text: types over it. */
const typeIn = (element: HTMLElement, text: string): void => {
  element.textContent = text;
  element.dispatchEvent(new InputEvent("input", { bubbles: true }));
};

const editsListed = (): string[] => {
  openTab("edits");
  return texts(".edit-row");
};

let title: HTMLElement;
let note: HTMLElement;

beforeEach(() => {
  reset();
  page(`
    <h2 class="title">Hello</h2>
    <p class="note" contenteditable="false" spellcheck="true">Note</p>
    <div class="box"><span>Inner</span> and more</div>
  `);
  title = getElement(".title");
  note = getElement(".note");
});

describe("double-clicking text while locked", () => {
  it("pins the element and lets the user type in it", () => {
    lock();
    doubleClick(title);

    expect(inspector().pinnedElement()).toBe(title);
    expect(title.isContentEditable).toBe(true);
    expect(document.activeElement).toBe(title);
  });

  it("applies on Enter as a content edit, listed in the Edits tab", () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    pressKey(title, "Enter");

    expect(title.textContent).toBe("Goodbye");
    expect(title.hasAttribute("contenteditable")).toBe(false);
    expect(editsListed()).toEqual(["contentHello → Goodbye↩"]);
  });

  it("is copied by Copy edits like any other edit", async () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    pressKey(title, "Enter");
    openTab("edits");
    ui('[data-action="copy-edits"]')!.click();
    await vi.waitFor(() => expect(clipboard.text).toContain("Goodbye"));

    expect(clipboard.text).toContain("Hello");
  });

  it("undoes to the text the page had", () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    pressKey(title, "Enter");
    undo();

    expect(title.textContent).toBe("Hello");
    expect(editsListed()).toEqual([]);
  });

  it("puts the text back on Escape, and leaves the lock on", () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    pressKey(title, "Escape");

    expect(title.textContent).toBe("Hello");
    expect(title.hasAttribute("contenteditable")).toBe(false);
    expect(editsListed()).toEqual([]);
    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(true);
  });

  it("applies when the user clicks elsewhere, which pins what they clicked", () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    click(getElement(".box"));

    expect(title.textContent).toBe("Goodbye");
    expect(inspector().pinnedElement()).toBe(getElement(".box"));
    expect(editsListed()).toEqual(["contentHello → Goodbye↩"]);
  });

  it("does not pin or change anything when a press lands in the text being edited", () => {
    lock();
    doubleClick(title);
    click(title);

    expect(title.isContentEditable).toBe(true);
    expect(inspector().pinnedElement()).toBe(title);
  });

  it("lists no edit when the text did not change", () => {
    lock();
    doubleClick(title);
    pressKey(title, "Enter");

    expect(editsListed()).toEqual([]);
  });

  it("applies when another element is pinned", () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    inspector().pin(getElement(".box"));

    expect(title.hasAttribute("contenteditable")).toBe(false);
    expect(title.textContent).toBe("Goodbye");
  });

  it("applies when the lock is switched off", () => {
    lock();
    doubleClick(title);
    typeIn(title, "Goodbye");
    unlock();

    expect(title.hasAttribute("contenteditable")).toBe(false);
    expect(title.textContent).toBe("Goodbye");
  });

  it("lets go of an element the page removed", async () => {
    lock();
    doubleClick(title);
    title.remove();

    await vi.waitFor(() => expect(title.hasAttribute("contenteditable")).toBe(false));
    expect(editsListed()).toEqual([]);
  });

  it("keeps the typed keys from the page's shortcuts", () => {
    const pageShortcut = vi.fn();
    document.addEventListener("keydown", pageShortcut);
    lock();
    doubleClick(title);
    pressKey(title, "a");
    pressKey(title, "Escape");
    document.removeEventListener("keydown", pageShortcut);

    expect(pageShortcut).not.toHaveBeenCalled();
  });

  it("draws no hover while typing", () => {
    lock();
    doubleClick(title);
    hover(getElement(".box"));

    expect(all(".overlay > div")).toHaveLength(0);
  });

  it.each([
    ["Enter", ".title"],
    ["Escape", ".title"],
    ["Enter", ".note"],
    ["Escape", ".note"],
  ])("puts back the attributes exactly when %s ends the edit of %s", (key, selector) => {
    const element = getElement(selector);
    const attributesOf = (): string[] =>
      Array.from(element.attributes, ({ name, value }) => name + "=" + value);
    const before = attributesOf();
    lock();
    doubleClick(element);
    pressKey(element, key);

    expect(attributesOf()).toEqual(before);
  });

  it("edits an element the page marked contenteditable=false", () => {
    lock();
    doubleClick(note);

    expect(note.isContentEditable).toBe(true);
  });

  it("does not edit an element that holds other elements", () => {
    lock();
    doubleClick(getElement(".box"));

    expect(getElement(".box").hasAttribute("contenteditable")).toBe(false);
  });
});

describe("double-clicking text when not locked", () => {
  it("changes nothing on the page with the lock off", () => {
    doubleClick(title);

    expect(title.outerHTML).toBe('<h2 class="title">Hello</h2>');
    expect(inspector().pinnedElement()).toBeNull();
  });

  it("changes nothing while Alt is only held", () => {
    holdAlt();
    doubleClick(title);

    expect(title.hasAttribute("contenteditable")).toBe(false);
  });
});

describe("Alt pressed while text is being edited", () => {
  it("is still seen going up, so inspect mode ends with the lock", () => {
    lock();
    doubleClick(title);
    holdAlt();
    releaseAlt();
    pressKey(title, "Enter");
    unlock();

    expect(document.body.style.cursor).toBe("");
  });
});

const box = (): HTMLInputElement => ui<HTMLInputElement>('.panel-foot [data-option="text-edit"]')!;
const openPanel = (): void => inspector().pin(note);
const isPillLocked = (): boolean => ui(".launcher")!.classList.contains("is-locked");

describe("the switch at the foot of the panel", () => {
  it("is off, names what it does, and shows on every tab", () => {
    openPanel();

    expect(box().checked).toBe(false);
    expect(texts(".panel-foot .foot-label")).toEqual(["Edit text inline (lock inspecting)"]);
    expect(texts(".panel-foot .hint")).toEqual(["Double-click text on the page"]);
    for (const tab of ["specs", "css", "layers", "edits"]) {
      openTab(tab);
      expect(getComputedStyle(ui(".panel-foot")!).display).not.toBe("none");
    }
  });

  it("locks inspect mode on, and a double-click on text then edits it", () => {
    openPanel();
    box().click();
    expect(isPillLocked()).toBe(true);
    expect(document.body.style.cursor).toBe("crosshair");

    doubleClick(title);
    expect(title.isContentEditable).toBe(true);
  });

  it("unlocks when it is unchecked", () => {
    openPanel();
    box().click();
    box().click();

    expect(isPillLocked()).toBe(false);
    expect(document.body.style.cursor).toBe("");
  });

  it("shows the lock made from the pill, and its end on Escape", () => {
    openPanel();
    lock();
    expect(box().checked).toBe(true);

    pressEscape();
    expect(box().checked).toBe(false);
  });

  it("fits a panel 320px wide", () => {
    openPanel();
    ui(".panel")!.style.width = "320px";
    const foot = ui(".panel-foot")!;

    expect(foot.scrollWidth).toBeLessThanOrEqual(foot.clientWidth);
  });
});
