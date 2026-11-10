/** A CSS selector that finds the same element again after a reload. */

/**
 * The path from `<body>`, or from the nearest ancestor with an id.
 * Classes are kept so an edit never lands on a different element that only
 * sits at the same position.
 */
export function getSelector(el: Element): string {
  const parts: string[] = [];
  for (
    let node = el;
    node.parentElement && node !== node.ownerDocument.body;
    node = node.parentElement
  ) {
    const id = node.getAttribute("id");
    if (id) return ["#" + CSS.escape(id), ...parts].join(" > ");
    const sameTag = Array.from(node.parentElement.children).filter(
      (sibling) => sibling.localName === node.localName,
    );
    const classes = Array.from(node.classList, (name) => "." + CSS.escape(name)).join("");
    const nth = sameTag.length > 1 ? `:nth-of-type(${sameTag.indexOf(node) + 1})` : "";
    parts.unshift(CSS.escape(node.localName) + classes + nth);
  }
  return ["body", ...parts].join(" > ");
}
