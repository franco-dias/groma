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

type Listener = { target: Target; type: string; handler: Handler; isCapturing: boolean };

/** Marks the frame, so the copy of the inspector inside it stays out of the way. */
const FRAME_MARK = "data-groma-frame";

let frame: HTMLIFrameElement | undefined;
const listeners: Listener[] = [];
const viewListeners: Array<() => void> = [];

/** The frame's document, or undefined when there is no frame or the browser does not let us read it. */
function frameDocument(): Document | undefined {
  try {
    return frame?.contentDocument ?? undefined;
  } catch {
    return undefined;
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
  // Cast: `null` is an object too, and `?.` covers it.
  typeof node === "object" && (node as Partial<Node> | undefined)?.nodeType === 1;

function listen(listener: Listener, targetDocument: Document): void {
  const target = listener.target === "window" ? targetDocument.defaultView : targetDocument;
  // Cast: the handler was typed for its event type when it was added; here it is only passed on.
  target?.addEventListener(listener.type, listener.handler as EventListener, listener.isCapturing);
}

/**
 * Listens to the page: to this document and, in canvas mode, to the frame's
 * as well, for as long as the frame shows it.
 */
export function onPage<TType extends keyof DocumentEventMap>(
  type: TType,
  handler: (event: DocumentEventMap[TType]) => void,
): void {
  addListener({ target: "document", type, handler, isCapturing: false });
}

/** The same, in the capture phase: before the page's own listeners see the event. */
export function onPageCapture<TType extends keyof DocumentEventMap>(
  type: TType,
  handler: (event: DocumentEventMap[TType]) => void,
): void {
  addListener({ target: "document", type, handler, isCapturing: true });
}

/** The same as `onPage`, for events that only reach the window (`blur`). */
export function onPageWindow<TType extends keyof WindowEventMap>(
  type: TType,
  handler: (event: WindowEventMap[TType]) => void,
): void {
  addListener({ target: "window", type, handler, isCapturing: false });
}

function addListener(listener: Listener): void {
  listeners.push(listener);
  listen(listener, document);
  const framed = frameDocument();
  if (framed) listen(listener, framed);
}

/** Makes `element` the page (canvas mode). */
export function setFrame(element: HTMLIFrameElement): void {
  frame = element;
  frame.setAttribute(FRAME_MARK, "");
  pageViewChanged();
}

/** Goes back to this document as the page. */
export function clearFrame(): void {
  frame = undefined;
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
  return framed !== undefined;
}

/** True in a window that an inspector outside it shows as its canvas frame. */
export function isGromaFrame(candidate: Window): boolean {
  try {
    return candidate.frameElement?.hasAttribute(FRAME_MARK) ?? false;
  } catch {
    // A cross-origin parent: not ours.
    return false;
  }
}

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

/** The part of the window that shows the page: the frame, or undefined for the whole window. */
export function pageViewport(): DOMRect | undefined {
  return frame?.getBoundingClientRect();
}

export type Point = { x: number; y: number };

/** A point of the page's own viewport, in this window's coordinates. */
export function toWindowPoint({ x, y }: Point, from: Document | undefined): Point {
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
export function rectOf(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  if (!frame || element.ownerDocument !== frameDocument()) return rect;
  const zoom = pageZoom();
  const { x, y } = toWindowPoint({ x: rect.left, y: rect.top }, element.ownerDocument);
  return new DOMRect(x, y, rect.width * zoom, rect.height * zoom);
}
