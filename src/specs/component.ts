/**
 * The UI component an element belongs to, with its props.
 *
 * Pages say this in different ways, so each way is a small "reader" in
 * `components/`. To support another framework, add a reader and list it
 * here; nothing else changes.
 */
import { customElement } from "./components/custom-element";
import { declaredComponent } from "./components/declared";
import { reactComponent } from "./components/react";
import type { ComponentInfo, ComponentReader } from "./components/types";

export type { ComponentInfo };

/** Most explicit first: what the page declares, then what a framework knows, then the markup itself. */
const READERS: ComponentReader[] = [declaredComponent, reactComponent, customElement];

/** The component around an element, or null when the page does not say. */
export function componentOf(el: Element): ComponentInfo | null {
  for (const read of READERS) {
    try {
      const component = read(el);
      if (component) return component;
    } catch {
      // A reader that trips over a page's internals must not break the panel.
    }
  }
  return null;
}

export interface JsxAttribute {
  name: string;
  /** `"h4"`, `{3}` or "" for a bare boolean attribute. */
  value: string;
}

/** The props worth showing: text, numbers and booleans. */
export function componentAttributes({ props }: ComponentInfo): JsxAttribute[] {
  return Object.entries(props)
    .filter(([name]) => !["children", "className", "style"].includes(name))
    .flatMap(([name, value]) => {
      if (typeof value === "string") return [{ name, value: `"${value}"` }];
      if (typeof value === "number") return [{ name, value: `{${value}}` }];
      if (typeof value === "boolean") return [{ name, value: value ? "" : "{false}" }];
      return [];
    });
}

/** `<Card tone="dark" elevated>`: the component as you would write it. */
export function componentJsx(component: ComponentInfo): string {
  const attributes = componentAttributes(component).map(({ name, value }) =>
    value ? `${name}=${value}` : name,
  );
  return `<${[component.name, ...attributes].join(" ")}>`;
}
