import { beforeEach, describe, expect, it } from "vitest";
import { all, getElement, holdAlt, hover, inspector, page, reset, texts, ui } from "./helpers";

beforeEach(() => {
  reset();
  // A board shown at half size: distances must still read in the board's own pixels.
  page(`
    <div data-artboard style="position: relative; width: 400px; height: 200px; transform: scale(0.5); transform-origin: 0 0">
      <div class="a" style="position: absolute; left: 20px; top: 20px; width: 40px; height: 40px"></div>
      <div class="b" style="position: absolute; left: 100px; top: 20px; width: 40px; height: 40px"></div>
      <div class="far" style="position: absolute; left: 300px; top: 20px; width: 40px; height: 40px"></div>
      <div class="outer" style="position: absolute; left: 200px; top: 80px; width: 100px; height: 100px">
        <div class="inner" style="position: absolute; left: 10px; top: 20px; width: 30px; height: 30px"></div>
      </div>
    </div>
  `);
});

describe("measuring (Alt + hover with an element pinned)", () => {
  it("shows the gap between two elements, undoing the board's zoom", () => {
    inspector().pin(getElement(".a"));
    holdAlt();
    hover(getElement(".b"));

    expect(texts(".measure-label")).toEqual(["40"]);
    expect(all(".overlay > .measure")).toHaveLength(1);
  });

  it("draws only the target's outline, not its box model", () => {
    inspector().pin(getElement(".a"));
    holdAlt();
    hover(getElement(".b"));

    expect(all(".overlay > .target")).toHaveLength(1);
    expect(all(".overlay > .margin, .overlay > .padding, .overlay > .content-box")).toHaveLength(0);
  });

  it("shows the four insets when one element contains the other", () => {
    inspector().pin(getElement(".inner"));
    holdAlt();
    hover(getElement(".outer"));
    // left, right, top, bottom
    expect(texts(".measure-label")).toEqual(["10", "60", "20", "50"]);
  });

  it("puts a label inside a long line and beside a short one", () => {
    inspector().pin(getElement(".a"));
    holdAlt();
    hover(getElement(".b")); // 20px on screen: too short for the label
    expect(ui(".measure-label")!.style.transform).toBe("translate(-50%, -150%)");

    hover(getElement(".far")); // 120px on screen
    expect(ui(".measure-label")!.style.transform).toBe("translate(-50%, -50%)");
  });

  it("shows the pinned element's own box model when it is hovered", () => {
    inspector().pin(getElement(".a"));
    holdAlt();
    hover(getElement(".a"));
    expect(all(".overlay > .measure")).toHaveLength(0);
    expect(all(".overlay > .content-box")).toHaveLength(1);
  });
});
