/**
 * The Layers tab: the element tree of the pinned element's artboard (or of
 * the page, outside an artboard), opened down to the pinned element.
 * Hover a layer to outline it on the page; click it to pin it.
 */
import { boardOf } from "../board";
import { h } from "../dom";
import { tagAndClasses } from "../element-name";
import { icon } from "../icons";
import { hideHoverOutline, showHoverOutline } from "../outlines";
import { isOwn } from "../root";
import { pin } from "../selection";
import { type Tab, tabBody } from "./tab";

const NOT_LAYERS = new Set(["script", "style", "link", "meta", "noscript"]);

let body: HTMLElement;

const layerChildren = (node: Element): Element[] =>
  Array.from(node.children).filter((child) => !isOwn(child) && !NOT_LAYERS.has(child.localName));

/** One layer and, when open, its children. `open` holds the layers that start expanded. */
function treeNode(node: Element, depth: number, open: Set<Element>, current: Element): HTMLElement {
  const wrap = h("div");
  const children = layerChildren(node);
  const row = wrap.appendChild(h("div", "layer"));
  row.setAttribute("role", "treeitem");
  row.classList.toggle("is-current", node === current);
  row.style.setProperty("--depth", String(depth));
  const caret = row.appendChild(h("span", "caret"));
  row.appendChild(tagAndClasses(node, "layer-name"));
  const childList = wrap.appendChild(h("div"));

  let isOpen = false;
  const setOpen = (next: boolean) => {
    isOpen = next;
    caret.replaceChildren(icon(isOpen ? "chevronDown" : "chevronRight", 12));
    childList.replaceChildren(
      ...(isOpen ? children.map((child) => treeNode(child, depth + 1, open, current)) : []),
    );
  };
  if (children.length) setOpen(open.has(node));

  caret.addEventListener("click", (e) => {
    e.stopPropagation();
    if (children.length) setOpen(!isOpen);
  });
  row.addEventListener("mouseenter", () => showHoverOutline(node));
  row.addEventListener("mouseleave", hideHoverOutline);
  row.addEventListener("click", () => {
    if (node !== current) pin(node);
  });
  return wrap;
}

function renderLayers(el: Element): void {
  const root = boardOf(el) ?? el.ownerDocument.body;
  const open = new Set<Element>();
  for (let node: Element | null = el; node; node = node.parentElement) {
    // The pinned layer itself starts closed: its children are one click away.
    if (node !== el) open.add(node);
    if (node === root) break;
  }
  const scrollTop = body.scrollTop;
  body.replaceChildren(treeNode(root, 0, open, el));
  body.scrollTop = scrollTop;
}

export const layersTab: Tab = {
  mount(panel) {
    body = tabBody(panel, "layers");
  },
  render: renderLayers,
};
