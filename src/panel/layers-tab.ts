/**
 * The Layers tab: the element tree of the pinned element's artboard (or of
 * the page, outside an artboard), opened down to the pinned element.
 * Hover a layer to outline it on the page; click it to pin it.
 */
import { boardOf } from "../board";
import { elementLabel, h } from "../dom";
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
  const row = wrap.appendChild(h("div", "nav-row"));
  row.classList.toggle("is-current", node === current);
  row.style.paddingLeft = `${10 + depth * 12}px`;
  const caret = row.appendChild(h("span", "caret", children.length ? "▸" : ""));
  row.appendChild(h("span", "", elementLabel(node)));
  const childList = wrap.appendChild(h("div"));

  const setOpen = (isOpen: boolean) => {
    caret.textContent = isOpen ? "▾" : "▸";
    childList.replaceChildren(
      ...(isOpen ? children.map((child) => treeNode(child, depth + 1, open, current)) : []),
    );
  };
  if (children.length && open.has(node)) setOpen(true);

  caret.addEventListener("click", (e) => {
    e.stopPropagation();
    if (children.length) setOpen(caret.textContent === "▸");
  });
  row.addEventListener("mouseenter", () => showHoverOutline(node));
  row.addEventListener("mouseleave", hideHoverOutline);
  row.addEventListener("click", () => {
    if (node !== current) pin(node);
  });
  return wrap;
}

function renderLayers(el: Element): void {
  const root = boardOf(el) ?? document.body;
  const open = new Set<Element>();
  for (let node: Element | null = el; node; node = node.parentElement) {
    open.add(node);
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
