/**
 * Helpers for the browser tests.
 *
 * Importing this file starts the inspector on the test page, as a script tag
 * would. Tests then build a small page with `page()`, drive the inspector
 * the way a user does (Alt, hover, click) and read its UI from its shadow
 * root with `ui()` and `all()`.
 */
import "../src/main";

const FIXTURE_ID = "fixture";

/** Replaces the test page's content with `html` and returns its container. */
export function page(html: string): HTMLElement {
  document.getElementById(FIXTURE_ID)?.remove();
  const fixture = document.createElement("div");
  fixture.id = FIXTURE_ID;
  fixture.innerHTML = html;
  document.body.appendChild(fixture);
  return fixture;
}

/** An element of the test page; throws when it is missing. */
export function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(`#${FIXTURE_ID} ${selector}`);
  if (!found) throw new Error(`No "${selector}" on the test page`);
  return found;
}

const root = (): ShadowRoot => document.querySelector("groma-inspector")!.shadowRoot!;

/** One node of the inspector's UI, or null. */
export const ui = <T extends HTMLElement = HTMLElement>(selector: string): T | null =>
  root().querySelector<T>(selector);

/** Every node of the inspector's UI that matches. */
export const all = <T extends HTMLElement = HTMLElement>(selector: string): T[] =>
  Array.from(root().querySelectorAll<T>(selector));

/** The text of every match, with whitespace collapsed. */
export const texts = (selector: string): string[] =>
  all(selector).map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim());

export const inspector = () => window.Groma!;

// ── what a user does ───────────────────────────────────────────

export const holdAlt = (): boolean =>
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
export const releaseAlt = (): boolean =>
  document.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt" }));
export const pressEscape = (): boolean =>
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

function mouse(target: Element, type: string): MouseEvent {
  const rect = target.getBoundingClientRect();
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  });
  target.dispatchEvent(event);
  return event;
}

export const hover = (target: Element): MouseEvent => mouse(target, "mousemove");

/** A full press: down, up, click. */
export function click(target: Element): void {
  mouse(target, "mousedown");
  mouse(target, "mouseup");
  mouse(target, "click");
}

export const rightClick = (target: Element): MouseEvent => mouse(target, "contextmenu");

/** Types `text` over an editable value and leaves the field, as Tab or a click elsewhere would. */
export function typeOver(field: HTMLElement, text: string): void {
  field.dispatchEvent(new FocusEvent("focus"));
  field.textContent = text;
  field.dispatchEvent(new FocusEvent("blur"));
}

export function pressKey(target: Element, key: string, modifiers: KeyboardEventInit = {}): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true, ...modifiers }),
  );
}

// ── waiting and cleaning up ────────────────────────────────────

/** Two animation frames: enough for the outline and the grid to be placed. */
export const frames = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** What the last click copied. */
export const clipboard = { text: "" };
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (text: string) => {
      clipboard.text = text;
    },
  },
});

/** Opens a panel tab. */
export const openTab = (tab: string): void => ui(`.tab[data-tab="${tab}"]`)!.click();

/** Leaves the inspector as a fresh page load would find it. Call it before each test. */
export function reset(): void {
  releaseAlt();
  pressEscape();
  ui(".rail")?.click();
  if (ui(".panel")) {
    ui('[data-option="unit"] [data-value="px"]')!.click();
    ui('[data-option="grid"] [data-value="0"]')!.click();
    openTab("specs");
    const push = ui('[data-action="push"]')!;
    if (push.getAttribute("aria-checked") === "false") push.click();
    ui(".close")!.click();
  }
  inspector().configure();
  localStorage.clear();
  clipboard.text = "";
}
