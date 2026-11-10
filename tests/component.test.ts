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

describe("component on a React page", () => {
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

  it("shows no component block when the page says nothing about components", () => {
    page(`<div class="plain">Plain</div>`);
    inspector().pin(el(".plain"));
    expect(ui(".component")).toBeNull();
  });
});

describe("component declared in the markup", () => {
  beforeEach(() => {
    page(`
      <div class="card" data-component="Card" data-source="ui/Card.tsx" data-props='{"tone":"dark","elevated":true,"onClose":{}}'>
        <span class="label">Label</span>
      </div>
      <div class="broken" data-component="Broken" data-props="not json">x</div>
    `);
  });

  it("reads the name, the props and the source from data attributes", () => {
    inspector().pin(el(".card"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code")).toEqual(['<Card tone="dark" elevated>']);
    expect(texts(".source .path")).toEqual(["ui/Card.tsx"]);
    expect(texts(".title")).toEqual(["Card"]);
  });

  it("knows an element inside a declared component", () => {
    inspector().pin(el(".label"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    ui(".select-row .ghost-button")!.click();
    expect(inspector().pinnedElement()).toBe(el(".card"));
  });

  it("ignores props that are not valid JSON", () => {
    inspector().pin(el(".broken"));
    expect(texts(".code")).toEqual(["<Broken>"]);
  });
});

describe("custom element", () => {
  beforeEach(() => {
    page(`
      <my-card tone="dark" open class="shell" style="display: block">
        <span class="label">Label</span>
      </my-card>
      <app-shell><div><div><div><div><div><div><p class="deep">Deep</p></div></div></div></div></div></div></app-shell>
    `);
  });

  it("is a component: the tag is the name and the attributes are the props", () => {
    inspector().pin(el("my-card"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code")).toEqual(['<my-card tone="dark" open>']);
  });

  it("contains the elements in it", () => {
    inspector().pin(el(".label"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    expect(texts(".code")).toEqual(['<my-card tone="dark" open>']);
  });

  it("is not reported for an element far below an app shell", () => {
    inspector().pin(el(".deep"));
    expect(ui(".component")).toBeNull();
  });
});

describe("when several sources name a component", () => {
  it("prefers what the page declares", () => {
    page(`<my-card data-component="Card"><span class="label">Label</span></my-card>`);
    inspector().pin(el("my-card"));
    expect(texts(".code")).toEqual(["<Card>"]);
  });
});
