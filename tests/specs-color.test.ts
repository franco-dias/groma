import { beforeEach, describe, expect, it } from "vitest";
import { all, clipboard, getElement, inspector, page, reset, texts, ui, wait } from "./helpers";

/** The color row for a role ("Background", "Text"…). */
const colorRow = (role: string): HTMLElement =>
  all(".token-row").find((row) => row.querySelector(".role .name")?.textContent === role)!;

const valueOf = (role: string): string => colorRow(role).querySelector(".token-line .value")!.textContent!;

const chooseFormat = (format: string): void => ui(`.color-format [data-value="${format}"]`)!.click();

beforeEach(() => {
  reset();
  page(`
    <div class="card" style="width: 80px; height: 20px; color: rgb(47, 107, 255);
      background-color: rgba(47, 107, 255, 0.5)">Text</div>
    <div class="other" style="width: 80px; height: 20px; background-color: rgb(0, 128, 0)"></div>
  `);
  inspector().pin(getElement(".card"));
});

describe("color format", () => {
  it("shows hex with a separate alpha to begin with", () => {
    expect(valueOf("Text")).toBe("#2F6BFF");
    expect(valueOf("Background")).toBe("#2F6BFF");
    expect(texts(".token-line .alpha")).toEqual(["50%", "100%"]);
  });

  it("shows every color as rgb, alpha inside the text", () => {
    chooseFormat("rgb");
    expect(valueOf("Text")).toBe("rgb(47 107 255)");
    expect(valueOf("Background")).toBe("rgb(47 107 255 / 50%)");
    expect(texts(".token-line .alpha")).toEqual([]);
  });

  it("shows every color as hsl", () => {
    chooseFormat("hsl");
    expect(valueOf("Text")).toBe("hsl(223 100% 59%)");
    expect(valueOf("Background")).toBe("hsl(223 100% 59% / 50%)");
  });

  it("copies what it shows, and hex without its alpha", async () => {
    colorRow("Background").querySelector<HTMLElement>(".token-line .value")!.click();
    await wait(20);
    expect(clipboard.text).toBe("#2F6BFF");

    chooseFormat("rgb");
    colorRow("Background").querySelector<HTMLElement>(".token-line .value")!.click();
    await wait(20);
    expect(clipboard.text).toBe("rgb(47 107 255 / 50%)");
  });

  it("changes the colors of a comparison too", () => {
    chooseFormat("hsl");
    ui('[data-action="compare"]')!.click();
    inspector().pin(getElement(".other"));
    const background = all(".compare-row").find((row) => row.textContent!.startsWith("background"))!;
    expect(background.textContent).toContain("hsl(120 100% 25%)");
  });

  it("leaves the field a double-click opens in hex", () => {
    chooseFormat("rgb");
    const value = ui('.body[data-for="specs"] [data-edits="color"]')!;
    value.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
    expect(value.textContent).toBe("#2F6BFF");
  });

  it("remembers the choice for the site", () => {
    chooseFormat("hsl");
    expect(JSON.parse(localStorage.getItem("__groma_panel")!).colorFormat).toBe("hsl");
    expect(ui('.color-format [aria-checked="true"]')!.dataset.value).toBe("hsl");
  });
});

/** The contrast line of the pinned element: what it says and its badge. */
const contrast = (): string[] => [
  ...texts(".contrast-line .value, .contrast-line .hint"),
  ...texts(".contrast-line .level"),
];

function pinText(style: string, wrapper = ""): void {
  page(`${wrapper}<p class="sample" style="margin: 0; ${style}">Sample</p>${wrapper && "</div>"}`);
  inspector().pin(getElement(".sample"));
}

describe("contrast", () => {
  it("gives the ratio against the background and the level it meets", () => {
    pinText("color: rgb(119, 119, 119); background: rgb(255, 255, 255); font-size: 16px");
    expect(contrast()).toEqual(["4.48 : 1", "Fails AA"]);
  });

  it("rates good contrast AA and AAA", () => {
    pinText("color: rgb(118, 118, 118); background: rgb(255, 255, 255)");
    expect(contrast()).toEqual(["4.54 : 1", "AA"]);
    pinText("color: rgb(0, 0, 0); background: rgb(255, 255, 255)");
    expect(contrast()).toEqual(["21 : 1", "AAA"]);
  });

  it("judges large text by the lower thresholds", () => {
    pinText("color: rgb(119, 119, 119); background: rgb(255, 255, 255); font-size: 24px");
    expect(contrast()).toEqual(["4.48 : 1", "AA"]);
    pinText("color: rgb(119, 119, 119); background: rgb(255, 255, 255); font-size: 19px; font-weight: 700");
    expect(contrast()).toEqual(["4.48 : 1", "AA"]);
  });

  it("looks up through the ancestors for the background", () => {
    pinText("color: rgb(255, 255, 255)", '<div style="background: rgb(0, 0, 0)"><div>');
    expect(contrast()).toEqual(["21 : 1", "AAA"]);
  });

  it("composites translucent layers and the text's own alpha", () => {
    pinText("color: rgba(255, 255, 255, 0.5)", '<div style="background: rgba(0, 0, 0, 0.5)"><div>');
    // 50% black over the white canvas is grey 128; white at 50% over it is grey 191.
    expect(contrast()).toEqual(["2.17 : 1", "Fails AA"]);
  });

  it("takes the page's canvas as white when nothing has a color", () => {
    pinText("color: rgb(0, 0, 0)");
    expect(contrast()).toEqual(["21 : 1", "AAA"]);
  });

  it("says when the text is over an image or a gradient and shows no ratio", () => {
    pinText("color: rgb(0, 0, 0)", '<div style="background-image: linear-gradient(red, blue)"><div>');
    expect(contrast()).toEqual(["over an image"]);
  });

  it("is not on an element with no text of its own", () => {
    page(`<div class="empty" style="width: 20px; height: 20px"></div>`);
    inspector().pin(getElement(".empty"));
    expect(contrast()).toEqual([]);
  });
});
