import { beforeEach, describe, expect, it } from "vitest";
import { all, getElement, inspector, page, reset } from "./helpers";

/** The Layout block's token notes, as "label token". */
const layoutNotes = (): string[] => {
  const layout = all('.body[data-for="specs"] .block').find(
    (block) => block.querySelector("h3")?.textContent === "Layout",
  )!;
  return Array.from(layout.querySelectorAll(".wide"))
    .filter((row) => row.querySelector(".token-note"))
    .map(
      (row) => `${row.querySelector(".label")!.textContent} ${row.querySelector(".token-note")!.textContent}`,
    );
};

beforeEach(() => {
  reset();
  page(`
    <style>
      #fixture { --hairline: rgb(37, 39, 45); --accent: rgb(108, 184, 255); --line: 2px; }
      .card { width: 80px; height: 40px; border: 1px solid var(--hairline); }
      .card.is-selected { border-color: var(--accent); }
      .thick { width: 80px; height: 40px; border: var(--line) solid var(--hairline); }
    </style>
    <div class="card is-selected">Sport</div>
    <div class="thick">Thick</div>
  `);
});

describe("the Layout block's token notes", () => {
  it("leave a border's color token to the Colors block", () => {
    inspector().pin(getElement(".card"));
    expect(layoutNotes()).toEqual([]);
  });

  it("still name the token a border's width is declared with", () => {
    inspector().pin(getElement(".thick"));
    expect(layoutNotes()).toEqual(["Border --line"]);
  });
});
