/**
 * Components on pages rendered with Vue, in development builds (a production
 * build drops the file path and often the names).
 *
 * Vue 3 leaves `__vueParentComponent` on every element it renders: the
 * instance of the component whose template made it, with a `parent` chain.
 * Vue 2 leaves `__vue__` on the root element of each component only, so the
 * ancestors are searched. Both are unofficial, so everything here is defensive.
 */
import { isElement } from "../../page";
import type { ComponentInfo, ComponentReader } from "./types";

/** The parts of a component's definition that name it. */
type VueType = { __name?: unknown; name?: unknown; __file?: unknown };

/** The Vue 3 instance. */
type Instance = {
  type?: VueType;
  props?: Record<string, unknown>;
  parent?: Instance;
  vnode?: { el?: unknown };
};

/** The Vue 2 instance. */
type OldInstance = { $options?: VueType; $props?: Record<string, unknown> };

/** How far up to look, in components and in elements. */
const MAX_DEPTH = 40;

const text = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);

/** The name the author gave, else the file's name ("src/Card.vue" is Card). */
// oxlint-disable-next-line no-underscore-dangle -- the names Vue gives its definitions
function nameOf({ __name, name, __file }: VueType): string | undefined {
  const fromFile = text(__file)
    ?.split("/")
    .at(-1)
    ?.replace(/\.\w+$/, "");
  return text(__name) ?? text(name) ?? fromFile;
}

function describe(type: VueType, extra: Pick<ComponentInfo, "inside" | "props" | "element">) {
  const name = nameOf(type);
  // oxlint-disable-next-line no-underscore-dangle -- the name the framework gives its property
  return name ? { name, sourcePath: text(type.__file), ...extra } : undefined;
}

function instanceAbove(instance: Instance | undefined, depth: number): ComponentInfo | undefined {
  if (!instance || depth > MAX_DEPTH) return undefined;
  const { type, props, vnode } = instance;
  const root = isElement(vnode?.el) ? vnode.el : undefined;
  return (
    (type && describe(type, { inside: false, props: { ...props }, element: root })) ||
    instanceAbove(instance.parent, depth + 1)
  );
}

function vue3(element: Element): ComponentInfo | undefined {
  // Cast: the unofficial property Vue 3 puts on its DOM nodes.
  // oxlint-disable-next-line no-underscore-dangle -- the name the framework gives its property
  const found = instanceAbove((element as { __vueParentComponent?: Instance }).__vueParentComponent, 0);
  return found && { ...found, inside: found.element !== element };
}

function vue2(element: Element, depth = 0): ComponentInfo | undefined {
  // Cast: the unofficial property Vue 2 puts on a component's root element.
  // oxlint-disable-next-line no-underscore-dangle -- the name the framework gives its property
  const vm = (element as { __vue__?: OldInstance }).__vue__;
  const found =
    vm?.$options && describe(vm.$options, { inside: depth > 0, props: { ...vm.$props }, element });
  const parent = element.parentElement;
  return found ?? (parent && depth < MAX_DEPTH ? vue2(parent, depth + 1) : undefined);
}

/**
 * The component whose template renders the element (Vue 3), else the nearest
 * component root around it (Vue 2).
 * shortcut: no wrapper components (a transition, a router view) are skipped
 * except by having no name; add a skip list if one shows up as "the component".
 */
export const vueComponent: ComponentReader = (element) => vue3(element) ?? vue2(element);
