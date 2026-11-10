import { beforeEach, describe, expect, it } from "vitest";
import { all, el, inspector, page, reset, ui } from "./helpers";

const root = document.documentElement;
const panelWidth = (): number => ui(".panel")!.offsetWidth;
const marginRight = (): number => parseFloat(getComputedStyle(root).marginRight);
const cardWidth = (): number => el(".card").getBoundingClientRect().width;
const savedMode = (): string => JSON.parse(localStorage.getItem("__groma_panel") ?? "{}").mode;
const pushItem = (): HTMLElement => ui('[data-action="push"]')!;

function openMenuAndChoose(item: HTMLElement): void {
  ui(".more-button")!.click();
  item.click();
}

function dragResizeHandle(by: number): void {
  const startX = ui(".panel")!.getBoundingClientRect().left;
  ui(".resize")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: startX }));
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: startX + by }));
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
}

let widthBefore = 0;

beforeEach(() => {
  reset();
  root.style.removeProperty("margin-right");
  page(`<div class="card" style="height: 100px">Card</div>`);
  widthBefore = cardWidth();
});

describe("push mode (the default)", () => {
  it("takes the panel's width out of the page", () => {
    inspector().pin(el(".card"));
    expect(marginRight()).toBe(panelWidth());
    expect(cardWidth()).toBe(widthBefore - panelWidth());
  });

  it("gives the page its width back when the panel closes", () => {
    inspector().pin(el(".card"));
    ui(".close")!.click();
    expect(cardWidth()).toBe(widthBefore);
    expect(root.style.getPropertyValue("margin-right")).toBe("");
  });

  it("keeps the margin the page had, from a stylesheet, and restores it", () => {
    page(`<style>html { margin-right: 7px }</style><div class="card" style="height: 100px">Card</div>`);
    expect(marginRight()).toBe(7);
    inspector().pin(el(".card"));
    expect(marginRight()).toBe(7 + panelWidth());
    ui(".close")!.click();
    expect(marginRight()).toBe(7);
    expect(root.style.getPropertyValue("margin-right")).toBe("");
  });

  it("keeps an inline margin the page had on <html>, and restores it", () => {
    root.style.setProperty("margin-right", "5px");
    inspector().pin(el(".card"));
    expect(marginRight()).toBe(5 + panelWidth());
    ui(".close")!.click();
    expect(root.style.getPropertyValue("margin-right")).toBe("5px");
  });

  it("follows the panel when it collapses, expands and is resized", () => {
    inspector().pin(el(".card"));
    ui(".more-button")!.click();
    ui(".more-item.collapse")!.click();
    expect(marginRight()).toBe(28);

    ui(".rail")!.click();
    expect(marginRight()).toBe(panelWidth());

    const before = panelWidth();
    dragResizeHandle(-100);
    expect(panelWidth()).toBeGreaterThan(before);
    expect(marginRight()).toBe(panelWidth());
    ui(".panel")!.style.width = "";
  });

  it("is on in the » menu", () => {
    inspector().pin(el(".card"));
    expect(pushItem().getAttribute("aria-checked")).toBe("true");
  });
});

describe("float mode", () => {
  it("leaves the page alone while the panel covers it", () => {
    inspector().pin(el(".card"));
    openMenuAndChoose(pushItem());

    expect(pushItem().getAttribute("aria-checked")).toBe("false");
    expect(marginRight()).toBe(0);
    expect(cardWidth()).toBe(widthBefore);
    // Still pinned and shown: only the layout changed.
    expect(ui(".panel")!.offsetWidth).toBeGreaterThan(0);
  });

  it("does not push the page for a panel that opens later", () => {
    inspector().pin(el(".card"));
    openMenuAndChoose(pushItem());
    ui(".close")!.click();
    inspector().pin(el(".card"));
    expect(marginRight()).toBe(0);
  });

  it("switches back to push at once", () => {
    inspector().pin(el(".card"));
    openMenuAndChoose(pushItem());
    openMenuAndChoose(pushItem());
    expect(marginRight()).toBe(panelWidth());
    expect(pushItem().getAttribute("aria-checked")).toBe("true");
  });

  it("is remembered, in either direction", () => {
    inspector().pin(el(".card"));
    openMenuAndChoose(pushItem());
    expect(savedMode()).toBe("float");
    openMenuAndChoose(pushItem());
    expect(savedMode()).toBe("push");
  });

  it("closes the menu after the choice", () => {
    inspector().pin(el(".card"));
    openMenuAndChoose(pushItem());
    expect(ui(".more-menu")!.hidden).toBe(true);
    expect(all(".more-item")).toHaveLength(3);
  });
});
