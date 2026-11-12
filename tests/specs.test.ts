import { beforeEach, describe, expect, it } from "vitest";
import { pinFromLink } from "../src/link";
import {
  all,
  clipboard,
  getElement,
  frames,
  inspector,
  page,
  pressEscape,
  reset,
  texts,
  ui,
  wait,
} from "./helpers";

/** The label/value cells of the Specs tab, as { Label: "value" }. */
const cells = (): Record<string, string> =>
  Object.fromEntries(
    all(".body[data-for='specs'] .cell, .body[data-for='specs'] .wide")
      .filter((cell) => cell.querySelector(".value"))
      .map((cell) => [cell.querySelector(".label")!.textContent, cell.querySelector(".value")!.textContent]),
  );

/** The tokens listed for non-color values, as { Label: "token" }. */
const tokenNotes = (): Record<string, string> =>
  Object.fromEntries(
    all(".body[data-for='specs'] .wide")
      .filter((row) => row.querySelector(".token-note"))
      .map((row) => [
        row.querySelector(".label")!.textContent,
        row.querySelector(".token-note")!.textContent,
      ]),
  );

const block = (title: string): HTMLElement | undefined =>
  all(".body[data-for='specs'] .block").find(
    (candidate) => candidate.querySelector("h3")?.textContent === title,
  );

/** The color row for a role ("Background", "Text"…). */
const colorRow = (role: string): HTMLElement =>
  all(".token-row").find((row) => row.querySelector(".role .name")?.textContent === role)!;

const rowTexts = (row: HTMLElement, selector: string): string[] =>
  Array.from(row.querySelectorAll(selector), (node) => (node.textContent ?? "").trim());

beforeEach(() => {
  reset();
  page(`
    <style>
      #fixture { --surface: #ffffff; --brand: #009c5a; --same: #7a3cff; --mui-palette-text-primary: #1b1a17; }
      #fixture .dark { --surface: #121212; }
      .tokened { background: var(--surface); color: var(--mui-palette-text-primary); }
    </style>
    <section id="board-one" aria-label="Board One">
      <div data-artboard style="width: 600px; transform: scale(0.5); transform-origin: 0 0">
        <div class="row" style="display: flex; gap: 16px; align-items: center; margin: 4px; padding: 12px 16px">
          <div class="fixed tokened dark" style="width: 120px; height: 40px; border: 1px solid var(--brand); border-radius: 8px; box-sizing: border-box">Text <span class="child">inner</span></div>
          <div class="grow" style="flex: 1; color: #7a3cff">matches</div>
          <span class="hug" style="color: #123456; transition: opacity 0.2s ease-in">hug</span>
        </div>
      </div>
    </section>
  `);
});

describe("element header", () => {
  it("says where the element is, what it is and how big", () => {
    inspector().pin(getElement(".fixed"));
    expect(texts(".crumbs .crumb")).toEqual(["Board One", "div", "div"]);
    expect(texts(".tag-chip")).toEqual(["div"]);
    expect(texts(".title")).toEqual(["fixed"]);
    expect(texts(".title-size")).toEqual(["120 × 40"]);
  });

  it("pins the parent from the breadcrumb", () => {
    inspector().pin(getElement(".fixed"));
    ui("button.crumb")!.click();
    expect(inspector().pinnedElement()).toBe(getElement(".row"));
  });

  it("lists classes on one line, or all of them as chips", () => {
    inspector().pin(getElement(".fixed"));
    expect(texts(".class-row .classes")).toEqual([".fixed .tokened .dark"]);
    ui(".more")!.click();
    expect(texts(".class-chip")).toEqual([".fixed", ".tokened", ".dark"]);
    ui(".more")!.click();
    expect(all(".class-chip")).toHaveLength(0);
  });
});

// Direction and alignment are buttons, not text: the checked one says the value.
const checked = (prop: string) =>
  ui(`.flex-control[data-prop="${prop}"] [aria-checked="true"]`)!.dataset.value;

const intents = (selector: string) => {
  inspector().pin(getElement(selector));
  return texts(".intent");
};

describe("layout", () => {
  it("reports the position on the board in the board's own pixels", () => {
    inspector().pin(getElement(".fixed"));
    // X: 4 margin + 16 padding. Y: 12 padding (the row's top margin collapses into the board).
    // oxlint-disable-next-line eslint/id-length -- X and Y are the labels the Specs tab shows for a position
    expect(cells()).toMatchObject({ X: "20", Y: "12" });
  });

  it("tells fixed, hug and fill apart", () => {
    expect(intents(".fixed")).toEqual(["fixed", "fixed"]);
    expect(intents(".grow")).toEqual(["fill", "hug"]);
    expect(intents(".hug")).toEqual(["hug", "hug"]);
    expect(intents(".row")).toEqual(["fill", "hug"]);
  });

  it("shows lengths as bare numbers, and in rem on request", () => {
    inspector().pin(getElement(".row"));
    expect(cells()).toMatchObject({ Display: "flex", Gap: "16" });
    expect(checked("flex-direction")).toBe("row");
    expect(checked("align-items")).toBe("center");

    ui('[data-option="unit"] [data-value="rem"]')!.click();
    expect(cells().Gap).toBe("1rem");
    expect(JSON.parse(localStorage.getItem("__groma_panel")!).unit).toBe("rem");
  });

  it("shows radius and border", () => {
    inspector().pin(getElement(".fixed"));
    expect(cells()).toMatchObject({ Radius: "8", Border: "1 solid" });
  });

  it("lists the token behind a value that is not a color", () => {
    inspector().pin(getElement(".fixed"));
    expect(tokenNotes()).toEqual({ Border: "--brand" });
  });

  it("draws margin, padding and the content size as nested boxes", () => {
    inspector().pin(getElement(".row"));
    expect(texts(".box-margin > .box-side")).toEqual(["4", "4", "4", "4"]);
    expect(texts(".box-padding > .box-side")).toEqual(["12", "16", "12", "16"]);
    // 600 wide board, minus 2 × 4 margin, minus 2 × 16 padding.
    expect(texts(".box-content")).toEqual(["560 × 40"]);
  });
});

const gapValue = (): HTMLElement =>
  all(".cell")
    .find((cell) => cell.textContent!.startsWith("Gap"))!
    .querySelector<HTMLElement>(".value")!;

describe("copying", () => {
  it("copies a value as CSS on click and marks it without moving it", async () => {
    inspector().pin(getElement(".row"));
    const value = gapValue();
    const before = value.getBoundingClientRect();
    value.click();
    await wait(20);

    // Shown as a bare number, copied with its unit.
    expect(value.textContent).toBe("16");
    expect(clipboard.text).toBe("16px");
    expect(value.classList.contains("is-copied")).toBe(true);
    expect(value.getBoundingClientRect().width).toBe(before.width);
  });

  it("copies padding as a CSS declaration", async () => {
    inspector().pin(getElement(".row"));
    ui(".box-padding > .box-name")!.click();
    await wait(20);
    expect(clipboard.text).toBe("padding: 12px 16px");
  });

  it("copies bare numbers and sx keys when the page asks for the sx format", async () => {
    inspector().configure({ copyFormat: "sx" });
    inspector().pin(getElement(".row"));
    gapValue().click();
    await wait(20);
    expect(clipboard.text).toBe("16");

    ui(".box-padding > .box-name")!.click();
    await wait(20);
    expect(clipboard.text).toBe("py: 12, px: 16");
  });

  it("copies rem when the unit is rem, in either format", async () => {
    inspector().pin(getElement(".row"));
    ui('[data-option="unit"] [data-value="rem"]')!.click();
    gapValue().click();
    await wait(20);
    expect(clipboard.text).toBe("1rem");
  });

  it("copies a link that pins the element when opened", async () => {
    inspector().pin(getElement(".hug"));
    ui('[data-action="link"]')!.click();
    await wait(20);
    const link = new URL(clipboard.text);
    expect(link.hash).toBe("#board-one");
    expect(document.querySelector(link.searchParams.get("inspect")!)).toBe(getElement(".hug"));

    // Opening that link:
    ui(".close")!.click();
    // oxlint-disable-next-line unicorn/no-null -- the History API takes null for "no state"
    history.replaceState(null, "", link.search);
    pinFromLink();
    await wait(400);
    // oxlint-disable-next-line unicorn/no-null -- the History API takes null for "no state"
    history.replaceState(null, "", location.pathname);
    expect(inspector().pinnedElement()).toBe(getElement(".hug"));
  });
});

describe("colors and design tokens", () => {
  it("shows the token a color is declared with, and its value in each theme", () => {
    inspector().pin(getElement(".fixed"));
    const background = colorRow("Background");
    expect(rowTexts(background, ".token-line .value")).toEqual(["#121212"]);
    expect(rowTexts(background, ".css-var")).toEqual(["--surface"]);
    expect(rowTexts(background, ".mode")).toEqual(["#fffffffixture", "#121212dark"]);
    // The theme the element is in stands out.
    expect(rowTexts(background, ".mode.is-active")).toEqual(["#121212dark"]);
  });

  it("shows only the CSS variable when no token prefix is configured", () => {
    inspector().pin(getElement(".fixed"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".theme-path")).toEqual([]);
    expect(rowTexts(text, ".css-var:not(.is-secondary)")).toEqual(["--mui-palette-text-primary"]);
  });

  it("shows the theme path before the variable for a configured prefix", () => {
    inspector().configure({ tokenPrefixes: ["--mui-"] });
    inspector().pin(getElement(".fixed"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".theme-path")).toEqual(["palette.text.primary"]);
    expect(rowTexts(text, ".css-var.is-secondary")).toEqual(["--mui-palette-text-primary"]);
  });

  it("finds the token of an inherited text color on an ancestor", () => {
    inspector().pin(getElement(".child"));
    expect(rowTexts(colorRow("Text"), ".css-var")).toEqual(["--mui-palette-text-primary"]);
  });

  it("says when a hand-written color equals a token", () => {
    inspector().pin(getElement(".grow"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".badge")).toEqual(["Matches token"]);
    expect(rowTexts(text, ".css-var")).toEqual(["--same"]);
  });

  it("flags a color that no token has", () => {
    inspector().pin(getElement(".hug"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".badge")).toEqual(["No token"]);
    expect(text.classList.contains("is-missing")).toBe(true);
    expect(rowTexts(text, ".css-var")).toEqual([]);
  });

  it("copies each line on its own and marks the row", async () => {
    inspector().configure({ tokenPrefixes: ["--mui-"] });
    inspector().pin(getElement(".fixed"));
    const text = colorRow("Text");
    text.querySelector<HTMLElement>(".theme-path")!.click();
    await wait(20);
    expect(clipboard.text).toBe("palette.text.primary");
    expect(text.classList.contains("is-copied")).toBe(true);
  });
});

describe("typography and motion", () => {
  it("shows the font as family, weight, size and line height", () => {
    inspector().pin(getElement(".hug"));
    expect(block("Typography")).toBeDefined();
    expect(cells()).toMatchObject({ Weight: "400", Size: "16" });
  });

  it("has no typography block for an element without text of its own", () => {
    inspector().pin(getElement(".row"));
    expect(block("Typography")).toBeUndefined();
  });

  it("lists each transition with its duration and easing", () => {
    inspector().pin(getElement(".hug"));
    expect(texts(".motion-row")).toEqual(["opacity0.2sease-in"]);
    inspector().pin(getElement(".grow"));
    expect(block("Motion")).toBeUndefined();
  });
});

describe("compare", () => {
  it("lists only what differs between the baseline and the next pinned element", () => {
    inspector().pin(getElement(".fixed"));
    ui('[data-action="compare"]')!.click();
    expect(texts(".compare-summary")).toEqual(["Pin another element to compare it with A."]);

    inspector().pin(getElement(".grow"));
    expect(texts(".who .letter")).toEqual(["A", "B"]);
    expect(texts(".compare-summary")[0]).toMatch(/^\d+ differences · \d+ identical$/);
    const background = all(".compare-row").find((row) => row.textContent!.startsWith("background"))!;
    expect(rowTexts(background, ".side")).toEqual(["#121212", "none"]);
  });

  it("ends on Esc", () => {
    inspector().pin(getElement(".fixed"));
    ui('[data-action="compare"]')!.click();
    expect(block("Compare")).toBeDefined();
    pressEscape();
    expect(block("Compare")).toBeUndefined();
    expect(ui('[data-action="compare"]')!.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("grid", () => {
  it("covers the element's board and scales with it", async () => {
    inspector().pin(getElement(".fixed"));
    ui('[data-option="grid"] [data-value="8"]')!.click();
    await frames();
    const grid = ui(".grid")!;
    const board = getElement("[data-artboard]").getBoundingClientRect();
    expect(getComputedStyle(grid).display).toBe("block");
    expect(grid.getBoundingClientRect().width).toBe(board.width);
    // 8 board pixels at half size.
    expect(grid.style.getPropertyValue("mask-size")).toBe("4px 4px");
    // The lines must show on any board: they filter what is behind them
    // (a blend mode would only show on dark boards).
    expect(getComputedStyle(grid).backdropFilter).toBe("invert(0.22)");
    expect(getComputedStyle(grid).mixBlendMode).toBe("normal");

    ui('[data-option="grid"] [data-value="0"]')!.click();
    await frames();
    expect(getComputedStyle(grid).display).toBe("none");
  });

  it("stays inside the part of the board the page shows", async () => {
    // A board scrolled inside a narrower, clipping frame.
    page(`
      <div class="frame" style="width: 200px; height: 100px; overflow: hidden; margin-left: 50px">
        <div data-artboard style="width: 600px; height: 300px; margin-left: -40px">
          <p class="text" style="margin: 0">Text</p>
        </div>
      </div>
    `);
    inspector().pin(getElement(".text"));
    ui('[data-option="grid"] [data-value="8"]')!.click();
    await frames();

    const grid = ui(".grid")!.getBoundingClientRect();
    const frame = getElement(".frame").getBoundingClientRect();
    expect([grid.left, grid.top, grid.width, grid.height]).toEqual([
      frame.left,
      frame.top,
      frame.width,
      frame.height,
    ]);
    // The lines still start at the board's corner, 40px left of the frame.
    expect(ui(".grid")!.style.getPropertyValue("mask-position")).toBe("-40px 0px");
  });
});

const sizeOf = (): string => ui('.body[data-for="specs"] .size-row .value')!.textContent ?? "";

describe("declared values under media queries", () => {
  it("reads the width and the color token from the rules that apply now", () => {
    page(`
      <style>
        :root { --on-desktop: rgb(0, 128, 0); --on-phone: rgb(200, 0, 0); }
        .box { width: 120px; height: 20px; background: var(--on-desktop); }
        @media (max-width: 1px) { .box { width: 40px; background: var(--on-phone); } }
        @supports not (display: grid) { .box { width: 10px; } }
      </style>
      <div class="box"></div>
    `);
    inspector().pin(getElement(".box"));
    expect(sizeOf()).toBe("120 × 20");
    const background = colorRow("Background");
    expect(rowTexts(background, ".css-var")).toEqual(["--on-desktop"]);
  });

  it("reads a rule of a media query that matches, and of a supported feature", () => {
    page(`
      <style>
        :root { --a: rgb(0, 128, 0); --b: rgb(0, 0, 200); --c: rgb(9, 9, 9); }
        .box { height: 20px; background: var(--a); }
        @media (min-width: 1px) { .box { background: var(--b); } }
        @supports (display: grid) { .box { background: var(--c); } }
      </style>
      <div class="box"></div>
    `);
    inspector().pin(getElement(".box"));
    expect(rowTexts(colorRow("Background"), ".css-var")).toEqual(["--c"]);
  });

  it("still lists a token's value in a theme that sits in a media query that does not apply", () => {
    // Token themes read every rule on purpose: a dark theme is in a block that is off now.
    page(`
      <style>
        :root { --bg: rgb(255, 255, 255); }
        @media (max-width: 1px) { .dark { --bg: rgb(0, 0, 0); } }
        .box { height: 20px; background: var(--bg); }
      </style>
      <div class="box"></div>
    `);
    inspector().pin(getElement(".box"));
    expect(rowTexts(colorRow("Background"), ".mode")).toEqual([
      "rgb(255, 255, 255)default",
      "rgb(0, 0, 0)dark",
    ]);
  });
});
