/**
 * Components on pages rendered with React.
 *
 * React keeps a "fiber" on every DOM node it renders; walking up the fibers
 * gives the components around an element. This is unofficial, so everything
 * here is defensive.
 *
 * A Claude Design export also lists its design-system components in a
 * bundle header, which gives each one its public name and source file:
 *
 *   /* @ds-bundle: {"namespace": "Acme", "components": [{name, sourcePath}]} *\/
 */
import type { ComponentInfo, ComponentReader } from "./types";

interface Fiber {
  type: unknown;
  return: Fiber | null;
  child: Fiber | null;
  /** The DOM node, on fibers of HTML elements. */
  stateNode: unknown;
  memoizedProps: Record<string, unknown> | null;
}

interface ComponentType {
  displayName?: string;
  name?: string;
  styledComponentId?: string;
}

interface BundleEntry {
  name: string;
  sourcePath?: string;
}

let designSystem: Map<unknown, BundleEntry> | null = null;

/** Design-system components by React type, read once from the bundle headers. */
function designSystemComponents(): Map<unknown, BundleEntry> {
  if (designSystem) return designSystem;
  designSystem = new Map();
  for (const script of document.querySelectorAll("script[data-src]")) {
    const header = /^\/\*\s*@ds-bundle:\s*(\{.*?\})\s*\*\//s.exec(
      (script.textContent ?? "").slice(0, 200_000),
    );
    if (!header) continue;
    try {
      const { namespace, components } = JSON.parse(header[1]) as {
        namespace: string;
        components: BundleEntry[];
      };
      const exported = (window as unknown as Record<string, Record<string, unknown>>)[namespace];
      components.forEach((entry) => {
        if (exported?.[entry.name]) designSystem!.set(exported[entry.name], entry);
      });
    } catch {
      // A header this version does not understand.
    }
  }
  return designSystem;
}

function fiberOf(el: Element): Fiber | null {
  const key = Object.keys(el).find((name) => name.startsWith("__reactFiber$"));
  return key ? (el as unknown as Record<string, Fiber>)[key] : null;
}

/** The first HTML element a component renders. */
function rootElement(fiber: Fiber): Element | undefined {
  let node: Fiber | null = fiber;
  while (node && typeof node.type !== "string") node = node.child;
  return node?.stateNode instanceof Element ? node.stateNode : undefined;
}

/**
 * The nearest design-system component around an element, else the component
 * that renders the element directly.
 */
export const reactComponent: ComponentReader = (el) => {
  const known = designSystemComponents();
  let direct: ComponentInfo | null = null;
  let inside = false;
  let fiber = fiberOf(el)?.return ?? null;
  for (let depth = 0; fiber && depth < 40; fiber = fiber.return, depth++) {
    const type = fiber.type;
    if (typeof type === "string") inside = true;
    if (!type || typeof type === "string") continue;
    const props = fiber.memoizedProps ?? {};
    const entry = known.get(type);
    if (entry) return { ...entry, inside, props, element: rootElement(fiber) };

    const { displayName, name, styledComponentId } = type as ComponentType;
    // Bundlers add a number to repeated names ("Typography2").
    const ownName = (displayName ?? name ?? "").replace(/\d+$/, "");
    const usable = /^[A-Z]/.test(ownName) && !/^Component$|Provider$/.test(ownName);
    if (!direct && !inside && !styledComponentId && usable) {
      direct = { name: ownName, inside, props, element: rootElement(fiber) };
    }
  }
  return direct;
};
