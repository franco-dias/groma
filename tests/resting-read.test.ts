import { beforeEach, describe, expect, it } from "vitest";
import { all, frames, getElement, inspector, page, reset, ui } from "./helpers";

const background = (): string =>
  all(".token-row")
    .find((row) => row.querySelector(".color-role")?.textContent === "Background")!
    .querySelector(".token-line .value")!.textContent!;

const widthField = (): HTMLElement => ui('.body[data-for="specs"] [data-edits="width"]')!;

/** The pointer leaves `from` for `to`, as the browser tells the page. */
const leave = (from: Element, to: Element): boolean =>
  from.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, composed: true, relatedTarget: to }));

let card: HTMLElement;

/** Pins the card as a click does, with the pointer on it: it has its hover color. */
function pinHovered(): void {
  card.classList.add("is-hovered");
  inspector().pin(card);
}

/** The pointer leaves the card, which goes back to its color at rest. */
function leaveCard(): void {
  card.classList.remove("is-hovered");
  leave(card, document.body);
}

beforeEach(() => {
  reset();
  page(`
    <style>
      .card { width: 80px; height: 20px; background-color: rgb(47, 107, 255) }
      .card.is-hovered { background-color: rgb(29, 78, 216) }
      .slow { transition: background-color 60ms linear }
    </style>
    <div class="card"><span class="label">Text</span></div>
  `);
  card = getElement(".card");
});

describe("when the pointer leaves the pinned element", () => {
  it("reads it again, so the panel shows the element at rest", async () => {
    pinHovered();
    expect(background()).toBe("#1D4ED8");

    leaveCard();

    await expect.poll(background).toBe("#2F6BFF");
  });

  it("waits for the transition back to end", async () => {
    card.classList.add("slow");
    pinHovered();
    await frames();

    leaveCard();

    await expect.poll(background).toBe("#2F6BFF");
  });

  it("does not read again while the pointer only moves inside it", async () => {
    pinHovered();

    card.classList.remove("is-hovered");
    leave(getElement(".label"), card);
    await frames();

    expect(background()).toBe("#1D4ED8");
  });

  it("leaves a value the user has open in the panel", async () => {
    pinHovered();
    widthField().dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));

    leaveCard();
    await frames();

    expect(widthField().classList.contains("is-editing")).toBe(true);
  });
});
