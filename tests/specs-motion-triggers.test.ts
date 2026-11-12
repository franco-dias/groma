import { beforeEach, describe, expect, it } from "vitest";
import { getElement, inspector, page, reset, texts } from "./helpers";

beforeEach(() => {
  reset();
  page(`
    <style>
      .card { width: 80px; height: 40px; border: 1px solid rgb(37, 39, 45);
        transition: border-color 0.2s ease-out, opacity 0.3s ease-in; }
      .card:hover { border-color: rgb(108, 184, 255); }
    </style>
    <div class="card">Card</div>
  `);
});

describe("what starts each transition", () => {
  it("names the state that changes the property, and a change of value when none does", () => {
    inspector().pin(getElement(".card"));

    expect(texts(".motion-row .property")).toEqual(["border-color", "opacity"]);
    expect(texts(".motion-trigger")).toEqual(["Animates on hover", "Animates when its value changes"]);
  });
});
