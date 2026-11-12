import { beforeEach, describe, expect, it } from "vitest";
import { all, clipboard, getElement, inspector, page, reset, texts, ui, wait } from "./helpers";

const STYLES = `
  .button { color: rgb(0, 0, 0); background: rgb(255, 255, 255); display: inline-block; }
  .button:hover { background: rgb(0, 128, 0); color: rgb(9, 9, 9); }
  .button:hover { color: rgb(1, 2, 3); }
  .card:hover .button { border-color: rgb(255, 0, 0); }
  .button:focus { outline: 2px solid rgb(0, 0, 255); }
  .button:hover:focus { margin-left: 3px; }
  .button:active { color: rgb(0, 0, 0); display: inline-block; opacity: 0.5; }
  .other:hover { color: pink; }
  @media (max-width: 1px) { .button:hover { padding-top: 40px; } }
  @media (min-width: 1px) { .button:active { transform: scale(0.98); } }
`;

const MARKUP = `<div class="card"><button class="button">Go</button></div><p class="other">Other</p>`;

function pinButton(html = MARKUP, styles = STYLES): void {
  page(`<style>${styles}</style>${html}`);
  inspector().pin(getElement(".button"));
}

const block = (): HTMLElement | undefined =>
  all('.body[data-for="specs"] .block').find((node) => node.querySelector("h3")?.textContent === "States");

const readings = (nodes: Element[]): string[] =>
  nodes.map((node) =>
    Array.from(node.children, (part) => part.textContent)
      .filter(Boolean)
      .join(" "),
  );

const groups = (): string[] => texts(".states .effect-label");

const rowsOf = (state: string): string[] => {
  const group = all(".states .effect-group").find(
    (node) => node.querySelector(".effect-label")?.textContent === state,
  )!;
  return readings(Array.from(group.querySelectorAll(".effect-line")));
};

beforeEach(reset);

describe("States block", () => {
  it("lists each state the element's rules change, in a fixed order", () => {
    pinButton();
    expect(groups()).toEqual([":hover", ":focus", ":active"]);
  });

  it("lists a state's declarations as property and value, later rules winning", () => {
    pinButton();
    expect(rowsOf(":hover")).toEqual([
      "background rgb(0, 128, 0)",
      "color rgb(1, 2, 3)",
      "border-color rgb(255, 0, 0)",
      "margin-left 3px",
    ]);
  });

  it("counts a rule for the element inside an ancestor's state", () => {
    pinButton();
    expect(rowsOf(":hover")).toContain("border-color rgb(255, 0, 0)");
  });

  it("lists a rule with two states under each", () => {
    pinButton();
    expect(rowsOf(":focus")).toEqual(["outline rgb(0, 0, 255) solid 2px", "margin-left 3px"]);
    expect(rowsOf(":hover")).toContain("margin-left 3px");
  });

  it("leaves out what a state sets to the value the element has now", () => {
    pinButton();
    expect(rowsOf(":active")).toEqual(["opacity 0.5", "transform scale(0.98)"]);
  });

  it("shows a swatch for a color", () => {
    pinButton();
    const swatches = all(".states .effect-line .swatch").map((swatch) =>
      swatch.style.getPropertyValue("--swatch"),
    );
    expect(swatches).toContain("rgb(0, 128, 0)");
  });

  it("leaves out a rule of another element and one in a media query that does not apply", () => {
    pinButton();
    expect(rowsOf(":hover").join()).not.toContain("pink");
    expect(rowsOf(":hover").join()).not.toContain("padding-top");
  });

  it("copies property: value on a click on a row", async () => {
    pinButton();
    all(".states .effect-line")[0].click();
    await wait(20);
    expect(clipboard.text).toBe("background: rgb(0, 128, 0)");
  });

  it("is read only: nothing in it opens as a field", () => {
    pinButton();
    expect(all(".states .is-editable")).toEqual([]);
  });

  it("lists only the rules of the element pinned, and is not there for one with none", () => {
    pinButton();
    inspector().pin(getElement(".other"));
    expect(texts(".states .effect-label")).toEqual([":hover"]);
    inspector().pin(getElement(".card"));
    expect(block()).toBeUndefined();
  });

  it("reads a variable's value to tell whether a state changes anything", () => {
    pinButton(
      MARKUP,
      `:root { --ink: rgb(0, 0, 0); --accent: rgb(0, 0, 200); }
      .button { color: var(--ink); } .button:hover { color: var(--ink); background: var(--accent); }`,
    );
    expect(rowsOf(":hover")).toEqual(["background var(--accent)"]);
  });

  it("is placed after Typography", () => {
    pinButton();
    const titles = texts('.body[data-for="specs"] .block h3');
    expect(titles.indexOf("States")).toBe(titles.indexOf("Typography") + 1);
  });

  it("fits a panel 320px wide with no sideways scroll", () => {
    pinButton();
    ui(".panel")!.style.width = "320px";
    const body = ui('.body[data-for="specs"]')!;
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  });
});
