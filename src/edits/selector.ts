/** A CSS selector that finds the same element again after a reload. */

/**
 * The path from `<body>`, or from the nearest ancestor with an id.
 * Classes are kept so an edit never lands on a different element that only
 * sits at the same position.
 */
export function getSelector(element: Element): string {
  return pathTo(element, []).join(" > ");
}

function pathTo(node: Element, below: string[]): string[] {
  const parent = node.parentElement;
  if (!parent || node === node.ownerDocument.body) return ["body", ...below];
  const id = node.getAttribute("id");
  if (id) return ["#" + CSS.escape(id), ...below];
  return pathTo(parent, [stepTo(node, parent), ...below]);
}

/** One part of the path: the tag, the classes, and the position among siblings of the same tag. */
function stepTo(node: Element, parent: Element): string {
  const sameTag = Array.from(parent.children).filter((sibling) => sibling.localName === node.localName);
  const classes = Array.from(node.classList, (name) => "." + CSS.escape(name)).join("");
  const position = sameTag.length > 1 ? `:nth-of-type(${sameTag.indexOf(node) + 1})` : "";
  return CSS.escape(node.localName) + classes + position;
}
