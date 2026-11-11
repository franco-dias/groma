/**
 * The Layers tab: the element tree of the pinned element's artboard (or of
 * the page, outside an artboard), opened down to the pinned element.
 * Hover a layer to outline it on the page; click it to pin it.
 */
import { findBoard } from "../board";
import { h } from "../dom";
import { tagAndClasses } from "../element-name";
import { icon } from "../icons";
import { hideHoverOutline, showHoverOutline } from "../outlines";
import { isOwn } from "../root";
import { pin } from "../selection";
import { type Tab, tabBody } from "./tab";

const NOT_LAYERS = new Set(["script", "style", "link", "meta", "noscript"]);

let body: HTMLElement;

/** The tree being drawn: which layers start expanded, and which is the pinned one. */
type Tree = { open: Set<Element>; current: Element };

/** A layer's place in the tree: how deep it is. */
type Branch = Tree & { depth: number };

const layerChildren = (node: Element): Element[] =>
  Array.from(node.children).filter((child) => !isOwn(child) && !NOT_LAYERS.has(child.localName));

function createRow(node: Element, { depth, current }: Branch): { row: HTMLElement; caret: HTMLElement } {
  const row = h("div", "layer");
  row.setAttribute("role", "treeitem");
  row.classList.toggle("is-current", node === current);
  row.style.setProperty("--depth", String(depth));
  const caret = row.appendChild(h("span", "caret"));
  row.appendChild(tagAndClasses(node, "layer-name"));
  row.addEventListener("mouseenter", () => showHoverOutline(node));
  row.addEventListener("mouseleave", hideHoverOutline);
  row.addEventListener("click", () => {
    if (node !== current) pin(node);
  });
  return { row, caret };
}

function createChildren(children: Element[], branch: Branch): HTMLElement[] {
  return children.map((child) => createTreeNode(child, { ...branch, depth: branch.depth + 1 }));
}

/** One layer and, when open, its children. */
function createTreeNode(node: Element, branch: Branch): HTMLElement {
  const wrap = h("div");
  const children = layerChildren(node);
  const { row, caret } = createRow(node, branch);
  wrap.appendChild(row);
  const childList = wrap.appendChild(h("div"));

  let isOpen = false;
  const setOpen = (next: boolean): void => {
    isOpen = next;
    caret.replaceChildren(icon(isOpen ? "chevronDown" : "chevronRight", 12));
    childList.replaceChildren(...(isOpen ? createChildren(children, branch) : []));
  };
  if (children.length) setOpen(branch.open.has(node));

  caret.addEventListener("click", (event) => {
    event.stopPropagation();
    if (children.length) setOpen(!isOpen);
  });
  return wrap;
}

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
  },
  render: renderLayers,
};
