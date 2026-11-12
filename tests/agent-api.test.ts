import { beforeEach, describe, expect, it } from "vitest";
import { clipboard, getElement, inspector, openTab, page, reset, typeOver, ui, wait } from "./helpers";

const field = (property: string): HTMLElement => ui(`.body[data-for="css"] [data-row="${property}"]`)!;
const action = (name: string): HTMLButtonElement => ui<HTMLButtonElement>(`[data-action="${name}"]`)!;

function editStyle(property: string, value: string): void {
  inspector().pin(getElement(".title"));
  openTab("css");
  typeOver(field(property), value);
}

/** The texts a listener has been called with. */
function listen(): { texts: string[]; stop: () => void } {
  const texts: string[] = [];
  const stop = inspector().onEdits((text) => texts.push(text));
  return { texts, stop };
}

beforeEach(() => {
  reset();
  page(`<h2 class="title" style="padding-top: 12px">Title</h2>`);
});

describe("window.Groma: the surface frozen at 1.0", () => {
  it("has exactly these methods, and nothing else on window", () => {
    expect(Object.keys(inspector()).toSorted()).toEqual([
      "configure",
      "edits",
      "highlight",
      "onEdits",
      "pin",
      "pinnedElement",
      "replayOverrides",
    ]);
    Object.values(inspector()).forEach((member) => expect(typeof member).toBe("function"));
  });
});

describe("Groma.edits()", () => {
  it("is empty when there are no edits or notes", () => {
    expect(inspector().edits()).toBe("");
  });

  it("is the text Copy edits copies", async () => {
    editStyle("padding-top", "16px");
    const text = inspector().edits();
    expect(text).toContain("# Edits to apply");
    expect(text).toContain("- `padding-top`: `12px` → `16px`");

    openTab("edits");
    action("copy-edits").click();
    await wait(0);
    expect(clipboard.text).toBe(text);
  });

  it("is empty again once the edit is undone", () => {
    editStyle("padding-top", "16px");
    action("undo").click();
    expect(inspector().edits()).toBe("");
  });

  it("holds a note", () => {
    inspector().pin(getElement(".title"));
    openTab("edits");
    const note = ui(".note-field")!;
    note.dispatchEvent(new FocusEvent("focus"));
    note.textContent = "Make this sticky";
    note.dispatchEvent(new FocusEvent("blur"));
    expect(inspector().edits()).toContain("Note: Make this sticky");
  });
});

describe("Groma.onEdits()", () => {
  it("calls the listener with the new text after an edit, once for each change", async () => {
    const { texts, stop } = listen();
    editStyle("padding-top", "16px");
    await wait(0);
    expect(texts).toEqual([inspector().edits()]);
    expect(texts[0]).toContain("`16px`");

    typeOver(field("padding-top"), "20px");
    await wait(0);
    expect(texts).toHaveLength(2);
    expect(texts[1]).toContain("`20px`");
    stop();
  });

  it("calls it on undo, redo and when the last edit goes", async () => {
    editStyle("padding-top", "16px");
    const { texts, stop } = listen();
    action("undo").click();
    await wait(0);
    expect(texts).toEqual([""]);

    action("redo").click();
    await wait(0);
    expect(texts).toHaveLength(2);
    expect(texts[1]).toContain("`16px`");
    stop();
  });

  it("calls it when an edit is discarded with its ↩", async () => {
    editStyle("padding-top", "16px");
    openTab("edits");
    const { texts, stop } = listen();
    ui(".edit-row .reset")!.click();
    await wait(0);
    expect(texts).toEqual([""]);
    stop();
  });

  it("calls it when a note is written", async () => {
    inspector().pin(getElement(".title"));
    openTab("edits");
    const { texts, stop } = listen();
    const note = ui(".note-field")!;
    note.dispatchEvent(new FocusEvent("focus"));
    note.textContent = "Bigger";
    note.dispatchEvent(new FocusEvent("blur"));
    await wait(0);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("Note: Bigger");
    stop();
  });

  it("does not call it for showing the original page, which changes no edit", async () => {
    editStyle("padding-top", "16px");
    openTab("edits");
    const { texts, stop } = listen();
    action("original").click();
    action("original").click();
    await wait(0);
    expect(texts).toEqual([]);
    stop();
  });

  it("stops when the returned function is called, and only that listener", async () => {
    const first = listen();
    const second = listen();
    first.stop();
    editStyle("padding-top", "16px");
    await wait(0);
    expect(first.texts).toEqual([]);
    expect(second.texts).toHaveLength(1);
    second.stop();
  });

  it("is not broken by a listener that throws", async () => {
    const stopBad = inspector().onEdits(() => {
      throw new Error("the page's mistake");
    });
    const { texts, stop } = listen();
    editStyle("padding-top", "16px");
    await wait(0);
    expect(texts).toHaveLength(1);
    stop();
    stopBad();
  });

  it("announces one choice that sets several properties once", async () => {
    const { texts, stop } = listen();
    inspector().pin(getElement(".title"));
    openTab("css");
    typeOver(field("padding-top"), "16px");
    typeOver(field("padding-bottom"), "16px");
    await wait(0);
    expect(texts).toHaveLength(1);
    stop();
  });
});
