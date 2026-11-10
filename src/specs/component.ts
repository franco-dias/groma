/**
 * The UI component an element belongs to, with the props the design gives it.
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

export interface ComponentProp {
  name: string;
  value: string;
}

/**
 * The props the design passes to a component, as text. Only text, numbers
 * and booleans: functions, objects and children say little in a list.
 *
 * These are what the design uses, not what a codebase should write: the
 * inspector cannot know a project's component API, so it does not suggest
 * code.
 */
export function componentProps({ props }: ComponentInfo): ComponentProp[] {
  return Object.entries(props)
    .filter(([name]) => !["children", "className", "style"].includes(name))
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([name, value]) => ({ name, value: String(value) }));
}
