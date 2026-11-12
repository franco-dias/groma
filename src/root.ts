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
import { h, placeOver } from "./dom";
import { onPageView, pageViewport } from "./page";
import styles from "./styles/index.css?inline";

export const HOST_TAG = "groma-inspector";

type Inspector = { host: HTMLElement; shadow: ShadowRoot };

let inspector: Inspector | undefined;

function getInspector(): Inspector {
  if (inspector) return inspector;
  const host = document.body.appendChild(document.createElement(HOST_TAG));
  const shadow = host.attachShadow({ mode: "open" });
  shadow.appendChild(h("style", "", styles));
  promoteToTopLayer(host);
  inspector = { host, shadow };
  // A page may replace its <body>, or its whole <html>, after it loads (a
  // design export that unpacks itself does). The host goes with the old
  // one; put it back, with everything it holds.
  new MutationObserver(comeBack).observe(document, { childList: true, subtree: true });
  return inspector;
}

function comeBack(): void {
  if (!inspector || inspector.host.isConnected || !document.body) return;
  document.body.appendChild(inspector.host);
  // Leaving the document also took it out of the top layer.
  promoteToTopLayer(inspector.host);
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
export function mount<TNode extends HTMLElement>(node: TNode): TNode {
  getInspector().shadow.appendChild(node);
  return node;
}

/** The box that cuts what leaves the canvas frame, and the layer inside it that holds the nodes. */
type PageLayers = { clip: HTMLElement; layer: HTMLElement };

let pageLayers: PageLayers | undefined;

function getPageLayers(): PageLayers {
  if (pageLayers) return pageLayers;
  const clip = mount(h("div", "page-clip"));
  const layer = clip.appendChild(h("div", "page-layer"));
  const layers = { clip, layer };
  pageLayers = layers;
  onPageView(() => clipPageLayer(layers));
  clipPageLayer(layers);
  return layers;
}

/**
 * Adds a node that marks something on the page (an outline, the hover boxes,
 * the grid). In canvas mode these are cut at the edge of the frame, as the
 * page's own content is; the node keeps window coordinates either way.
 */
export function mountOnPage<TNode extends HTMLElement>(node: TNode): TNode {
  getPageLayers().layer.appendChild(node);
  return node;
}

/**
 * The clip box covers the frame and cuts what leaves it. The layer inside is
 * moved back by the box's offset, so its nodes are still placed in window
 * coordinates.
 */
function clipPageLayer({ clip, layer }: PageLayers): void {
  const viewport = pageViewport();
  clip.classList.toggle("is-framed", viewport !== undefined);
  if (!viewport) {
    clip.removeAttribute("style");
    layer.removeAttribute("style");
    return;
  }
  placeOver(clip, viewport);
  layer.style.transform = `translate(${-viewport.left}px, ${-viewport.top}px)`;
}

/** Sets a CSS variable every inspector node can read (see styles/tokens.css). */
export function setRootVariable(name: string, value: string): void {
  getInspector().host.style.setProperty(name, value);
}

/**
 * True for the inspector's own UI. Events that start inside the shadow root
 * reach the page's listeners with the host element as their target.
 */
/** The inspector's own node that matches `selector`, if it is mounted. */
export const findOwn = (selector: string): Element | undefined =>
  inspector?.shadow.querySelector(selector) ?? undefined;

/** The inspector's own node that has the focus, if any. */
export const findOwnFocus = (): Element | undefined => inspector?.shadow.activeElement ?? undefined;

export function isOwn(node: unknown): boolean {
  return node instanceof Element && node.localName === HOST_TAG;
}

/** Runs `start` once the page has a `<body>` to mount into. */
export function whenBodyExists(start: () => void): void {
  if (document.body) {
    start();
    return;
  }
  document.addEventListener("DOMContentLoaded", start, { once: true });
}
