/**
 * Helpers for the browser tests.
 *
 * Importing this file starts the inspector on the test page, as a script tag
 * would. Tests then build a small page with `page()`, drive the inspector
 * the way a user does (Alt, hover, click) and read its UI from its shadow
 * root with `ui()` and `all()`.
 */
// oxlint-disable-next-line import/no-unassigned-import -- importing it starts the inspector, as a script tag would
import "../src/main";

const FIXTURE_ID = "fixture";

/**
 * The panel slides in and out. Tests read it the moment it opens or closes,
 * so the slide takes no time here; `slidePanel()` gives a test the real thing.
 */
const SLIDE = "--ins-dur-slide";
const host = (): HTMLElement => document.querySelector<HTMLElement>("groma-inspector")!;
host().style.setProperty(SLIDE, "0ms");
export function slidePanel(): void {
  host().style.removeProperty(SLIDE);
}

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
export function getElement<TElement extends HTMLElement = HTMLElement>(selector: string): TElement {
  const found = document.querySelector<TElement>(`#${FIXTURE_ID} ${selector}`);
  if (!found) throw new Error(`No "${selector}" on the test page`);
  return found;
}

const root = (): ShadowRoot => document.querySelector("groma-inspector")!.shadowRoot!;

/** One node of the inspector's UI, or null. */
// oxlint-disable-next-line unicorn/no-null -- querySelector answers null, and the suites assert absence with toBeNull
export const ui = <TElement extends HTMLElement = HTMLElement>(selector: string): TElement | null =>
  root().querySelector<TElement>(selector);

/** Every node of the inspector's UI that matches. */
export const all = <TElement extends HTMLElement = HTMLElement>(selector: string): TElement[] =>
  Array.from(root().querySelectorAll<TElement>(selector));

/** The text of every match, with whitespace collapsed. */
export const texts = (selector: string): string[] =>
  all(selector).map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim());

export const inspector = () => window.Groma!;

// ── what a user does ───────────────────────────────────────────

export const holdAlt = (): boolean => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
export const releaseAlt = (): boolean => document.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt" }));
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

/** Two full presses, then the double-click the browser sends after them. */
export function doubleClick(target: Element): void {
  click(target);
  click(target);
  mouse(target, "dblclick");
}

export const rightClick = (target: Element): MouseEvent => mouse(target, "contextmenu");

/** Types `text` over an editable value and leaves the field, as Tab or a click elsewhere would. */
export function typeOver(field: HTMLElement, text: string): void {
  field.dispatchEvent(new FocusEvent("focus"));
  field.textContent = text;
  field.dispatchEvent(new FocusEvent("blur"));
}

function dispatchKey(target: Element, keyboard: KeyboardEventInit): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, composed: true, ...keyboard }),
  );
}

export const pressKey = (target: Element, key: string): void => dispatchKey(target, { key });

/** A key with modifiers held, or a physical key (`code`). */
export const pressShortcut = (target: Element, keyboard: KeyboardEventInit): void =>
  dispatchKey(target, keyboard);

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

/** The history of edits lives in memory, and so does an edit the browser refused to store: undo them all, as a reload would forget them. */
function undoAllEdits(): void {
  const undo = ui<HTMLButtonElement>('[data-action="undo"]')!;
  while (!undo.disabled) undo.click();
}

/** Puts the panel's settings back to what a fresh page load shows, and closes it. */
function restorePanel(): void {
  undoAllEdits();
  ui('[data-option="unit"] [data-value="px"]')!.click();
  ui('[data-option="grid"] [data-value="0"]')!.click();
  // The switch is in the Colors block, which is there only while a color is.
  ui('.color-format [data-value="hex"]')?.click();
  openTab("specs");
  const push = ui('[data-action="push"]')!;
  if (push.getAttribute("aria-checked") === "false") push.click();
  ui(".close")!.click();
}

/** Leaves the inspector as a fresh page load would find it. Call it before each test. */
export function reset(): void {
  host().style.setProperty(SLIDE, "0ms");
  ui('.canvas-bar [data-action="exit"]')?.click();
  releaseAlt();
  document.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
  // Twice: the first Escape only ends an edit of text on the page, if one is open.
  pressEscape();
  pressEscape();
  ui(".rail")?.click();
  if (ui(".panel")) restorePanel();
  inspector().configure();
  localStorage.clear();
  clipboard.text = "";
}
