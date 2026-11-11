/**
 * The inspector's own corner of the page.
 *
 * Every node the inspector draws lives in one shadow root, so the page's CSS
 * cannot restyle the inspector and the inspector's CSS cannot leak out.
 *
 * The host is also put in the browser's top layer, which paints above every
 * other element whatever its z-index. A page's own fixed elements, even one
 * at the highest z-index that comes later in the document, cannot cover the
 * panel, the launcher or the outlines.
 */
import { h } from "./dom";
import { onPageView, pageViewport } from "./page";
import styles from "./styles/index.css?inline";

export const HOST_TAG = "groma-inspector";

let host: HTMLElement | null = null;

function inspectorHost(): HTMLElement {
  if (!host) {
    host = document.body.appendChild(document.createElement(HOST_TAG));
    host.attachShadow({ mode: "open" }).appendChild(h("style", "", styles));
    promoteToTopLayer(host);
    // A page may replace its <body>, or its whole <html>, after it loads (a
    // design export that unpacks itself does). The host goes with the old
    // one; put it back, with everything it holds.
    new MutationObserver(comeBack).observe(document, { childList: true, subtree: true });
  }
  return host;
}

function comeBack(): void {
  if (!host || host.isConnected || !document.body) return;
  document.body.appendChild(host);
  // Leaving the document also took it out of the top layer.
  promoteToTopLayer(host);
}

/**
 * A manual popover stays open until closed (no light dismiss, Esc does not
 * close it) and sits in the top layer. Browsers without the Popover API keep
 * the z-index the stylesheet gives the host.
 */
function promoteToTopLayer(element: HTMLElement): void {
  if (!("showPopover" in element)) return;
  try {
    element.popover = "manual";
    element.showPopover();
  } catch {
    // Not promoted: the host's own z-index still applies.
  }
}

/** Adds a top-level inspector node (overlay, panel, menu…) to the page. */
export function mount<T extends HTMLElement>(node: T): T {
  inspectorHost().shadowRoot!.appendChild(node);
  return node;
}

let pageLayer: HTMLElement | null = null;

/**
 * Adds a node that marks something on the page (an outline, the hover boxes,
 * the grid). In canvas mode these are cut at the edge of the frame, as the
 * page's own content is; the node keeps window coordinates either way.
 */
export function mountOnPage<T extends HTMLElement>(node: T): T {
  if (!pageLayer) {
    pageLayer = mount(h("div", "page-clip")).appendChild(h("div", "page-layer"));
    onPageView(clipPageLayer);
    clipPageLayer();
  }
  pageLayer.appendChild(node);
  return node;
}

/**
 * The clip box covers the frame and cuts what leaves it. The layer inside is
 * moved back by the box's offset, so its nodes are still placed in window
 * coordinates.
 */
function clipPageLayer(): void {
  if (!pageLayer) return;
  const clip = pageLayer.parentElement!;
  const viewport = pageViewport();
  clip.classList.toggle("is-framed", viewport !== null);
  if (!viewport) {
    clip.removeAttribute("style");
    pageLayer.removeAttribute("style");
    return;
  }
  clip.style.left = `${viewport.left}px`;
  clip.style.top = `${viewport.top}px`;
  clip.style.width = `${viewport.width}px`;
  clip.style.height = `${viewport.height}px`;
  pageLayer.style.transform = `translate(${-viewport.left}px, ${-viewport.top}px)`;
}

/** Sets a CSS variable every inspector node can read (see styles/tokens.css). */
export function setRootVariable(name: string, value: string): void {
  inspectorHost().style.setProperty(name, value);
}

/**
 * True for the inspector's own UI. Events that start inside the shadow root
 * reach the page's listeners with the host element as their target.
 */
export function isOwn(node: EventTarget | null): boolean {
  return node instanceof Element && node.localName === HOST_TAG;
}

/** Runs `start` once the page has a `<body>` to mount into. */
export function whenBodyExists(start: () => void): void {
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
