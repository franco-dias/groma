/**
 * The arrow keys in the Layers tree, while the focus is in it (a click on a
 * layer puts it there). ↑ and ↓ move the pin to the row above and below as
 * the tree shows them, so ↓ on a last child goes on to the next layer shown.
 * → opens a closed layer, or moves into an open one; ← closes an open layer,
 * or moves to its parent. As with Alt and an arrow, the pinned element is
 * scrolled into view on the page. The keys are kept from the page.
 */
import { pin } from "../../selection";
import { findLayer, keepShown, type Layer } from "./layer-node";

/** The tree's rows from top to bottom, and the pinned one's place among them. */
type Rows = { rows: HTMLElement[]; at: number; layer: Layer };

function moveTo(row: HTMLElement | undefined): void {
  const layer = row && findLayer(row);
  if (!layer) return;
  const tree = row.closest(".tree");
  if (tree) keepShown(tree);
  pin(layer.node);
  layer.node.scrollIntoView({ block: "nearest", inline: "nearest" });
}

const parentRow = ({ rows, layer }: Rows): HTMLElement | undefined =>
  rows.find((row) => findLayer(row)?.node === layer.node.parentElement);

const STEPS: Record<string, (rows: Rows) => void> = {
  ArrowDown: ({ rows, at }) => moveTo(rows[at + 1]),
  ArrowUp: ({ rows, at }) => moveTo(rows[at - 1]),
  ArrowRight: (found) =>
    found.layer.isOpen() ? moveTo(found.rows[found.at + 1]) : found.layer.setOpen(true),
  ArrowLeft: (found) => (found.layer.isOpen() ? found.layer.setOpen(false) : moveTo(parentRow(found))),
};

function findRows(tree: HTMLElement): Rows | undefined {
  const rows = Array.from(tree.querySelectorAll<HTMLElement>(".layer"));
  const at = rows.findIndex((row) => row.classList.contains("is-current"));
  const layer = at < 0 ? undefined : findLayer(rows[at]);
  return layer && { rows, at, layer };
}

const isPlain = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

/** Listens on the tree; the tab draws it again on each pin, so the rows are read on every key. */
export function pressTreeKey(event: KeyboardEvent, tree: HTMLElement): void {
  if (!Object.hasOwn(STEPS, event.key) || !isPlain(event)) return;
  const found = findRows(tree);
  if (!found) return;
  event.preventDefault();
  event.stopPropagation();
  STEPS[event.key](found);
  tree.querySelector(".layer.is-current")?.scrollIntoView({ block: "nearest" });
}
