import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  all,
  clipboard,
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

/** The editable value of a property in the All CSS tab. */
const field = (property: string): HTMLElement => ui(`.body[data-for="css"] [data-row="${property}"]`)!;
const action = (name: string): HTMLButtonElement => ui<HTMLButtonElement>(`[data-action="${name}"]`)!;
const rows = (): string[] => texts(".edit-row");
const shown = (selector: string): boolean => getComputedStyle(ui(selector)!).display !== "none";

/** Pins an element and changes one of its properties in the All CSS tab. */
function editStyle(selector: string, { property, value }: { property: string; value: string }): HTMLElement {
  const target = getElement(selector);
  inspector().pin(target);
  openTab("css");
  typeOver(field(property), value);
  return target;
}

function writeNote(text: string): void {
  openTab("edits");
  const note = ui(".note-field")!;
  note.dispatchEvent(new FocusEvent("focus"));
  note.textContent = text;
  note.dispatchEvent(new FocusEvent("blur"));
}

async function copied(): Promise<string> {
  action("copy-edits").click();
  await wait(0);
  return clipboard.text;
}

beforeEach(() => {
  reset();
  page(`
    <style>
      #fixture { --space-4: 16px; --brand: #ff0000; }
      .title { padding-top: 12px; color: rgb(0, 128, 0); }
    </style>
    <h2 class="title">Title</h2>
    <p class="text" data-component="Lead" data-source="ui/Lead.tsx">Some text</p>
  `);
});

describe("the list of edits", () => {
  it("lists every edit on the page as before → after, whichever element is pinned", () => {
    editStyle(".title", { property: "padding-top", value: "16px" });
    editStyle(".text", { property: "color", value: "red" });
    openTab("edits");

    expect(texts(".edited-name")).toEqual(["h2", "Lead"]);
    expect(rows()).toEqual(["padding-top12px → 16px↩", "colorrgb(0, 0, 0) → red↩"]);
    expect(texts(".edits-heading .count")).toEqual(["2"]);
  });

  it("removes one edit with its ↩ and puts back the page's own value", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");
    ui(".edit-row .reset")!.click();

    expect(getComputedStyle(title).paddingTop).toBe("12px");
    expect(rows()).toEqual([]);
    expect(texts(".edits-empty b")).toEqual(["No edits yet"]);
  });

  it("pins an element from the list", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    inspector().pin(getElement(".text"));
    openTab("edits");
    ui(".edited-head")!.click();
    expect(inspector().pinnedElement()).toBe(title);
  });

  it("lists edited content with the text the page had", () => {
    inspector().pin(getElement(".title"));
    openTab("css");
    ui(".editor")!.textContent = "New title";
    pressShortcut(ui(".editor")!, { key: "Enter", ctrlKey: true });
    openTab("edits");
    expect(rows()).toEqual(["contentTitle → New title↩"]);
  });

  it("shows while the panel is open with nothing pinned", () => {
    editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");
    ui(".close")!.click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyG", altKey: true, shiftKey: true, bubbles: true }),
    );

    expect(shown('.body[data-for="edits"]')).toBe(true);
    expect(shown(".empty")).toBe(false);
    expect(ui(".note-block")).toBeNull();
    expect(rows()).toEqual(["padding-top12px → 16px↩"]);
  });
});

describe("the original page", () => {
  it("shows the page without the edits and brings them back, keeping them saved", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");

    action("original").click();
    expect(getComputedStyle(title).paddingTop).toBe("12px");
    expect(action("original").getAttribute("aria-pressed")).toBe("true");
    expect(rows()).toEqual(["padding-top12px → 16px↩"]);

    // A page that re-renders asks for a replay: the original stays.
    inspector().replayOverrides();
    expect(getComputedStyle(title).paddingTop).toBe("12px");

    action("original").click();
    expect(getComputedStyle(title).paddingTop).toBe("16px");
  });

  it("goes back to the edited page when another edit is made", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");
    action("original").click();
    openTab("css");
    typeOver(field("color"), "red");

    expect(getComputedStyle(title).paddingTop).toBe("16px");
    expect(action("original").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("undo and redo", () => {
  it("undoes edits last first, and redoes them", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    typeOver(field("color"), "red");
    openTab("edits");

    action("undo").click();
    expect(getComputedStyle(title).color).toBe("rgb(0, 128, 0)");
    expect(rows()).toEqual(["padding-top12px → 16px↩"]);

    action("undo").click();
    expect(getComputedStyle(title).paddingTop).toBe("12px");
    expect(action("undo").disabled).toBe(true);

    action("redo").click();
    expect(getComputedStyle(title).paddingTop).toBe("16px");
    action("redo").click();
    expect(getComputedStyle(title).color).toBe("rgb(255, 0, 0)");
    expect(action("redo").disabled).toBe(true);
  });

  it("brings back an edit that was reset", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");
    ui(".edit-row .reset")!.click();
    action("undo").click();
    expect(getComputedStyle(title).paddingTop).toBe("16px");
    expect(rows()).toEqual(["padding-top12px → 16px↩"]);
  });

  it("undoes a run of arrow-key nudges in one step", () => {
    const title = getElement(".title");
    inspector().pin(title);
    openTab("css");
    pressKey(field("padding-top"), "ArrowUp");
    pressKey(field("padding-top"), "ArrowUp");
    expect(getComputedStyle(title).paddingTop).toBe("14px");

    // Leaving the field, as a click on the Edits tab does.
    field("padding-top").dispatchEvent(new FocusEvent("blur"));
    openTab("edits");
    action("undo").click();
    expect(getComputedStyle(title).paddingTop).toBe("12px");
  });

  it("answers Ctrl/⌘ + Z in the panel, but not in a field that is being typed in", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");

    pressShortcut(ui(".note-field")!, { key: "z", code: "KeyZ", ctrlKey: true });
    expect(getComputedStyle(title).paddingTop).toBe("16px");

    pressShortcut(ui(".tab-bar")!, { key: "z", code: "KeyZ", ctrlKey: true });
    expect(getComputedStyle(title).paddingTop).toBe("12px");
    pressShortcut(ui(".tab-bar")!, { key: "z", code: "KeyZ", ctrlKey: true, shiftKey: true });
    expect(getComputedStyle(title).paddingTop).toBe("16px");
  });
});

describe("notes", () => {
  it("keeps a note on the pinned element and lists it, with no edit to the page", () => {
    inspector().pin(getElement(".text"));
    writeNote("Make this sticky");

    expect(texts(".edited-name")).toEqual(["Lead"]);
    expect(rows()).toEqual(["noteMake this sticky↩"]);
    expect(getElement(".text").getAttribute("style")).toBeNull();

    // The note is still there when the element is pinned again.
    inspector().pin(getElement(".title"));
    inspector().pin(getElement(".text"));
    expect(ui(".note-field")!.textContent).toBe("Make this sticky");
  });

  it("is removed by its ↩, by clearing it, and by undo", () => {
    inspector().pin(getElement(".text"));
    writeNote("Make this sticky");
    ui(".edit-row.is-note .reset")!.click();
    expect(rows()).toEqual([]);

    action("undo").click();
    expect(rows()).toEqual(["noteMake this sticky↩"]);
    writeNote("");
    expect(rows()).toEqual([]);
  });
});

describe("Copy edits", () => {
  it("is off until there is something to copy", () => {
    inspector().pin(getElement(".title"));
    openTab("edits");
    expect(action("copy-edits").disabled).toBe(true);
    expect(action("original").disabled).toBe(true);
  });

  it("copies every edit with its element, before → after, and the page", async () => {
    editStyle(".title", { property: "padding-top", value: "20px" });
    inspector().pin(getElement(".text"));
    writeNote("Make this sticky");

    const text = await copied();
    expect(text).toContain(`- Page: ${location.href}`);
    expect(text).toContain(`- Viewport: ${innerWidth} × ${innerHeight}`);
    expect(text).toContain("## 1. h2");
    expect(text).toContain("- Selector: `#fixture > h2.title`");
    expect(text).toContain('- Text: "Title"');
    expect(text).toContain("- `padding-top`: `12px` → `20px`");
    expect(text).toContain("## 2. Lead");
    expect(text).toContain("- Component: `Lead` (`ui/Lead.tsx`)");
    expect(text).toContain("Note: Make this sticky");
  });

  it("names the token that holds a new value, for a length and for a colour in another spelling", async () => {
    editStyle(".title", { property: "padding-top", value: "16px" });
    typeOver(field("color"), "red");
    typeOver(field("margin-top"), "7px");

    const text = await copied();
    expect(text).toContain("- `padding-top`: `12px` → `16px` (matches `--space-4`)");
    expect(text).toContain("- `color`: `rgb(0, 128, 0)` → `red` (matches `--brand`)");
    expect(text).toMatch(/- `margin-top`: `[^`]+` → `7px`$/m);
  });

  it("marks the button for a moment", async () => {
    editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");
    await copied();
    expect(all(".ghost-button.is-copied")).toHaveLength(1);
  });
});

describe("values the browser rejects", () => {
  it("does not keep a value the page would ignore", () => {
    const title = editStyle(".title", { property: "padding-top", value: "banana" });
    typeOver(field("color"), "notacolor");
    openTab("edits");

    expect(title.getAttribute("style")).toBeNull();
    expect(rows()).toEqual([]);
    expect(localStorage.getItem("__groma_overrides:" + location.pathname)).toBeNull();
  });

  it("keeps the edit that was there when a bad value is typed over it", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    typeOver(field("padding-top"), "garbage");
    openTab("edits");

    expect(getComputedStyle(title).paddingTop).toBe("16px");
    expect(rows()).toEqual(["padding-top12px → 16px↩"]);
  });

  it("takes !important as part of the value", () => {
    const title = editStyle(".title", { property: "padding-top", value: "30px !important" });
    openTab("edits");

    expect(title.style.getPropertyValue("padding-top")).toBe("30px");
    expect(title.style.getPropertyPriority("padding-top")).toBe("important");
    expect(rows()).toEqual(["padding-top12px → 30px !important↩"]);
  });
});

describe("leaving the page as it was", () => {
  it("leaves no empty style attribute after the only edit is undone", () => {
    const title = editStyle(".title", { property: "padding-top", value: "16px" });
    openTab("edits");
    action("undo").click();
    expect(title.hasAttribute("style")).toBe(false);
  });
});

const bar = (): HTMLElement => ui(".apply-bar")!;

const barShown = (): boolean => getComputedStyle(bar()).visibility === "visible";

// Saved edits used to be put back when an element was pinned (and when the
// page loaded). They no longer are: the panel says which edits of an earlier
// visit are not on the page and the user applies them, so the test for the
// pin is replaced by these.
describe("edits saved on an earlier visit", () => {
  const path = location.pathname;

  /** Saves edits as an earlier visit left them: in storage, not on the page. */
  function savedBefore(
    styles: Record<string, Record<string, string>>,
    content?: Record<string, string>,
  ): void {
    localStorage.setItem("__groma_overrides:" + path, JSON.stringify(styles));
    if (content) localStorage.setItem("__groma_html:" + path, JSON.stringify(content));
  }

  it("shows no bar for the edits of this visit, even when the page draws the element again", () => {
    editStyle(".title", { property: "padding-top", value: "16px" });
    expect(barShown()).toBe(false);

    const title = getElement(".title");
    title.outerHTML = title.outerHTML.replace(/ style="[^"]*"/, "");
    inspector().pin(getElement(".text"));
    expect(barShown()).toBe(false);
    // And nothing puts the edit back by itself.
    expect(getComputedStyle(getElement(".title")).paddingTop).toBe("12px");
  });

  it("says how many are not on the page, on every tab, and lists them", () => {
    savedBefore({
      "#fixture .title": { "padding-top": "21px", color: "red" },
      "#fixture .text": { color: "blue" },
    });
    inspector().pin(getElement(".text"));

    expect(getComputedStyle(getElement(".title")).paddingTop).toBe("12px");
    expect(barShown()).toBe(true);
    expect(texts(".apply-text")).toEqual(["3 saved edits are not on the page"]);
    expect(texts(".apply-bar button")).toEqual(["Discard", "Apply"]);
    for (const tab of ["specs", "css", "layers", "edits"]) {
      openTab(tab);
      expect(barShown()).toBe(true);
    }
    expect(rows()).toHaveLength(3);
  });

  it("puts them back with Apply, and the bar goes", () => {
    savedBefore({ "#fixture .title": { "padding-top": "22px" } });
    inspector().pin(getElement(".text"));
    expect(texts(".apply-text")).toEqual(["1 saved edit is not on the page"]);

    action("apply-edits").click();
    expect(getComputedStyle(getElement(".title")).paddingTop).toBe("22px");
    expect(barShown()).toBe(false);
  });

  it("removes them with Discard, keeps the edits of this visit, and undoes it in one step", () => {
    savedBefore({ "#fixture .title": { "padding-top": "23px", "margin-top": "9px" } });
    editStyle(".text", { property: "color", value: "blue" });
    expect(barShown()).toBe(true);

    action("discard-edits").click();
    expect(barShown()).toBe(false);
    openTab("edits");
    expect(rows()).toEqual(["colorrgb(0, 0, 0) → blue↩"]);
    expect(getComputedStyle(getElement(".text")).color).toBe("rgb(0, 0, 255)");

    // One step back brings both discarded edits back, on the page.
    action("undo").click();
    expect(rows()).toHaveLength(3);
    expect(getComputedStyle(getElement(".title")).paddingTop).toBe("23px");
  });

  it("stays away while the user looks at the original page", () => {
    savedBefore({ "#fixture .title": { "padding-top": "24px" } });
    inspector().pin(getElement(".text"));
    openTab("edits");
    expect(barShown()).toBe(true);

    action("original").click();
    expect(barShown()).toBe(false);

    // Leaving that view puts every saved edit on the page: nothing is left to say.
    action("original").click();
    expect(getComputedStyle(getElement(".title")).paddingTop).toBe("24px");
    expect(barShown()).toBe(false);
  });

  it("does not count an edit whose element is not on the page", () => {
    savedBefore({ "#fixture .gone": { "padding-top": "25px" } });
    inspector().pin(getElement(".text"));
    expect(barShown()).toBe(false);
  });

  it("counts saved content too", () => {
    savedBefore({}, { "#fixture .title": "Title from before" });
    inspector().pin(getElement(".text"));
    expect(barShown()).toBe(true);

    action("apply-edits").click();
    expect(getElement(".title").textContent).toBe("Title from before");
  });

  it("slides open and shut, and is out of reach while shut", () => {
    // With the panel open and nothing to say, the bar takes no room at all.
    inspector().pin(getElement(".title"));
    expect(shown(".panel")).toBe(true);
    expect(bar().classList.contains("is-off")).toBe(true);
    expect(bar().getBoundingClientRect().height).toBe(0);

    savedBefore({ "#fixture .title": { "padding-top": "26px" } });
    inspector().pin(getElement(".text"));
    expect(bar().getBoundingClientRect().height).toBeGreaterThan(30);
    expect(getComputedStyle(bar()).transitionProperty).toContain("grid-template-rows");
  });
});

const refuse = () => {
  throw new Error("blocked");
};

describe("when the browser refuses to store", () => {
  const { getItem, setItem } = Storage.prototype;
  beforeEach(() => {
    Storage.prototype.getItem = refuse;
    Storage.prototype.setItem = refuse;
  });
  afterEach(() => {
    // Undo everything while storage is still blocked: nothing is left in memory for the next test.
    while (!action("undo").disabled) action("undo").click();
    Storage.prototype.getItem = getItem;
    Storage.prototype.setItem = setItem;
  });

  it("still lists the edits, copies them and undoes them one step at a time", async () => {
    const title = editStyle(".title", { property: "padding-top", value: "3px" });
    typeOver(field("padding-top"), "5px");
    openTab("edits");

    expect(rows()).toEqual(["padding-top12px → 5px↩"]);
    expect(await copied()).toContain("- `padding-top`: `12px` → `5px`");

    action("undo").click();
    expect(getComputedStyle(title).paddingTop).toBe("3px");
    action("redo").click();
    expect(getComputedStyle(title).paddingTop).toBe("5px");
  });
});

describe("token names in the copied text", () => {
  it("does not match keywords and zero, which unrelated tokens hold", async () => {
    page(`
      <style>#fixture { --shadow-0: none; --zero: 0px; }</style>
      <h2 class="title" style="display: block; margin-top: 4px">Title</h2>
    `);
    editStyle(".title", { property: "margin-top", value: "0px" });
    typeOver(field("display"), "none");

    const text = await copied();
    expect(text).toContain("→ `0px`\n");
    expect(text).toContain("→ `none`\n");
  });

  it("names only the page's design tokens when the page says which variables they are", async () => {
    page(`
      <style>#fixture { --ds-space-4: 16px; --lib-offset: 16px; }</style>
      <h2 class="title">Title</h2>
    `);
    inspector().configure({ tokenPrefixes: ["--ds-"] });
    editStyle(".title", { property: "padding-top", value: "16px" });
    expect(await copied()).toContain("→ `16px` (matches `--ds-space-4`)\n");
  });

  it("reads the element's text as shown, without the styles inside it", async () => {
    page(`<div class="title"><style>.x { color: red; }</style>Shown text</div>`);
    editStyle(".title", { property: "padding-top", value: "16px" });
    expect(await copied()).toContain('- Text: "Shown text"');
  });
});

afterEach(() => wait(0));
