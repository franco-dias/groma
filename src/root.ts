/**
 * The inspector's own corner of the page.
 *
 * Every node the inspector draws lives in one shadow root, so the page's CSS
 * cannot restyle the inspector and the inspector's CSS cannot leak out.
 */
import { h } from "./dom";
import styles from "./styles/index.css?inline";

const HOST_TAG = "live-inspector";

let root: ShadowRoot | null = null;

function inspectorRoot(): ShadowRoot {
  if (!root) {
    const host = document.body.appendChild(document.createElement(HOST_TAG));
    root = host.attachShadow({ mode: "open" });
    root.appendChild(h("style", "", styles));
  }
  return root;
}

/** Adds a top-level inspector node (overlay, panel, menu…) to the page. */
export function mount<T extends HTMLElement>(node: T): T {
  inspectorRoot().appendChild(node);
  return node;
}

/**
 * True for the inspector's own UI. Events that start inside the shadow root
 * reach the page's listeners with the host element as their target.
 */
export function isOwn(node: EventTarget | null): boolean {
  return node instanceof Element && node.localName === HOST_TAG;
}
