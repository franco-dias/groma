import { beforeEach, describe, expect, it } from "vitest";
import { all, el, holdAlt, inspector, openTab, page, reset, rightClick, texts, ui } from "./helpers";

const layerNames = (): string[] => texts(".layer .layer-name");

beforeEach(() => {
  reset();
  page(`
    <div data-artboard class="board" style="width: 400px; padding: 20px">
      <header class="top">Header</header>
      <main class="content">
        <div class="card" style="padding: 20px">
          <span class="label">Label</span>
          <button class="action">Go</button>
        </div>
      </main>
      <script type="text/plain">not a layer</script>
    </div>
  `);
});

describe("Layers tab", () => {
  it("shows the board's tree, opened down to the pinned element", () => {
    inspector().pin(el(".card"));
    openTab("layers");
    expect(layerNames()).toEqual(["div.board", "header.top", "main.content", "div.card"]);
    expect(texts(".layer.is-current .layer-name")).toEqual(["div.card"]);
  });

  it("opens a layer from its caret", () => {
    inspector().pin(el(".card"));
    openTab("layers");
    ui(".layer.is-current .caret")!.click();
    expect(layerNames().slice(-2)).toEqual(["span.label", "button.action"]);
  });

  it("pins a layer on click and outlines it on hover", () => {
    inspector().pin(el(".card"));
    openTab("layers");
    const header = all(".layer").find((row) => row.textContent === "header.top")!;

    header.dispatchEvent(new MouseEvent("mouseenter"));
    const outline = ui(".outline-hover")!;
    expect(getComputedStyle(outline).display).toBe("block");
    expect(outline.getBoundingClientRect().height).toBe(el(".top").getBoundingClientRect().height);

    header.click();
    expect(inspector().pinnedElement()).toBe(el(".top"));
    expect(getComputedStyle(outline).display).toBe("none");
  });
});

describe("layers under the pointer (Alt + right-click)", () => {
  it("lists every layer at that point, topmost first, with sizes", () => {
    holdAlt();
    const event = rightClick(el(".label"));

    expect(event.defaultPrevented).toBe(true);
    expect(texts(".menu-head .count")).toEqual(["5"]);
    expect(texts(".menu-item .layer-name")).toEqual([
      "span.label",
      "div.card",
      "main.content",
      "div.board",
      "div", // the test page's own container
    ]);
    expect(texts(".menu-item .size")[1]).toBe(
      `${el(".card").offsetWidth} × ${el(".card").offsetHeight}`,
    );
  });

  it("pins the chosen layer and closes", () => {
    holdAlt();
    rightClick(el(".label"));
    all(".menu-item")[1].click();
    expect(inspector().pinnedElement()).toBe(el(".card"));
    expect(ui(".menu")).toBeNull();
  });

  it("closes when the page is pressed elsewhere", () => {
    holdAlt();
    rightClick(el(".label"));
    el(".top").dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
    expect(ui(".menu")).toBeNull();
  });

  it("leaves the browser's own menu alone when Alt is not held", () => {
    expect(rightClick(el(".label")).defaultPrevented).toBe(false);
    expect(ui(".menu")).toBeNull();
  });
});
