/**
 * The page being inspected.
 *
 * Normally that is the document the inspector was added to. In canvas mode the
 * page is shown again in a frame that the user can resize and zoom, and the
 * inspector works on the frame's document instead. Code that reads or listens
 * to the page asks this module which document that is, and where its elements
 * are on screen.
 */

type Handler = (event: never) => void;
type Target = "document" | "window";

interface Listener {
  target: Target;
  type: string;
  handler: Handler;
  options?: boolean | AddEventListenerOptions;
}

/** Marks the frame, so the copy of the inspector inside it stays out of the way. */
const FRAME_MARK = "data-groma-frame";

let frame: HTMLIFrameElement | null = null;
const listeners: Listener[] = [];
const viewListeners: Array<() => void> = [];

/** The frame's document, or null when the browser does not let us read it. */
function frameDocument(): Document | null {
  try {
    return frame?.contentDocument ?? null;
  } catch {
    return null;
  }
}

/** The document of the page being inspected. */
export const pageDocument = (): Document => frameDocument() ?? document;

/** Its window: location, globals. */
export const pageWindow = (): Window => (frameDocument() && frame?.contentWindow) || window;

/**
 * The page's address. A frame filled with a copy of the page has none of its
 * own (`about:srcdoc`); this window's stands in, since it is the same page.
 */
export function pageAddress(): URL {
  const { href } = pageWindow().location;
  return new URL(href.startsWith("about:") ? location.href : href);
}

/**
 * True for an element of any document. `instanceof Element` is false for the
 * elements of a frame, which have their own `Element`.
 */
export const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && (node as Node).nodeType === 1;

// ── listening ──────────────────────────────────────────────────

function listen(listener: Listener, doc: Document): void {
  const target = listener.target === "window" ? doc.defaultView : doc;
  target?.addEventListener(listener.type, listener.handler as EventListener, listener.options);
}

/**
 * Listens to the page: to this document and, in canvas mode, to the frame's
 * as well, for as long as the frame shows it.
 */
export function onPage<K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void {
  addListener({ target: "document", type, handler, options });
}

/** The same, for events that only reach the window (`blur`). */
export function onPageWindow<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
): void {
  addListener({ target: "window", type, handler });
}

function addListener(listener: Listener): void {
  listeners.push(listener);
  listen(listener, document);
  const framed = frameDocument();
  if (framed) listen(listener, framed);
}

// ── the frame ──────────────────────────────────────────────────

/** Makes `element` the page (canvas mode), or goes back to this document with null. */
export function setFrame(element: HTMLIFrameElement | null): void {
  frame = element;
  frame?.setAttribute(FRAME_MARK, "");
  pageViewChanged();
}

/**
 * Call when the frame has loaded a document: the listeners move to it.
 * Returns false when the browser does not let us read the framed page.
 */
export function frameLoaded(): boolean {
  const framed = frameDocument();
  if (framed) listeners.forEach((listener) => listen(listener, framed));
  pageViewChanged();
  return framed !== null;
}

/** True in a window that an inspector outside it shows as its canvas frame. */
export function isGromaFrame(win: Window): boolean {
  try {
    return win.frameElement?.hasAttribute(FRAME_MARK) ?? false;
  } catch {
    // A cross-origin parent: not ours.
    return false;
  }
}

// ── where the page is on screen ────────────────────────────────

/** Runs `listener` when the page moves on screen as a whole: canvas pan, zoom, resize. */
export function onPageView(listener: () => void): void {
  viewListeners.push(listener);
}

/** Tells the overlays that the page moved on screen. */
export function pageViewChanged(): void {
  viewListeners.forEach((listener) => listener());
}

/** How much the canvas zooms the page: 1 outside canvas mode. */
export function pageZoom(): number {
  if (!frame?.offsetWidth) return 1;
  return frame.getBoundingClientRect().width / frame.offsetWidth;
}

/** The part of the window that shows the page: the frame, or null for the whole window. */
export function pageViewport(): DOMRect | null {
  return frame ? frame.getBoundingClientRect() : null;
}

/** A point of the page's own viewport, in this window's coordinates. */
export function toWindowPoint(x: number, y: number, from: Document | null): { x: number; y: number } {
  if (!frame || from !== frameDocument()) return { x, y };
  const origin = frame.getBoundingClientRect();
  const zoom = pageZoom();
  return { x: origin.left + x * zoom, y: origin.top + y * zoom };
}

/**
 * Where an element is in this window, in screen pixels. Overlays are placed
 * with this; `getBoundingClientRect()` on an element of the frame answers in
 * the frame's own coordinates.
 */
export function rectOf(el: Element): DOMRect {
  const rect = el.getBoundingClientRect();
  if (!frame || el.ownerDocument !== frameDocument()) return rect;
  const zoom = pageZoom();
  const { x, y } = toWindowPoint(rect.left, rect.top, el.ownerDocument);
  return new DOMRect(x, y, rect.width * zoom, rect.height * zoom);
}
