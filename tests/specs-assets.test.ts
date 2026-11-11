import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { all, clipboard, getElement, inspector, page, reset, texts, ui, wait } from "./helpers";

/** A solid PNG, as a data URL: no file and no network. */
function pngUrl({ width, height }: { width: number; height: number }): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgb(200, 0, 0)";
  context.fillRect(0, 0, width, height);
  return canvas.toDataURL();
}

const SMALL = pngUrl({ width: 40, height: 20 });

async function pinImage(markup: string): Promise<void> {
  page(markup);
  await getElement<HTMLImageElement>("img").decode();
  inspector().pin(getElement("img"));
}

const block = (): HTMLElement | undefined =>
  all('.body[data-for="specs"] .block').find((node) => node.querySelector("h3")?.textContent === "Asset");

const click = async (action: string): Promise<void> => {
  ui<HTMLElement>(`.asset [data-action="${action}"]`)!.click();
  await wait(20);
};

beforeEach(reset);
afterEach(() => vi.restoreAllMocks());

describe("Asset block, for an image", () => {
  it("shows the natural size beside the size it is shown at, a 2× note, and the file's name", async () => {
    await pinImage(`<img src="${SMALL}" style="width: 20px; height: 10px">`);
    expect(texts(".asset .asset-size")).toEqual(["40 × 20 shown at 20 × 10 · 2×"]);
    expect(texts(".asset .asset-name")).toEqual(["embedded"]);
  });

  it("shows no note when the image is not shown at a clean fraction of its size", async () => {
    await pinImage(`<img src="${SMALL}" style="width: 30px; height: 15px">`);
    expect(texts(".asset .asset-size")).toEqual(["40 × 20 shown at 30 × 15"]);
  });

  it("measures the shown size in board pixels on a zoomed board", async () => {
    await pinImage(
      `<div data-artboard style="width: 200px; transform: scale(0.5); transform-origin: 0 0"><img src="${SMALL}" style="width: 20px; height: 10px"></div>`,
    );
    expect(texts(".asset .asset-size")).toEqual(["40 × 20 shown at 20 × 10 · 2×"]);
  });

  it("draws a preview from the pixels the page already has", async () => {
    await pinImage(`<img src="${SMALL}" style="width: 20px; height: 10px">`);
    const preview = ui<HTMLCanvasElement>(".asset .asset-preview canvas")!;
    const pixel = preview.getContext("2d")!.getImageData(preview.width / 2, preview.height / 2, 1, 1).data;
    expect(Array.from(pixel)).toEqual([200, 0, 0, 255]);
  });

  it("copies the address", async () => {
    await pinImage(`<img src="${SMALL}" style="width: 20px; height: 10px">`);
    await click("copy-address");
    expect(clipboard.text).toBe(SMALL);
    expect(ui(".asset [data-action='copy-address']")!.classList.contains("is-copied")).toBe(true);
  });

  it("downloads it with an anchor made inside the inspector", async () => {
    const anchors: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      anchors.push({ href: this.href, download: this.download });
    });
    await pinImage(`<img src="${SMALL}" style="width: 20px; height: 10px">`);
    await click("download");
    expect(anchors).toEqual([{ href: SMALL, download: "image.png" }]);
    expect(ui("a")).toBeNull();
  });

  it("is there for an image inside a picture too", async () => {
    await pinImage(`<picture><img src="${SMALL}" style="width: 20px; height: 10px"></picture>`);
    expect(block()).toBeDefined();
  });

  it("is the first block", async () => {
    await pinImage(`<img src="${SMALL}" style="width: 20px; height: 10px">`);
    expect(texts('.body[data-for="specs"] .block h3')[0]).toBe("Asset");
  });
});

describe("Asset block, for an inline svg", () => {
  const SVG = `<svg class="icon" viewBox="0 0 24 24" width="24" height="24"><path d="M3 3h18v18H3z"/></svg>`;

  it("shows its viewBox and its size, and copies its markup", async () => {
    page(SVG);
    inspector().pin(getElement(".icon"));
    expect(texts(".asset .asset-size")).toEqual(["viewBox 0 0 24 24 · 24 × 24"]);
    await click("copy-svg");
    expect(clipboard.text).toBe(getElement(".icon").outerHTML);
  });

  it("is not there for the shapes inside it", () => {
    page(SVG);
    inspector().pin(getElement(".icon path"));
    expect(block()).toBeUndefined();
  });
});

describe("Asset block, for a background image", () => {
  it("names each url() layer and copies its address", async () => {
    page(
      `<div class="hero" style="width: 20px; height: 20px; background-image: url('${SMALL}'), linear-gradient(red, blue)"></div>`,
    );
    inspector().pin(getElement(".hero"));
    expect(texts(".asset .asset-name")).toEqual(["embedded"]);
    await click("copy-address");
    expect(clipboard.text).toBe(SMALL);
  });
});

describe("Asset block", () => {
  it("is not there for a plain div", () => {
    page(`<div class="plain" style="width: 20px; height: 20px">x</div>`);
    inspector().pin(getElement(".plain"));
    expect(block()).toBeUndefined();
  });

  it("fits a panel 320px wide with no sideways scroll", async () => {
    await pinImage(`<img src="${SMALL}" style="width: 20px; height: 10px">`);
    ui(".panel")!.style.width = "320px";
    const body = ui('.body[data-for="specs"]')!;
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  });
});
