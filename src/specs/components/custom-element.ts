/**
 * Custom elements (`<my-card tone="dark">`) are components by definition:
 * the tag is the name and the attributes are the props.
 */
import type { ComponentReader } from "./types";

/** How far up to look. An app shell far above the element is not "its" component. */
const MAX_DEPTH = 5;

const NOT_PROPS = new Set(["class", "style", "id"]);

export const customElement: ComponentReader = (el) => {
  let root: Element | null = el;
  for (let depth = 0; root && depth <= MAX_DEPTH; root = root.parentElement, depth++) {
    if (!root.localName.includes("-")) continue;
    const props = Object.fromEntries(
      Array.from(root.attributes)
        .filter((attribute) => !NOT_PROPS.has(attribute.name))
        // An attribute with no value is a boolean one: <my-card open>.
        .map((attribute) => [attribute.name, attribute.value === "" ? true : attribute.value]),
    );
    return { name: root.localName, inside: root !== el, element: root, props };
  }
  return null;
};
