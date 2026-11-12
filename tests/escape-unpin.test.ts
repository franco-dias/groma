import { beforeEach, describe, expect, it } from "vitest";
import { getElement, inspector, page, pressKey, reset, ui } from "./helpers";

beforeEach(() => {
  reset();
  page(`
    <div class="card">Card</div>
    <div class="other">Other</div>
    <input class="search">
  `);
});

const pinCard = (): void => inspector().pin(getElement(".card"));

describe("Esc unpins the pinned element", () => {
  it("unpins it and closes the panel when nothing else takes the Esc", () => {
    pinCard();
    expect(ui(".panel")!.classList.contains("is-closed")).toBe(false);

    pressKey(getElement(".other"), "Escape");

    expect(inspector().pinnedElement()).toBeNull();
    expect(ui(".panel")!.classList.contains("is-closed")).toBe(true);
  });

  it("turns the inspect lock off first, and unpins at the next Esc", () => {
    ui(".launcher")!.click();
    pinCard();

    pressKey(getElement(".other"), "Escape");
    expect(ui(".launcher")!.classList.contains("is-locked")).toBe(false);
    expect(inspector().pinnedElement()).toBe(getElement(".card"));

    pressKey(getElement(".other"), "Escape");
    expect(inspector().pinnedElement()).toBeNull();
  });

  it("ends a comparison first, and keeps the pin", () => {
    pinCard();
    ui('[data-action="compare"]')!.click();

    pressKey(getElement(".other"), "Escape");

    expect(ui('[data-action="compare"]')!.getAttribute("aria-pressed")).toBe("false");
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("closes an open » menu first, and keeps the pin", () => {
    pinCard();
    ui(".more-button")!.click();

    pressKey(ui(".tab")!, "Escape");

    expect(ui(".more-menu")!.hidden).toBe(true);
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("leaves an Esc typed in a field alone", () => {
    pinCard();
    pressKey(getElement(".search"), "Escape");
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("leaves the Esc to a value open as a field in the panel, wherever it is sent from", () => {
    pinCard();
    const width = ui('.body[data-for="specs"] [data-edits="width"]')!;
    width.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
    expect(width.isContentEditable).toBe(true);

    pressKey(getElement(".other"), "Escape");

    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("leaves an Esc the page used alone", () => {
    pinCard();
    const dialog = getElement(".other");
    dialog.addEventListener("keydown", (event) => event.preventDefault());

    pressKey(dialog, "Escape");

    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });
});
