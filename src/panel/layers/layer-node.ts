/**
 * One row of the Layers tree and, when it is open, the rows of its children.
 * Hover a row to outline its element on the page; click it to pin it. The
 * tree is drawn again for each pin; a layer that is open when the user moves
 * on, by a click or a key, stays open, so the tree does not fold under them.
 */
import { h } from "../../dom";
import { tagAndClasses } from "../../element-name";
import { icon } from "../../icons";
import { hideHoverOutline, showHoverOutline } from "../../outlines";
import { isOwn } from "../../root";
import { pin } from "../../selection";

const NOT_LAYERS = new Set(["script", "style", "link", "meta", "noscript"]);

/** The tree being drawn: which layers start expanded, and which is the pinned one. */
export type Tree = { open: Set<Element>; current: Element };

/** A layer's place in the tree: how deep it is. */
type Branch = Tree & { depth: number };

/** What the keys need from a row: its element, and whether and how it opens. */
export type Layer = { node: Element; isOpen: () => boolean; setOpen: (open: boolean) => void };

/** A layer as drawn: its element and children, its row and caret, and the list its children go in. */
type Drawn = { node: Element; children: Element[]; row: HTMLElement; caret: HTMLElement; list: HTMLElement };

const layerOfRow = new WeakMap<Element, Layer>();
/** The layers kept open across pins; weak, so a layer the page removed is let go. */
const opened = new WeakSet<Element>();

export const findLayer = (row: Element): Layer | undefined => layerOfRow.get(row);

/** Before a pin draws the tree again: every layer open now stays open. */
export function keepShown(tree: Element): void {
  const rows = tree.querySelectorAll(".layer[aria-expanded='true']");
  Array.from(rows, (row) => layerOfRow.get(row)?.node).forEach((node) => node && opened.add(node));
}

const layerChildren = (node: Element): Element[] =>
  Array.from(node.children).filter((child) => !isOwn(child) && !NOT_LAYERS.has(child.localName));

function createRow(node: Element, { depth, current }: Branch): { row: HTMLElement; caret: HTMLElement } {
  const row = h("div", "layer");
  row.setAttribute("role", "treeitem");
  row.setAttribute("aria-selected", String(node === current));
  row.classList.toggle("is-current", node === current);
  row.style.setProperty("--depth", String(depth));
  const caret = row.appendChild(h("span", "caret"));
  row.appendChild(tagAndClasses(node, "layer-name"));
  row.addEventListener("mouseenter", () => showHoverOutline(node));
  row.addEventListener("mouseleave", hideHoverOutline);
  row.addEventListener("click", () => {
    // The tree takes the focus, so the arrow keys reach it next.
    const tree = row.closest<HTMLElement>(".tree");
    tree?.focus({ preventScroll: true });
    if (node === current || !tree) return;
    keepShown(tree);
    pin(node);
  });
  return { row, caret };
}

function createChildren(children: Element[], branch: Branch): HTMLElement[] {
  return children.map((child) => createTreeNode(child, { ...branch, depth: branch.depth + 1 }));
}

/** Opens and closes a layer's children, and remembers the layers the user opened. */
function createLayer(drawn: Drawn, branch: Branch): Layer {
  let isOpen = false;
  const show = (next: boolean): void => {
    isOpen = next;
    drawn.row.setAttribute("aria-expanded", String(isOpen));
    drawn.caret.replaceChildren(icon(isOpen ? "chevronDown" : "chevronRight", 12));
    drawn.list.replaceChildren(...(isOpen ? createChildren(drawn.children, branch) : []));
  };
  const setOpen = (next: boolean): void => {
    if (!drawn.children.length) return;
    if (next) opened.add(drawn.node);
    else opened.delete(drawn.node);
    show(next);
  };
  if (drawn.children.length) show(branch.open.has(drawn.node) || opened.has(drawn.node));
  return { node: drawn.node, isOpen: () => isOpen, setOpen };
}

/** One layer and, when open, its children. */
export function createTreeNode(node: Element, branch: Branch): HTMLElement {
  const wrap = h("div");
  const { row, caret } = createRow(node, branch);
  wrap.appendChild(row);
  const list = wrap.appendChild(h("div"));
  const layer = createLayer({ node, children: layerChildren(node), row, caret, list }, branch);
  layerOfRow.set(row, layer);
  caret.addEventListener("click", (event) => {
    event.stopPropagation();
    layer.setOpen(!layer.isOpen());
  });
  return wrap;
}
