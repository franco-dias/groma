/**
 * Components the page declares in its markup, the way any design generator
 * or framework can:
 *
 *   <div data-component="Card" data-source="ui/Card.tsx" data-props='{"tone":"dark"}'>
 */
import type { ComponentReader } from "./types";

function declaredProps(root: Element): Record<string, unknown> {
  try {
    const props = JSON.parse(root.getAttribute("data-props") ?? "{}");
    return props && typeof props === "object" ? props : {};
  } catch {
    return {};
  }
}

export const declaredComponent: ComponentReader = (el) => {
  const root = el.closest("[data-component]");
  const name = root?.getAttribute("data-component");
  if (!root || !name) return null;
  return {
    name,
    sourcePath: root.getAttribute("data-source") ?? undefined,
    inside: root !== el,
    element: root,
    props: declaredProps(root),
  };
};
