/**
 * The inspector's own corner of the page.
 *
 * Every node the inspector draws lives in one shadow root, so the page's CSS
 * cannot restyle the inspector and the inspector's CSS cannot leak out.
 */
import { h } from "./dom";
import styles from "./styles/index.css?inline";

const HOST_TAG = "live-inspector";

let host: HTMLElement | null = null;

function inspectorHost(): HTMLElement {
  if (!host) {
    host = document.body.appendChild(document.createElement(HOST_TAG));
    host.attachShadow({ mode: "open" }).appendChild(h("style", "", styles));
  }
  return host;
}

/** Adds a top-level inspector node (overlay, panel, menu…) to the page. */
export function mount<T extends HTMLElement>(node: T): T {
  inspectorHost().shadowRoot!.appendChild(node);
  return node;
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
