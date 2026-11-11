/**
 * Custom elements (`<my-card tone="dark">`) are components by definition:
 * the tag is the name and the attributes are the props.
 */
import type { ComponentReader } from "./types";

/** How far up to look. An app shell far above the element is not "its" component. */
const MAX_DEPTH = 5;

const NOT_PROPS = new Set(["class", "style", "id"]);

function propsOf(root: Element): Record<string, string | true> {
  return Object.fromEntries(
    Array.from(root.attributes)
      .filter((attribute) => !NOT_PROPS.has(attribute.name))
      // An attribute with no value is a boolean one: <my-card open>.
      .map((attribute) => [attribute.name, attribute.value === "" ? true : attribute.value]),
  );
}

function customElementAbove(element: Element, depth: number): Element | undefined {
  if (depth > MAX_DEPTH) return undefined;
  if (element.localName.includes("-")) return element;
  const parent = element.parentElement;
  return parent ? customElementAbove(parent, depth + 1) : undefined;
}

export const customElement: ComponentReader = (element) => {
  const root = customElementAbove(element, 0);
  if (!root) return undefined;
  return { name: root.localName, inside: root !== element, element: root, props: propsOf(root) };
};
