import { beforeEach, describe, expect, it } from "vitest";
import {
  all,
  clipboard,
  doubleClick,
  getElement,
  inspector,
  page,
  reset,
  texts,
  typeOver,
  ui,
  wait,
} from "./helpers";

const blockTitles = (): string[] => texts('.body[data-for="specs"] .block h3');

const effects = (): HTMLElement =>
  all('.body[data-for="specs"] .block').find(
    (block) => block.querySelector("h3")?.textContent === "Effects",
  )!;

const labels = (): string[] => texts(".effects .effect-label");

const group = (label: string): HTMLElement =>
  all(".effects .effect-group").find((node) => node.querySelector(".effect-label")?.textContent === label)!;

/** The parts of each node, one space apart: the way they read on screen. */
const readings = (nodes: Element[]): string[] =>
  nodes.map((node) =>
    Array.from(node.children, (part) => part.textContent)
      .filter(Boolean)
      .join(" "),
  );

const lines = (label: string): string[] =>
  readings(Array.from(group(label).querySelectorAll(".effect-line")));

function pinStyle(style: string, head = ""): void {
  page(
    `<style>#fixture { --brand: #2f6bff; ${head} }</style><div class="card" style="width: 120px; height: 40px; ${style}">Card</div>`,
  );
  inspector().pin(getElement(".card"));
}

beforeEach(reset);

describe("Effects block", () => {
  it("is not there for an element with no effect", () => {
    pinStyle("");
    expect(blockTitles()).not.toContain("Effects");
  });

  it("sits after Box and before Colors", () => {
    pinStyle("box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); background: rgb(255, 255, 255)");
    expect(blockTitles()).toEqual(["Layout", "Box", "Effects", "Colors", "Typography"]);
  });

  it("leaves shadow and gradient out of the Layout block", () => {
    pinStyle("box-shadow: 0 4px 12px red; background-image: linear-gradient(red, blue)");
    const layout = all('.body[data-for="specs"] .block')[0];
    expect(layout.textContent).not.toContain("Shadow");
    expect(layout.textContent).not.toContain("Gradient");
  });

  it("lists each shadow with its offsets, blur, spread, color and inset", () => {
    pinStyle("box-shadow: 0 4px 12px 1px rgba(0, 0, 0, 0.2), inset 0 1px 0 #ffffff");
    expect(labels()).toEqual(["Shadow"]);
    expect(lines("Shadow")).toEqual(["0 4 12 1 #000000 20%", "inset 0 1 0 0 #FFFFFF"]);
    expect(
      all(".effects .effect-line .swatch").map((swatch) => swatch.style.getPropertyValue("--swatch")),
    ).toEqual(["rgba(0, 0, 0, 0.2)", "rgb(255, 255, 255)"]);
  });

  it("writes lengths in rem and colors in the chosen format", () => {
    pinStyle("box-shadow: 0 16px 8px 0 rgba(0, 0, 0, 0.5)");
    ui('[data-option="unit"] [data-value="rem"]')!.click();
    ui('.color-format [data-value="rgb"]')!.click();
    expect(lines("Shadow")).toEqual(["0rem 1rem 0.5rem 0rem rgb(0 0 0 / 50%)"]);
  });

  it("lists text shadows under their own label, with no spread", () => {
    page(`<p class="card" style="margin: 0; text-shadow: 1px 2px 3px rgb(0, 0, 0)">Text</p>`);
    inspector().pin(getElement(".card"));
    expect(labels()).toEqual(["Text shadow"]);
    expect(lines("Text shadow")).toEqual(["1 2 3 #000000"]);
  });

  it("lists each filter function and backdrop filter function as name and argument", () => {
    pinStyle("filter: blur(4px) brightness(1.1); backdrop-filter: blur(8px)");
    expect(labels()).toEqual(["Filter", "Backdrop filter"]);
    expect(lines("Filter")).toEqual(["blur 4px", "brightness 1.1"]);
    expect(lines("Backdrop filter")).toEqual(["blur 8px"]);
  });

  it("draws a gradient, names its kind and angle, and lists its stops", () => {
    pinStyle("background-image: linear-gradient(135deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)");
    expect(labels()).toEqual(["Gradient"]);
    expect(texts(".effects .gradient-kind")).toEqual(["linear 135deg"]);
    expect(readings(all(".effects .effect-stop"))).toEqual(["#FF0000 0%", "#0000FF 100%"]);
    const strip = ui(".effects .gradient-strip")!;
    expect(getComputedStyle(strip).backgroundImage).toContain("linear-gradient(135deg");
  });

  it("lists two gradient layers and leaves an image layer to the Assets block", () => {
    pinStyle(
      `background-image: linear-gradient(red, blue), url('data:image/gif;base64,R0lGODlhAQABAAAAACw='), radial-gradient(circle, green, white)`,
    );
    expect(texts(".effects .gradient-kind")).toEqual(["linear 180deg", "radial circle"]);
  });

  it("has no Gradient group for an image alone", () => {
    pinStyle(`background-image: url('data:image/gif;base64,R0lGODlhAQABAAAAACw=')`);
    expect(blockTitles()).not.toContain("Effects");
  });

  it("copies one shadow on a click on its row, and the whole value on the label", async () => {
    pinStyle("box-shadow: 0 4px 12px 1px rgba(0, 0, 0, 0.2), inset 0 1px 0 #ffffff");
    group("Shadow").querySelectorAll<HTMLElement>(".effect-line")[1].click();
    await wait(20);
    expect(clipboard.text).toBe("inset 0px 1px 0px 0px rgb(255, 255, 255)");

    group("Shadow").querySelector<HTMLElement>(".effect-label")!.click();
    await wait(20);
    expect(clipboard.text).toBe(getComputedStyle(getElement(".card")).boxShadow);
  });

  it("copies one filter and one gradient", async () => {
    pinStyle("filter: blur(4px) brightness(1.1); background-image: linear-gradient(red, blue)");
    group("Filter").querySelectorAll<HTMLElement>(".effect-line")[1].click();
    await wait(20);
    expect(clipboard.text).toBe("brightness(1.1)");

    group("Gradient").querySelector<HTMLElement>(".effect-line")!.click();
    await wait(20);
    expect(clipboard.text).toBe("linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))");
  });

  it("edits the whole property as text on a double-click on the label", () => {
    pinStyle("box-shadow: 0 4px 12px red");
    const label = group("Shadow").querySelector<HTMLElement>(".effect-label")!;
    doubleClick(label);
    expect(label.isContentEditable).toBe(true);
    typeOver(label, "0 0 0 2px blue");
    expect(getComputedStyle(getElement(".card")).boxShadow).toBe("rgb(0, 0, 255) 0px 0px 0px 2px");
  });

  it("says when a shadow color or a gradient stop equals a token", () => {
    pinStyle(
      "box-shadow: 0 2px 4px rgb(47, 107, 255); background-image: linear-gradient(rgb(47, 107, 255), rgb(1, 2, 3))",
    );
    expect(readings(all(".effects .effect-token"))).toEqual([
      "matches token --brand",
      "matches token --brand",
    ]);
  });

  it("still takes part in a comparison", () => {
    page(`<div class="card" style="box-shadow: 0 2px 4px red; width: 20px; height: 20px"></div>
      <div class="other" style="width: 20px; height: 20px"></div>`);
    inspector().pin(getElement(".card"));
    ui('[data-action="compare"]')!.click();
    inspector().pin(getElement(".other"));
    expect(texts(".compare-row .label")).toContain("shadow");
  });

  it("fits a panel 320px wide with no sideways scroll", () => {
    pinStyle(
      "box-shadow: 0 16px 8px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgb(255, 255, 255); filter: drop-shadow(rgb(0, 0, 0) 0px 2px 4px); background-image: radial-gradient(circle at 50% 50%, rgb(255, 0, 0) 10% 30%, rgb(0, 0, 255))",
    );
    ui(".panel")!.style.width = "320px";
    ui('[data-option="unit"] [data-value="rem"]')!.click();
    const body = ui('.body[data-for="specs"]')!;
    expect(effects()).toBeDefined();
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  });
});
