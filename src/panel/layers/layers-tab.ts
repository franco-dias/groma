/**
 * The Layers tab: the element tree of the pinned element's artboard (or of
 * the page, outside an artboard), opened down to the pinned element.
 * Hover a layer to outline it on the page; click it to pin it. With the
 * focus in the tree, the arrow keys walk it (tree-keys.ts).
 */
import { findBoard } from "../../board";
import { type Tab, tabBody } from "../tab";
import { createTreeNode } from "./layer-node";
import { pressTreeKey } from "./tree-keys";

let body: HTMLElement;

/** The layers from the pinned element up to `root` start expanded; the pinned one itself starts closed. */
function layersToOpen(pinned: Element, root: Element): Set<Element> {
  const chain: Element[] = [];
  let node: Element | undefined = pinned;
  while (node) {
    chain.push(node);
    node = node === root ? undefined : (node.parentElement ?? undefined);
  }
  return new Set(chain.slice(1));
}

function renderLayers(element: Element): void {
  const root = findBoard(element) ?? element.ownerDocument.body;
  const scrollTop = body.scrollTop;
  body.replaceChildren(
    createTreeNode(root, { depth: 0, open: layersToOpen(element, root), current: element }),
  );
  body.scrollTop = scrollTop;
}

export const layersTab: Tab = {
  mount(panel) {
    body = tabBody(panel, "layers");
    body.addEventListener("keydown", (event) => pressTreeKey(event, body));
  },
  render: renderLayers,
};
