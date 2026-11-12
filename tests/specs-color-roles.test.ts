import { beforeEach, describe, expect, it } from "vitest";
import { all, getElement, inspector, page, reset, texts } from "./helpers";

/** The color rows' roles, in order. */
const roles = (): string[] => texts(".token-row .color-role");

const rowFor = (role: string): HTMLElement =>
  all(".token-row").find((row) => row.querySelector(".color-role")?.textContent === role)!;

beforeEach(() => {
  reset();
  page(`
    <style>
      #fixture { --hairline: rgb(37, 39, 45); --accent: rgb(108, 184, 255); --clear: rgba(0, 0, 0, 0); }
      .theme-light { --accent: rgb(0, 90, 200); --hairline: rgb(220, 222, 227); }
      .card { width: 80px; height: 40px; background: rgb(27, 29, 34); color: rgb(244, 245, 247);
        border: 1px solid var(--hairline); }
      .card.is-selected { border-color: var(--accent); }
      .ghost { width: 80px; height: 40px; background: none; color: rgb(244, 245, 247); border: 1px solid var(--clear); }
    </style>
    <div class="card is-selected">Sport</div>
    <button class="ghost">Go</button>
  `);
});

describe("the Colors block", () => {
  it("names what each color is for before its value", () => {
    inspector().pin(getElement(".card"));

    expect(roles()).toEqual(["Background", "Border", "Text"]);
    const line = rowFor("Border").querySelector(".token-line")!;
    expect(line.firstElementChild!.classList.contains("color-role")).toBe(true);
  });

  it("names only the token that sets the color on screen, with that token's themes", () => {
    inspector().pin(getElement(".card"));

    const border = rowFor("Border");
    expect([...border.querySelectorAll(".css-var")].map((node) => node.textContent)).toEqual(["--accent"]);
    const modes = border.querySelector(".modes")!.textContent;
    expect(modes).toContain("rgb(0, 90, 200)");
    expect(modes).not.toContain("rgb(220, 222, 227)");
  });

  it("leaves out a color that cannot be seen", () => {
    inspector().pin(getElement(".ghost"));
    expect(roles()).toEqual(["Text"]);
  });
});
