import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clipboard, el, frames, inspector, page, reset, texts, ui, wait } from "./helpers";

/** What React leaves on a DOM node: enough of a fiber for the inspector to read. */
interface FakeFiber {
  type: unknown;
  return: FakeFiber | null;
  child: FakeFiber | null;
  stateNode: unknown;
  memoizedProps: Record<string, unknown>;
}

function Button() {}

beforeAll(() => {
  // A Claude Design export lists its design-system components in a bundle header.
  (window as unknown as Record<string, unknown>).Acme = { Button };
  const bundle = document.createElement("script");
  bundle.type = "text/plain";
  bundle.dataset.src = "ds/acme/bundle.js";
  bundle.textContent =
    '/* @ds-bundle: {"namespace":"Acme","components":[{"name":"Button","sourcePath":"components/actions/Button/Button.jsx"}]} */';
  document.head.appendChild(bundle);
});

beforeEach(() => {
  reset();
  page(`<button class="root" style="padding: 8px 16px"><span class="inner">Save</span></button>`);

  // <Button variant="contained" size="small" disabled onClick={…}> rendering button > span
  const component: FakeFiber = {
    type: Button,
    return: null,
    child: null,
    stateNode: null,
    memoizedProps: { variant: "contained", size: "small", disabled: true, tabIndex: 3, onClick() {}, children: "Save" },
  };
  const root: FakeFiber = { type: "button", return: component, child: null, stateNode: el(".root"), memoizedProps: {} };
  const inner: FakeFiber = { type: "span", return: root, child: null, stateNode: el(".inner"), memoizedProps: {} };
  component.child = root;
  root.child = inner;
  Object.assign(el(".root"), { __reactFiber$test: root });
  Object.assign(el(".inner"), { __reactFiber$test: inner });
});

describe("component", () => {
  it("names the component, shows its props as JSX and where its source is", () => {
    inspector().pin(el(".root"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code")).toEqual(['<Button variant="contained" size="small" disabled tabIndex={3}>']);
    expect(texts(".source .path")).toEqual(["components/actions/Button/Button.jsx"]);
  });

  it("uses the component's name for the element everywhere", async () => {
    inspector().pin(el(".root"));
    await frames();
    expect(texts(".title")).toEqual(["Button"]);
    expect(texts(".crumb.is-current")).toEqual(["Button"]);
    expect(texts(".pin-tag b")).toEqual(["Button"]);
  });

  it("copies the JSX when the code box is clicked", async () => {
    inspector().pin(el(".root"));
    ui(".code")!.click();
    await wait(20);
    expect(clipboard.text).toBe('<Button variant="contained" size="small" disabled tabIndex={3}>');
    expect(ui(".code")!.classList.contains("is-copied")).toBe(true);
  });

  it("says when the element only sits inside a component, and can select it", () => {
    inspector().pin(el(".inner"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    expect(ui(".code")!.classList.contains("is-inside")).toBe(true);
    // The element keeps its own name; it is not the component.
    expect(texts(".title")).toEqual(["inner"]);

    ui(".select-row .ghost-button")!.click();
    expect(inspector().pinnedElement()).toBe(el(".root"));
  });

  it("shows no component block on a page without React", () => {
    page(`<div class="plain">Plain</div>`);
    inspector().pin(el(".plain"));
    expect(ui(".component")).toBeNull();
  });
});
