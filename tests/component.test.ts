import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { all, clipboard, getElement, frames, inspector, page, reset, texts, ui, wait } from "./helpers";

/** The props listed in the component block, as { name: "value" }. */
function props(): Record<string, string> {
  const cells = all(".props > *").map((cell) => cell.textContent ?? "");
  const entries: [string, string][] = [];
  for (let index = 0; index < cells.length; index += 2) entries.push([cells[index], cells[index + 1]]);
  return Object.fromEntries(entries);
}

/** What React leaves on a DOM node: enough of a fiber for the inspector to read. */
// React leaves null where there is no parent, child or node; the reader has to cope with that.
type FakeFiber = {
  type: unknown;
  // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
  return: FakeFiber | null;
  // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
  child: FakeFiber | null;
  stateNode: unknown;
  memoizedProps: Record<string, unknown>;
};

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
    // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
    return: null,
    // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
    child: null,
    // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
    stateNode: null,
    memoizedProps: {
      variant: "contained",
      size: "small",
      disabled: true,
      tabIndex: 3,
      onClick() {},
      children: "Save",
    },
  };
  const root: FakeFiber = {
    type: "button",
    return: component,
    // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
    child: null,
    stateNode: getElement(".root"),
    memoizedProps: {},
  };
  const inner: FakeFiber = {
    type: "span",
    return: root,
    // oxlint-disable-next-line unicorn/no-null -- what React leaves on a fiber
    child: null,
    stateNode: getElement(".inner"),
    memoizedProps: {},
  };
  component.child = root;
  root.child = inner;
  Object.assign(getElement(".root"), { __reactFiber$test: root });
  Object.assign(getElement(".inner"), { __reactFiber$test: inner });
});

describe("component on a React page", () => {
  it("names the component, lists the props the design passes and where its source is", () => {
    inspector().pin(getElement(".root"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code .name")).toEqual(["Button"]);
    expect(props()).toEqual({ variant: "contained", size: "small", disabled: "true", tabIndex: "3" });
    expect(texts(".source .path")).toEqual(["components/actions/Button/Button.jsx"]);
  });

  it("does not suggest code: no JSX anywhere in the block", () => {
    inspector().pin(getElement(".root"));
    expect(ui(".component")!.textContent).not.toMatch(/[<>{}]/);
  });

  it("uses the component's name for the element everywhere", async () => {
    inspector().pin(getElement(".root"));
    await frames();
    expect(texts(".title")).toEqual(["Button"]);
    expect(texts(".crumb.is-current")).toEqual(["Button"]);
    expect(texts(".pin-tag b")).toEqual(["Button"]);
  });

  it("copies the name, or one prop value, on click", async () => {
    inspector().pin(getElement(".root"));
    ui(".code")!.click();
    await wait(20);
    expect(clipboard.text).toBe("Button");
    expect(ui(".code")!.classList.contains("is-copied")).toBe(true);

    ui(".props .value")!.click();
    await wait(20);
    expect(clipboard.text).toBe("contained");
  });

  it("says when the element only sits inside a component, and can select it", () => {
    inspector().pin(getElement(".inner"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    expect(ui(".code")!.classList.contains("is-inside")).toBe(true);
    // The element keeps its own name; it is not the component.
    expect(texts(".title")).toEqual(["inner"]);

    ui(".select-row .ghost-button")!.click();
    expect(inspector().pinnedElement()).toBe(getElement(".root"));
  });

  it("shows no component block when the page says nothing about components", () => {
    page(`<div class="plain">Plain</div>`);
    inspector().pin(getElement(".plain"));
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
    inspector().pin(getElement(".card"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code .name")).toEqual(["Card"]);
    expect(props()).toEqual({ tone: "dark", elevated: "true" });
    expect(texts(".source .path")).toEqual(["ui/Card.tsx"]);
    expect(texts(".title")).toEqual(["Card"]);
  });

  it("knows an element inside a declared component", () => {
    inspector().pin(getElement(".label"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    ui(".select-row .ghost-button")!.click();
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("ignores props that are not valid JSON", () => {
    inspector().pin(getElement(".broken"));
    expect(texts(".code .name")).toEqual(["Broken"]);
    expect(ui(".props")).toBeNull();
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
    inspector().pin(getElement("my-card"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code .name")).toEqual(["my-card"]);
    expect(props()).toEqual({ tone: "dark", open: "true" });
  });

  it("contains the elements in it", () => {
    inspector().pin(getElement(".label"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    expect(texts(".code .name")).toEqual(["my-card"]);
  });

  it("is not reported for an element far below an app shell", () => {
    inspector().pin(getElement(".deep"));
    expect(ui(".component")).toBeNull();
  });
});

describe("when several sources name a component", () => {
  it("prefers what the page declares", () => {
    page(`<my-card data-component="Card"><span class="label">Label</span></my-card>`);
    inspector().pin(getElement("my-card"));
    expect(texts(".code .name")).toEqual(["Card"]);
  });
});

/** The unofficial properties the frameworks leave on elements; no framework is installed, so the tests set them. */
const leave = (element: Element, marks: Record<string, unknown>): void => void Object.assign(element, marks);

describe("component on a Vue 3 page", () => {
  beforeEach(() => {
    page(`<section class="card"><span class="label">Label</span></section>`);
    const card = getElement(".card");
    // <PriceCard tone="dark" :count="3"> rendering section > span, inside <App>
    const app = { type: { __name: "App" }, props: {}, parent: undefined, vnode: { el: document.body } };
    const instance = {
      type: { __name: "PriceCard", __file: "src/components/PriceCard.vue" },
      props: { tone: "dark", count: 3, onPick() {} },
      parent: app,
      vnode: { el: card },
    };
    leave(card, { __vueParentComponent: instance });
    leave(getElement(".label"), { __vueParentComponent: instance });
  });

  it("names the component, its props and its file", () => {
    inspector().pin(getElement(".card"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code .name")).toEqual(["PriceCard"]);
    expect(props()).toEqual({ tone: "dark", count: "3" });
    expect(texts(".source .path")).toEqual(["src/components/PriceCard.vue"]);
  });

  it("says an element renders inside the component, and finds the root", () => {
    inspector().pin(getElement(".label"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    ui(".select-row .ghost-button")!.click();
    expect(inspector().pinnedElement()).toBe(getElement(".card"));
  });

  it("falls back to the file's name, then to the parent component", () => {
    const label = getElement(".label");
    const parent = { type: { name: "Outer" }, props: {}, vnode: { el: document.body } };
    leave(label, { __vueParentComponent: { type: {}, props: {}, parent } });
    inspector().pin(label);
    expect(texts(".code .name")).toEqual(["Outer"]);

    leave(label, { __vueParentComponent: { type: { __file: "a/b/Menu.vue" }, props: {} } });
    inspector().pin(label);
    expect(texts(".code .name")).toEqual(["Menu"]);
  });
});

describe("component on a Vue 2 page", () => {
  beforeEach(() => {
    page(`<div class="card"><span class="label">Label</span></div>`);
    leave(getElement(".card"), {
      __vue__: { $options: { name: "OldCard", __file: "src/OldCard.vue" }, $props: { tone: "dark" } },
    });
  });

  it("reads the instance on the root element, and finds it from inside", () => {
    inspector().pin(getElement(".card"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code .name")).toEqual(["OldCard"]);
    expect(props()).toEqual({ tone: "dark" });

    inspector().pin(getElement(".label"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
  });
});

describe("component on a Svelte development page", () => {
  it("names the component after the file the element was written in", () => {
    page(`<p class="text">Text</p>`);
    leave(getElement(".text"), { __svelte_meta: { loc: { file: "src/lib/Hero.svelte", line: 12 } } });
    inspector().pin(getElement(".text"));
    expect(texts(".code .name")).toEqual(["Hero"]);
    expect(texts(".source .path")).toEqual(["src/lib/Hero.svelte"]);
    expect(ui(".props")).toBeNull();
  });
});

describe("the framework readers on garbage", () => {
  const garbage: Record<string, unknown>[] = [
    { __vueParentComponent: 42 },
    { __vueParentComponent: { type: { name: 7, __name: {} }, props: "x", parent: "y" } },
    { __vue__: "text" },
    // oxlint-disable-next-line unicorn/no-null -- what a page may leave there
    { __vue__: { $options: null } },
    // oxlint-disable-next-line unicorn/no-null -- what a page may leave there
    { __svelte_meta: null },
    { __svelte_meta: { loc: { file: 3 } } },
    { __svelte_meta: { loc: { file: "" } } },
  ];

  it.each(garbage)("shows no component and does not break the panel (%j)", (marks) => {
    page(`<p class="text">Text</p>`);
    leave(getElement(".text"), marks);
    expect(() => inspector().pin(getElement(".text"))).not.toThrow();
    expect(ui(".component")).toBeNull();
  });

  it("copes with a property that throws when read", () => {
    page(`<p class="text">Text</p>`);
    for (const name of ["__vueParentComponent", "__vue__", "__svelte_meta"]) {
      Object.defineProperty(getElement(".text"), name, {
        get() {
          throw new Error("hostile");
        },
      });
    }
    expect(() => inspector().pin(getElement(".text"))).not.toThrow();
    expect(ui(".component")).toBeNull();
  });
});

const boom = (): never => {
  throw new Error("hostile");
};

describe("component on an Angular development page", () => {
  type Ng = Record<string, unknown>;
  const setNg = (ng: Ng | undefined): void => void Object.assign(window, { ng });

  let picked = false;

  class UserCardComponent {
    name = "Ada";
    size = Object.assign(() => 3, { [Symbol("SIGNAL")]: {} });
    pick = (): void => void (picked = true);
    internal = "hidden";
  }
  class _ShellComponent {
    tag = "shell";
  }

  beforeEach(() => {
    page(`<app-user-card class="host"><p class="inside">Hi</p></app-user-card>`);
  });

  afterEach(() => setNg(undefined));

  const card = new UserCardComponent();
  const fakeNg = (extra: Ng = {}): Ng => ({
    getComponent: (element: Element) => (element.classList.contains("host") ? card : undefined),
    getOwningComponent: () => card,
    getDirectiveMetadata: () => ({ inputs: { name: "name", size: ["size", "x"], pick: "pick" } }),
    ...extra,
  });

  it("reports the component an element hosts, with its inputs, signals called", () => {
    setNg(fakeNg());
    inspector().pin(getElement(".host"));
    expect(texts(".component h3")).toEqual(["Component"]);
    expect(texts(".code .name")).toEqual(["UserCardComponent"]);
    expect(props()).toEqual({ name: "Ada", size: "3" });
    expect(ui(".source")).toBeNull();
  });

  it("never calls an input that is a plain function: that is the page's code", () => {
    setNg(fakeNg());
    inspector().pin(getElement(".host"));
    expect(picked).toBe(false);
  });

  it("reports the owning component for an element in its template", () => {
    setNg(fakeNg());
    inspector().pin(getElement(".inside"));
    expect(texts(".component h3")).toEqual(["Inside component"]);
    expect(texts(".code .name")).toEqual(["UserCardComponent"]);
  });

  it("drops the underscore newer compilers add, and shows no props without metadata", () => {
    setNg({ getComponent: () => new _ShellComponent(), getOwningComponent: () => undefined });
    inspector().pin(getElement(".host"));
    expect(texts(".code .name")).toEqual(["ShellComponent"]);
    expect(ui(".props")).toBeNull();
  });

  it("leaves a real custom element alone when the page has no ng", () => {
    inspector().pin(getElement(".host"));
    expect(texts(".code .name")).toEqual(["app-user-card"]);
  });

  it("falls back to the custom element when ng throws", () => {
    setNg({ getComponent: boom, getOwningComponent: boom });
    expect(() => inspector().pin(getElement(".host"))).not.toThrow();
    expect(texts(".code .name")).toEqual(["app-user-card"]);
  });

  it("skips an input that throws and ignores a broken ng", () => {
    const hostile = {
      get name(): string {
        throw new Error("no");
      },
      // A signal, as the framework marks one.
      size: Object.assign(() => 1, { [Symbol("SIGNAL")]: {} }),
    };
    setNg(fakeNg({ getComponent: () => hostile }));
    inspector().pin(getElement(".host"));
    expect(props()).toEqual({ size: "1" });

    setNg({ getComponent: 5, getOwningComponent: "x", getDirectiveMetadata: 7 });
    expect(() => inspector().pin(getElement(".host"))).not.toThrow();
    expect(texts(".code .name")).toEqual(["app-user-card"]);
  });
});
