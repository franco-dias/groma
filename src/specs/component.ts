/**
 * The UI component an element belongs to, with the props the design gives it.
 *
 * Pages say this in different ways, so each way is a small "reader" in
 * `components/`. To support another framework, add a reader and list it
 * here; nothing else changes.
 */
import { angularComponent } from "./components/angular";
import { customElement } from "./components/custom-element";
import { declaredComponent } from "./components/declared";
import { reactComponent } from "./components/react";
import { svelteComponent } from "./components/svelte";
import type { ComponentInfo, ComponentReader } from "./components/types";
import { vueComponent } from "./components/vue";

export type { ComponentInfo };

/** Most explicit first: what the page declares, then what a framework knows, then the markup itself. */
const READERS: ComponentReader[] = [
  declaredComponent,
  reactComponent,
  vueComponent,
  svelteComponent,
  angularComponent,
  customElement,
];

/** The reader's answer, or nothing when it trips over a page's internals: that must not break the panel. */
function readSafely(read: ComponentReader, element: Element): ComponentInfo | undefined {
  try {
    return read(element);
  } catch {
    return undefined;
  }
}

function firstComponent([read, ...others]: ComponentReader[], element: Element): ComponentInfo | undefined {
  if (!read) return undefined;
  return readSafely(read, element) ?? firstComponent(others, element);
}

/** The component around an element, or undefined when the page does not say. */
export const findComponent = (element: Element): ComponentInfo | undefined =>
  firstComponent(READERS, element);

export type ComponentProp = { name: string; value: string };

const HIDDEN_PROPS = ["children", "className", "style"];
const SHOWN_TYPES = ["string", "number", "boolean"];

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
    .filter(([name]) => !HIDDEN_PROPS.includes(name))
    .filter(([, value]) => SHOWN_TYPES.includes(typeof value))
    .map(([name, value]) => ({ name, value: String(value) }));
}
