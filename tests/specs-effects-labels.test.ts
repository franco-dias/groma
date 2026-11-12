import { beforeEach, describe, expect, it } from "vitest";
import { all, getElement, inspector, page, reset, texts } from "./helpers";

function pinStyle(style: string, head = ""): void {
  page(
    `<style>#fixture { --brand: #2f6bff; ${head} }</style><div class="card" style="width: 120px; height: 40px; ${style}">Card</div>`,
  );
  inspector().pin(getElement(".card"));
}

const group = (label: string): HTMLElement =>
  all(".effects .effect-group").find((node) => node.querySelector(".effect-label")?.textContent === label)!;

beforeEach(reset);

describe("what each effect is", () => {
  it("names a box shadow as a drop or an inner shadow, and labels its offsets, blur and spread", () => {
    pinStyle("box-shadow: 0 4px 12px 1px rgba(0, 0, 0, 0.2), inset 0 1px 0 #ffffff");

    expect(texts(".effects .shadow-kind")).toEqual(["Drop shadow", "Inner shadow"]);
    const first = group("Shadow").querySelector(".shadow-parts")!;
    expect(Array.from(first.children, (part) => part.textContent)).toEqual([
      "x 0",
      "y 4",
      "blur 12",
      "spread 1",
    ]);
  });

  it("leaves a text shadow to its group's name, with no spread", () => {
    pinStyle("text-shadow: 0 1px 2px black");

    expect(texts(".effects .shadow-kind")).toEqual([]);
    expect(texts(".effects .shadow-parts")).toEqual(["x 0y 1blur 2"]);
  });

  it("names one token for a color that several tokens hold", () => {
    pinStyle("box-shadow: 0 2px 4px rgb(47, 107, 255)", "--brand-copy: #2f6bff;");
    expect(texts(".effects .effect-token .css-var")).toEqual(["--brand"]);
  });

  it("says what a filter does, and to what", () => {
    pinStyle("filter: brightness(1.1); backdrop-filter: blur(16px)");

    expect(texts(".effects .effect-note")).toEqual([
      "Changes the brightness of the element",
      "Blurs what is behind the element",
    ]);
  });
});
