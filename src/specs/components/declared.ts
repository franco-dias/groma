/**
 * Components the page declares in its markup, the way any design generator
 * or framework can:
 *
 *   <div data-component="Card" data-source="ui/Card.tsx" data-props='{"tone":"dark"}'>
 */
import type { ComponentReader } from "./types";

function declaredProps(root: Element): Record<string, unknown> {
  try {
    const props: unknown = JSON.parse(root.getAttribute("data-props") ?? "{}");
    // Cast: a JSON object, checked just above, is a record.
    return props && typeof props === "object" ? (props as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const declaredComponent: ComponentReader = (element) => {
  const root = element.closest("[data-component]");
  const name = root?.getAttribute("data-component");
  if (!root || !name) return undefined;
  return {
    name,
    sourcePath: root.getAttribute("data-source") ?? undefined,
    inside: root !== element,
    element: root,
    props: declaredProps(root),
  };
};
