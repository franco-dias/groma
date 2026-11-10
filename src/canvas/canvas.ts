/**
 * Canvas mode: the page in a frame on a canvas, like an artboard in a design
 * tool. The user drags the frame's edges to try any width and height, zooms
 * with the toolbar or Ctrl/⌘ + wheel, and moves around by dragging the canvas
 * or scrolling. Over the page, where a plain drag belongs to the page, Space +
 * drag and a middle-button drag move the canvas instead. Inspecting works in
 * the frame as it does on the page.
 *
 * The frame loads this page's own address again, so the page runs a second
 * time inside it; the first copy stays underneath, untouched and hidden. The
 * switch is in the panel's » menu and is remembered, with the frame's size.
 *
 * The browser does not let the inspector read a frame that loads a file opened
 * from disk, or a page whose server forbids framing. The frame is then filled
 * with a copy of the page as it is now, which the browser does allow. The
 * page's scripts run again on that copy; for a file from disk, "Use the file…"
 * loads the original HTML instead when the copy looks wrong.
 */
import { h, placeOver } from "../dom";
import { replayOverrides } from "../edits/overrides";
import { getSelector } from "../edits/selector";
import { readStore, writeStore } from "../edits/storage";
import { frameLoaded, onPage, onPageWindow, pageViewChanged, setFrame, toWindowPoint } from "../page";
import { HOST_TAG, mount, whenBodyExists } from "../root";
import { pin, pinnedElement, rerender, unpin } from "../selection";
import template from "./canvas.html?raw";
import { clampSize, fitView, type Size, type View, zoomAt } from "./view";

const STORE_KEY = "__groma_canvas";
const DEFAULT_SIZE: Size = { width: 1280, height: 800 };
/** One press of a zoom button. */
const ZOOM_STEP = 1.25;
/** How fast Ctrl/⌘ + wheel zooms. */
const WHEEL_ZOOM = 0.01;

interface Saved {
  on: boolean;
  width: number;
  height: number;
}

interface Canvas {
  el: HTMLElement;
  frame: HTMLIFrameElement;
  /** The address the frame showed first; a different one later means the user followed a link. */
  firstAddress: string;
  /** What the frame was given: the page's address, a copy of the open page, or a file the user chose. */
  filledFrom: "address" | "copy" | "file";
  /** The open page as HTML, for when its address cannot be used. */
  copy(): string;
  /** Stops watching the canvas's own size. */
  stopWatching(): void;
}

let canvas: Canvas | null = null;
let size: Size = DEFAULT_SIZE;
let view: View = { x: 0, y: 0, zoom: 1 };
/** True until the user moves or zooms: a fitted frame stays fitted when the canvas changes size. */
let fitted = true;

export const isCanvasOn = (): boolean => canvas !== null;

function save(): void {
  writeStore(STORE_KEY, { on: isCanvasOn(), ...size } satisfies Saved);
}

/** After the frame got a new size: the page laid itself out again, so the panel is out of date. */
function sizeChanged(): void {
  save();
  rerender();
}

function savedSize(): Size {
  const { width, height } = readStore<Saved>(STORE_KEY);
  return width && height ? clampSize({ width, height }) : DEFAULT_SIZE;
}

const part = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  canvas!.el.querySelector<T>(selector)!;

// ── drawing ────────────────────────────────────────────────────

/** Puts the frame, its handles and the labels where `size` and `view` say. */
function draw(): void {
  if (!canvas) return;
  const { zoom } = view;
  part(".canvas-stage").style.transform = `translate(${view.x}px, ${view.y}px) scale(${zoom})`;
  const box = part(".canvas-frame");
  box.style.width = `${size.width}px`;
  box.style.height = `${size.height}px`;
  placeOver(part(".canvas-chrome"), {
    left: view.x,
    top: view.y,
    width: size.width * zoom,
    height: size.height * zoom,
  });
  part(".canvas-size").textContent = `${size.width} × ${size.height}`;
  part(".canvas-zoom").textContent = `${Math.round(zoom * 100)}%`;
  pageViewChanged();
}

function fit(): void {
  if (!canvas) return;
  view = fitView(size, { width: canvas.el.clientWidth, height: canvas.el.clientHeight });
  fitted = true;
  draw();
}

/** A view the user chose: it is kept when the canvas changes size. */
function show(next: View): void {
  view = next;
  fitted = false;
  draw();
}

/** Zooms by `factor` around a point of the canvas; the middle when none is given. */
function zoomBy(factor: number, x = canvas!.el.clientWidth / 2, y = canvas!.el.clientHeight / 2): void {
  show(zoomAt(view, view.zoom * factor, x, y));
}

// ── what the user does ─────────────────────────────────────────

/** Where a pointer event is in this window, also when it comes from the frame. */
const windowPoint = (e: PointerEvent): { x: number; y: number } =>
  toWindowPoint(e.clientX, e.clientY, (e.target as Node).ownerDocument);

/**
 * Follows the pointer from a press until it is released. The pointer is
 * captured by what was pressed, so the drag goes on wherever it passes: over
 * the frame for a press on the canvas, out of the frame for a press inside it.
 */
function drag(down: PointerEvent, onMove: (dx: number, dy: number) => void, onEnd: () => void): void {
  const target = down.target as Element;
  // The shadow root for the canvas's own parts, the frame's document for the page's.
  const root = target.getRootNode() as Document | ShadowRoot;
  const start = windowPoint(down);
  down.preventDefault();
  try {
    target.setPointerCapture(down.pointerId);
  } catch {
    // No such pointer (a synthetic event): the events still reach the target.
  }
  const move = (e: Event) => {
    const { x, y } = windowPoint(e as PointerEvent);
    onMove(x - start.x, y - start.y);
  };
  const stop = () => {
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerup", stop);
    root.removeEventListener("pointercancel", stop);
    onEnd();
  };
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerup", stop);
  root.addEventListener("pointercancel", stop);
}

/** Moves the frame with the pointer, from a press until its release. */
function pan(down: PointerEvent): void {
  const start = view;
  if (spaceHold) spaceHold.dragged = true;
  drag(
    down,
    (dx, dy) => show({ ...start, x: start.x + dx, y: start.y + dy }),
    () => {},
  );
}

// ── Space + drag ───────────────────────────────────────────────

const MIDDLE_BUTTON = 1;
/** Inputs that take no text: Space presses them instead of typing in them. */
const NOT_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);
/** Controls that Space presses when they have the focus. */
const PRESSED_BY_SPACE = new Set(["button", "summary", "input", "select"]);

/** A hold of the Space key: the control that had the focus, and whether a drag used the hold. */
let spaceHold: { control: HTMLElement | null; dragged: boolean } | null = null;

/** True where Space types a character: there it is never taken. */
function typesText(target: HTMLElement | null): boolean {
  if (!target) return false;
  if (target.isContentEditable || target.localName === "textarea") return true;
  return target.localName === "input" && !NOT_TEXT_INPUTS.has((target as HTMLInputElement).type);
}

/** Does what Space would have done to a focused control. */
function press(control: HTMLElement): void {
  if (control.localName !== "select") {
    control.click();
    return;
  }
  try {
    (control as HTMLSelectElement).showPicker();
  } catch {
    // An older browser, or one that wants a real key press: the list stays closed.
  }
}

function releaseSpace(): void {
  spaceHold = null;
  canvas?.el.classList.remove("is-panning");
}

/**
 * While Space is held, the frame lets the pointer through to the canvas, so a
 * drag that starts over the page moves the canvas.
 *
 * Space is taken whatever has the focus, except where it types. A focused
 * button or checkbox would otherwise swallow it, and one is focused after
 * every click on it. Space released with no drag is passed on: the focused
 * control is pressed, as the key alone would have done.
 */
function watchSpace(): void {
  // Capture: the inspector's panel keeps its own key events from the page.
  onPage(
    "keydown",
    (e) => {
      // The real target: an event from the inspector's own UI arrives with its host as the target.
      const target = e.composedPath()[0] as HTMLElement | null;
      if (!canvas || e.code !== "Space" || typesText(target)) return;
      // Space would scroll the page, or press the focused control.
      e.preventDefault();
      if (spaceHold) return;
      spaceHold = { control: PRESSED_BY_SPACE.has(target?.localName ?? "") ? target : null, dragged: false };
      canvas.el.classList.add("is-panning");
    },
    true,
  );
  onPage(
    "keyup",
    (e) => {
      if (e.code !== "Space" || !spaceHold) return;
      // A browser presses a focused control when the key comes up.
      e.preventDefault();
      const { control, dragged } = spaceHold;
      releaseSpace();
      if (control && !dragged) press(control);
    },
    true,
  );
  // The keyup never arrives when the window loses focus first.
  onPageWindow("blur", releaseSpace);
}

function resizeByDragging(handle: HTMLElement): void {
  const axes = handle.dataset.resize ?? "";
  handle.addEventListener("pointerdown", (down) => {
    const start = size;
    drag(
      down,
      (dx, dy) => {
        // The handle moves in screen pixels; the frame is sized in its own.
        size = clampSize({
          width: start.width + (axes.includes("x") ? dx / view.zoom : 0),
          height: start.height + (axes.includes("y") ? dy / view.zoom : 0),
        });
        fitted = false;
        draw();
      },
      sizeChanged,
    );
  });
}

function onWheel(e: WheelEvent, x: number, y: number): void {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomBy(Math.exp(-e.deltaY * WHEEL_ZOOM), x, y);
  else show({ ...view, x: view.x - e.deltaX, y: view.y - e.deltaY });
}

function onButton(button: HTMLElement): void {
  const [width, height] = (button.dataset.size ?? "").split("x").map(Number);
  if (width && height) {
    size = clampSize({ width, height });
    fit();
    sizeChanged();
    return;
  }
  const action = button.dataset.action;
  if (action === "zoom-in") zoomBy(ZOOM_STEP);
  if (action === "zoom-out") zoomBy(1 / ZOOM_STEP);
  if (action === "zoom-reset") zoomBy(1 / view.zoom);
  if (action === "fit") fit();
  if (action === "exit") setCanvas(false);
  if (action === "choose-file") part<HTMLInputElement>('input[type="file"]').click();
}

function wireControls(el: HTMLElement): void {
  el.querySelectorAll<HTMLElement>("[data-resize]").forEach(resizeByDragging);
  el.addEventListener("click", (e) => {
    const button = (e.target as Element).closest<HTMLElement>("[data-size], [data-action]");
    if (button) onButton(button);
  });
  // Over the canvas the wheel moves the frame; over the page it scrolls the page.
  el.addEventListener("wheel", (e) => onWheel(e, e.clientX, e.clientY), { passive: false });
  // A drag moves the frame when it starts on the canvas itself, with Space
  // held, or with the middle button. The toolbar and the handles keep theirs.
  el.addEventListener("pointerdown", (down) => {
    const onControl = (down.target as Element).closest(".canvas-bar, .canvas-handle, .canvas-blocked");
    const moves = down.target === el || el.classList.contains("is-panning") || down.button === MIDDLE_BUTTON;
    if (moves && !onControl) pan(down);
  });
  // "Use the file…": the original HTML of a page opened from disk.
  const picker = el.querySelector<HTMLInputElement>('input[type="file"]')!;
  picker.addEventListener("change", async () => {
    const html = await picker.files?.[0]?.text();
    picker.value = "";
    if (html) fill("file", html);
  });
  // A click on the toolbar must not take the focus: Space would press the button again.
  el.querySelector(".canvas-bar")!.addEventListener("mousedown", (e) => e.preventDefault());
}

// ── the frame ──────────────────────────────────────────────────

function pinBySelector(page: Document, selector: string | null): void {
  if (!selector) return;
  try {
    const el = page.querySelector(selector);
    if (el) pin(el);
  } catch {
    // Not a selector this document accepts.
  }
}

/** True for a page opened from disk: the browser never lets us read a frame that loads its address. */
const isFromDisk = (): boolean => location.protocol === "file:";

/**
 * The page as it is now, as HTML, without the inspector. Its scripts run
 * again when a frame is filled with it.
 *
 * shortcut: edits already replayed on the page are part of the copy, so in the
 * frame "reset" puts back the edited value, not the page's own; upgrade by
 * undoing saved edits in the clone if someone edits and then opens a copy.
 */
export function pageCopy(page: Document): string {
  const root = page.documentElement.cloneNode(true) as HTMLElement;
  root.querySelectorAll(HOST_TAG).forEach((host) => host.remove());
  const doctype = page.doctype ? `<!doctype ${page.doctype.name}>` : "";
  return doctype + root.outerHTML;
}

/** Fills the frame with HTML instead of an address. The browser lets us read such a frame. */
function fill(from: "copy" | "file", html: string): void {
  if (!canvas) return;
  canvas.filledFrom = from;
  canvas.firstAddress = "";
  canvas.frame.removeAttribute("src");
  canvas.frame.srcdoc = html;
}

/** The frame's address, or "" when the browser does not let us read it. */
function frameAddress(frame: HTMLIFrameElement): string {
  try {
    return frame.contentWindow?.location.href ?? "";
  } catch {
    return "";
  }
}

/**
 * Runs each time the frame has loaded a page: the first time, and again when
 * the user follows a link inside it. `repin` is the element to pin again on
 * the first load, as a selector.
 */
function onFrameLoad(repin: string | null): void {
  if (!canvas) return;
  const { frame } = canvas;
  const address = frameAddress(frame);
  // The empty document a frame starts with: the page is still to come.
  if (address === "about:blank") return;
  const readable = frameLoaded();
  // The page's own address was refused: show a copy of the page instead.
  if (!readable && !canvas.firstAddress && canvas.filledFrom === "address") {
    fill("copy", canvas.copy());
    return;
  }
  part(".canvas-blocked").hidden = readable;
  // An element pinned before this load belongs to a page that is gone.
  if (pinnedElement()) unpin();
  if (!readable) return;

  const page = frame.contentDocument!;
  // Ctrl/⌘ + wheel zooms the canvas, not the browser, also over the page.
  page.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const { x, y } = toWindowPoint(e.clientX, e.clientY, page);
      onWheel(e, x, y);
    },
    { passive: false, capture: true },
  );
  // A middle-button drag over the page moves the canvas.
  page.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button === MIDDLE_BUTTON) pan(e);
    },
    true,
  );
  // ...and must not start the browser's own middle-button scrolling.
  page.addEventListener(
    "mousedown",
    (e) => {
      if (e.button === MIDDLE_BUTTON) e.preventDefault();
    },
    true,
  );
  replayOverrides();
  if (!canvas.firstAddress) {
    canvas.firstAddress = address;
    pinBySelector(page, repin);
  }
}

function open(source: string, repin: string | null, copy: () => string): void {
  const el = mount(h("div", "canvas"));
  el.innerHTML = template;
  const frame = el.querySelector("iframe")!;
  const watcher = new ResizeObserver(() => {
    // The panel opened or closed, or the window changed size.
    if (fitted) fit();
  });
  canvas = { el, frame, firstAddress: "", filledFrom: "address", copy, stopWatching: () => watcher.disconnect() };
  size = savedSize();
  setFrame(frame);
  wireControls(el);
  frame.addEventListener("load", () => onFrameLoad(repin));
  part('[data-action="choose-file"]').hidden = !isFromDisk();
  // After `setFrame`: by now the panel has taken its push off the page.
  if (isFromDisk()) fill("copy", copy());
  else frame.src = source;
  fit();
  watcher.observe(el);
}

function close(repin: string | null): void {
  if (!canvas) return;
  const { el, frame, firstAddress } = canvas;
  const address = frameAddress(frame);
  canvas.stopWatching();
  el.remove();
  canvas = null;
  setFrame(null);
  save();
  // The user followed a link in the frame: the page underneath is the old one.
  if (address && firstAddress && address !== firstAddress) {
    location.assign(address);
    return;
  }
  // shortcut: an edit reset on the canvas stays on the page underneath until a
  // reload; upgrade by undoing saved edits here when that confuses someone.
  replayOverrides();
  pinBySelector(document, repin);
}

/**
 * Turns canvas mode on or off. The pinned element stays pinned across the
 * switch when the other copy of the page has it too. `source` is the address
 * the frame shows, this page's own, and `copy` gives the page as HTML for
 * when the browser refuses that address.
 */
export function setCanvas(
  on: boolean,
  source = location.href,
  copy: () => string = () => pageCopy(document),
): void {
  if (on === isCanvasOn()) return;
  const pinned = pinnedElement();
  const repin = pinned ? getSelector(pinned) : null;
  if (pinned) unpin();
  if (on) {
    open(source, repin, copy);
    save();
  } else {
    close(repin);
  }
}

/** Reopens the canvas on a page where the user left it on. */
export function startCanvas(): void {
  watchSpace();
  if (readStore<Saved>(STORE_KEY).on) whenBodyExists(() => setCanvas(true));
}
