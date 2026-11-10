import { beforeEach, describe, expect, it } from "vitest";
import { pinFromLink } from "../src/link";
import { all, clipboard, el, frames, inspector, page, pressEscape, reset, texts, ui, wait } from "./helpers";

/** The label/value cells of the Specs tab, as { Label: "value" }. */
const cells = (): Record<string, string> =>
  Object.fromEntries(
    all(".body[data-for='specs'] .cell, .body[data-for='specs'] .wide")
      .filter((cell) => cell.querySelector(".value"))
      .map((cell) => [
        cell.querySelector(".label")!.textContent,
        cell.querySelector(".value")!.textContent,
      ]),
  );

/** The tokens listed for non-colour values, as { Label: "token" }. */
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
  all(".body[data-for='specs'] .block").find((b) => b.querySelector("h3")?.textContent === title);

/** The colour row for a role ("Background", "Text"…). */
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
    inspector().pin(el(".fixed"));
    expect(texts(".crumbs .crumb")).toEqual(["Board One", "div", "div"]);
    expect(texts(".tag-chip")).toEqual(["div"]);
    expect(texts(".title")).toEqual(["fixed"]);
    expect(texts(".title-size")).toEqual(["120 × 40"]);
  });

  it("pins the parent from the breadcrumb", () => {
    inspector().pin(el(".fixed"));
    ui("button.crumb")!.click();
    expect(inspector().pinnedElement()).toBe(el(".row"));
  });

  it("lists classes on one line, or all of them as chips", () => {
    inspector().pin(el(".fixed"));
    expect(texts(".class-row .classes")).toEqual([".fixed .tokened .dark"]);
    ui(".more")!.click();
    expect(texts(".class-chip")).toEqual([".fixed", ".tokened", ".dark"]);
    ui(".more")!.click();
    expect(all(".class-chip")).toHaveLength(0);
  });
});

describe("layout", () => {
  it("reports the position on the board in the board's own pixels", () => {
    inspector().pin(el(".fixed"));
    // X: 4 margin + 16 padding. Y: 12 padding (the row's top margin collapses into the board).
    expect(cells()).toMatchObject({ X: "20", Y: "12" });
  });

  it("tells fixed, hug and fill apart", () => {
    const intents = (selector: string) => {
      inspector().pin(el(selector));
      return texts(".intent");
    };
    expect(intents(".fixed")).toEqual(["fixed", "fixed"]);
    expect(intents(".grow")).toEqual(["fill", "hug"]);
    expect(intents(".hug")).toEqual(["hug", "hug"]);
    expect(intents(".row")).toEqual(["fill", "hug"]);
  });

  it("shows lengths as bare numbers, and in rem on request", () => {
    inspector().pin(el(".row"));
    expect(cells()).toMatchObject({ Display: "flex", Direction: "row", Align: "center", Gap: "16" });

    ui('[data-option="unit"] [data-value="rem"]')!.click();
    expect(cells().Gap).toBe("1rem");
    expect(JSON.parse(localStorage.getItem("__live_inspector_panel")!).unit).toBe("rem");
  });

  it("shows radius and border", () => {
    inspector().pin(el(".fixed"));
    expect(cells()).toMatchObject({ Radius: "8", Border: "1 solid" });
  });

  it("lists the token behind a value that is not a colour", () => {
    inspector().pin(el(".fixed"));
    expect(tokenNotes()).toEqual({ Border: "--brand" });
  });

  it("draws margin, padding and the content size as nested boxes", () => {
    inspector().pin(el(".row"));
    expect(texts(".box-margin > .box-side")).toEqual(["4", "4", "4", "4"]);
    expect(texts(".box-padding > .box-side")).toEqual(["12", "16", "12", "16"]);
    // 600 wide board, minus 2 × 4 margin, minus 2 × 16 padding.
    expect(texts(".box-content")).toEqual(["560 × 40"]);
  });
});

describe("copying", () => {
  const gapValue = (): HTMLElement =>
    all(".cell")
      .find((cell) => cell.textContent!.startsWith("Gap"))!
      .querySelector<HTMLElement>(".value")!;

  it("copies a value as CSS on click and marks it without moving it", async () => {
    inspector().pin(el(".row"));
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
    inspector().pin(el(".row"));
    ui(".box-padding > .box-name")!.click();
    await wait(20);
    expect(clipboard.text).toBe("padding: 12px 16px");
  });

  it("copies bare numbers and sx keys when the page asks for the sx format", async () => {
    inspector().configure({ copyFormat: "sx" });
    inspector().pin(el(".row"));
    gapValue().click();
    await wait(20);
    expect(clipboard.text).toBe("16");

    ui(".box-padding > .box-name")!.click();
    await wait(20);
    expect(clipboard.text).toBe("py: 12, px: 16");
  });

  it("copies rem when the unit is rem, in either format", async () => {
    inspector().pin(el(".row"));
    ui('[data-option="unit"] [data-value="rem"]')!.click();
    gapValue().click();
    await wait(20);
    expect(clipboard.text).toBe("1rem");
  });

  it("copies a link that pins the element when opened", async () => {
    inspector().pin(el(".hug"));
    ui('[data-action="link"]')!.click();
    await wait(20);
    const link = new URL(clipboard.text);
    expect(link.hash).toBe("#board-one");
    expect(document.querySelector(link.searchParams.get("inspect")!)).toBe(el(".hug"));

    // Opening that link:
    ui(".close")!.click();
    history.replaceState(null, "", link.search);
    pinFromLink();
    await wait(400);
    history.replaceState(null, "", location.pathname);
    expect(inspector().pinnedElement()).toBe(el(".hug"));
  });
});

describe("colours and design tokens", () => {
  it("shows the token a colour is declared with, and its value in each theme", () => {
    inspector().pin(el(".fixed"));
    const background = colorRow("Background");
    expect(rowTexts(background, ".token-line .value")).toEqual(["#121212"]);
    expect(rowTexts(background, ".css-var")).toEqual(["--surface"]);
    expect(rowTexts(background, ".mode")).toEqual(["#fffffffixture", "#121212dark"]);
    // The theme the element is in stands out.
    expect(rowTexts(background, ".mode.is-active")).toEqual(["#121212dark"]);
  });

  it("shows only the CSS variable when no token prefix is configured", () => {
    inspector().pin(el(".fixed"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".theme-path")).toEqual([]);
    expect(rowTexts(text, ".css-var:not(.is-secondary)")).toEqual(["--mui-palette-text-primary"]);
  });

  it("shows the theme path before the variable for a configured prefix", () => {
    inspector().configure({ tokenPrefixes: ["--mui-"] });
    inspector().pin(el(".fixed"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".theme-path")).toEqual(["palette.text.primary"]);
    expect(rowTexts(text, ".css-var.is-secondary")).toEqual(["--mui-palette-text-primary"]);
  });

  it("finds the token of an inherited text colour on an ancestor", () => {
    inspector().pin(el(".child"));
    expect(rowTexts(colorRow("Text"), ".css-var")).toEqual(["--mui-palette-text-primary"]);
  });

  it("says when a hand-written colour equals a token", () => {
    inspector().pin(el(".grow"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".badge")).toEqual(["Matches token"]);
    expect(rowTexts(text, ".css-var")).toEqual(["--same"]);
  });

  it("flags a colour that no token has", () => {
    inspector().pin(el(".hug"));
    const text = colorRow("Text");
    expect(rowTexts(text, ".badge")).toEqual(["No token"]);
    expect(text.classList.contains("is-missing")).toBe(true);
    expect(rowTexts(text, ".css-var")).toEqual([]);
  });

  it("copies each line on its own and marks the row", async () => {
    inspector().configure({ tokenPrefixes: ["--mui-"] });
    inspector().pin(el(".fixed"));
    const text = colorRow("Text");
    text.querySelector<HTMLElement>(".theme-path")!.click();
    await wait(20);
    expect(clipboard.text).toBe("palette.text.primary");
    expect(text.classList.contains("is-copied")).toBe(true);
  });
});

describe("typography and motion", () => {
  it("shows the font as family, weight, size and line height", () => {
    inspector().pin(el(".hug"));
    expect(block("Typography")).toBeDefined();
    expect(cells()).toMatchObject({ Weight: "400", Size: "16" });
  });

  it("has no typography block for an element without text of its own", () => {
    inspector().pin(el(".row"));
    expect(block("Typography")).toBeUndefined();
  });

  it("lists each transition with its duration and easing", () => {
    inspector().pin(el(".hug"));
    expect(texts(".motion-row")).toEqual(["opacity0.2sease-in"]);
    inspector().pin(el(".grow"));
    expect(block("Motion")).toBeUndefined();
  });
});

describe("compare", () => {
  it("lists only what differs between the baseline and the next pinned element", () => {
    inspector().pin(el(".fixed"));
    ui('[data-action="compare"]')!.click();
    expect(texts(".compare-summary")).toEqual(["Pin another element to compare it with A."]);

    inspector().pin(el(".grow"));
    expect(texts(".who .letter")).toEqual(["A", "B"]);
    expect(texts(".compare-summary")[0]).toMatch(/^\d+ differences · \d+ identical$/);
    const background = all(".compare-row").find((row) => row.textContent!.startsWith("background"))!;
    expect(rowTexts(background, ".side")).toEqual(["#121212", "none"]);
  });

  it("ends on Esc", () => {
    inspector().pin(el(".fixed"));
    ui('[data-action="compare"]')!.click();
    expect(block("Compare")).toBeDefined();
    pressEscape();
    expect(block("Compare")).toBeUndefined();
    expect(ui('[data-action="compare"]')!.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("grid", () => {
  it("covers the element's board and scales with it", async () => {
    inspector().pin(el(".fixed"));
    ui('[data-option="grid"] [data-value="8"]')!.click();
    await frames();
    const grid = ui(".grid")!;
    const board = el("[data-artboard]").getBoundingClientRect();
    expect(getComputedStyle(grid).display).toBe("block");
    expect(grid.getBoundingClientRect().width).toBe(board.width);
    // 8 board pixels at half size.
    expect(grid.style.backgroundSize).toBe("4px 4px");

    ui('[data-option="grid"] [data-value="0"]')!.click();
    await frames();
    expect(getComputedStyle(grid).display).toBe("none");
  });
});
