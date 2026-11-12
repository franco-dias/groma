import { beforeEach, describe, expect, it } from "vitest";
import { all, getElement, inspector, openTab, page, reset, texts, ui } from "./helpers";

const layerNames = (): string[] => texts(".layer .layer-name");
const pinnedName = (): string => texts(".layer.is-current .layer-name")[0];

/** A key as the browser sends it to the focused tree: it bubbles, crosses the shadow root and can be cancelled. */
function pressInTree(key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true });
  ui(".tree")!.dispatchEvent(event);
  return event;
}

function openLayersAt(selector: string): void {
  inspector().pin(getElement(selector));
  openTab("layers");
}

beforeEach(() => {
  reset();
  page(`
    <div data-artboard class="board">
      <header class="top">Header</header>
      <main class="content">
        <div class="card">
          <span class="label">Label</span>
          <button class="action">Go</button>
        </div>
      </main>
      <footer class="bottom">Footer</footer>
    </div>
  `);
});

describe("arrow keys in the Layers tree", () => {
  it("→ opens a closed layer and ← closes it, with the pin where it was", () => {
    openLayersAt(".card");

    pressInTree("ArrowRight");
    expect(layerNames()).toContain("button.action");

    pressInTree("ArrowLeft");
    expect(layerNames()).not.toContain("button.action");
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("↓ and ↑ move the pin to the next and the previous row", () => {
    openLayersAt(".top");

    pressInTree("ArrowDown");
    expect(inspector().pinnedElement()).toBe(getElement(".content"));

    pressInTree("ArrowUp");
    expect(inspector().pinnedElement()).toBe(getElement(".top"));
  });

  it("↓ on the last child goes on to the next row the tree shows", () => {
    openLayersAt(".action");

    pressInTree("ArrowDown");

    expect(inspector().pinnedElement()).toBe(getElement(".bottom"));
    expect(pinnedName()).toBe("footer.bottom");
    // The branch it left stays as it was shown, instead of folding under the user.
    expect(layerNames()).toContain("button.action");
  });

  it("keeps the tree as it was shown when a layer is clicked", () => {
    openLayersAt(".action");

    all(".layer")
      .find((row) => row.textContent === "header.top")!
      .click();

    expect(layerNames()).toContain("button.action");
  });

  it("keeps open the layers the keys opened while the pin moves on", () => {
    openLayersAt(".top");

    for (const key of [
      "ArrowDown",
      "ArrowRight",
      "ArrowDown",
      "ArrowRight",
      "ArrowDown",
      "ArrowDown",
      "ArrowDown",
    ]) {
      pressInTree(key);
    }

    expect(inspector().pinnedElement()).toBe(getElement(".bottom"));
    expect(layerNames()).toEqual([
      "div.board",
      "header.top",
      "main.content",
      "div.card",
      "span.label",
      "button.action",
      "footer.bottom",
    ]);
  });

  it("← on a closed layer moves the pin to its parent, → on an open one to its first child", () => {
    openLayersAt(".label");

    pressInTree("ArrowLeft");
    expect(inspector().pinnedElement()).toBe(getElement(".card"));

    pressInTree("ArrowRight");
    expect(inspector().pinnedElement()).toBe(getElement(".label"));
  });

  it("stops at the last row", () => {
    openLayersAt(".bottom");
    pressInTree("ArrowDown");
    expect(inspector().pinnedElement()).toBe(getElement(".bottom"));
  });

  it("keeps the keys from the page", () => {
    openLayersAt(".top");
    expect(pressInTree("ArrowDown").defaultPrevented).toBe(true);
  });

  it("takes the focus when a layer is clicked, so the keys reach it", () => {
    openLayersAt(".card");

    all(".layer")
      .find((row) => row.textContent === "header.top")!
      .click();

    expect(inspector().pinnedElement()).toBe(getElement(".top"));
    expect(ui(".tree")!.getRootNode()).toBeInstanceOf(ShadowRoot);
    expect((ui(".tree")!.getRootNode() as ShadowRoot).activeElement).toBe(ui(".tree"));
  });
});
