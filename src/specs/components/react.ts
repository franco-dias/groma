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
import { isElement, pageDocument, pageWindow } from "../../page";
import type { ComponentInfo, ComponentReader } from "./types";

// React leaves `return`, `child` and `memoizedProps` null when there is none; they are read as absent.
type Fiber = {
  type: unknown;
  return?: Fiber;
  child?: Fiber;
  /** The DOM node, on fibers of HTML elements. */
  stateNode: unknown;
  memoizedProps?: Record<string, unknown>;
};

type ComponentType = { displayName?: string; name?: string; styledComponentId?: string };

type BundleEntry = { name: string; sourcePath?: string };

type BundleHeader = { namespace: string; components: BundleEntry[] };

/** A fiber of a component, and whether an HTML element sits between it and the inspected element. */
type ComponentFiber = { fiber: Fiber; inside: boolean };

/** How many fibers up to look. */
const MAX_FIBER_DEPTH = 40;

const BUNDLE_HEADER = /^\/\*\s*@ds-bundle:\s*(\{.*?\})\s*\*\//s;

type DesignSystem = { page: Document; components: Map<unknown, BundleEntry> };

/** The components read from the page's bundle headers; a canvas frame has its own bundle. */
let designSystem: DesignSystem | undefined;

/** Design-system components by React type, read once from the bundle headers. */
function designSystemComponents(): Map<unknown, BundleEntry> {
  const page = pageDocument();
  if (designSystem?.page === page) return designSystem.components;
  const components = new Map<unknown, BundleEntry>();
  designSystem = { page, components };
  page.querySelectorAll("script[data-src]").forEach((script) => registerBundle(script, components));
  return components;
}

function registerBundle(script: Element, components: Map<unknown, BundleEntry>): void {
  const header = BUNDLE_HEADER.exec((script.textContent ?? "").slice(0, 200_000));
  if (!header) return;
  try {
    // Cast: the header is the page's own text; a shape that differs throws below and is skipped.
    const bundle = JSON.parse(header[1]) as BundleHeader;
    // Cast: the page's window keeps the bundle's namespace as a global.
    const exported = (pageWindow() as unknown as Record<string, Record<string, unknown>>)[bundle.namespace];
    bundle.components.forEach((entry) => {
      if (exported?.[entry.name]) components.set(exported[entry.name], entry);
    });
  } catch {
    // A header this version does not understand.
  }
}

function fiberOf(element: Element): Fiber | undefined {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  // Cast: the unofficial property React puts on its DOM nodes.
  return key ? (element as unknown as Record<string, Fiber>)[key] : undefined;
}

/** The first HTML element a component renders. */
function rootElement(fiber: Fiber): Element | undefined {
  let node: Fiber | undefined = fiber;
  while (node && typeof node.type !== "string") node = node.child;
  return isElement(node?.stateNode) ? node.stateNode : undefined;
}

function fibersAbove(element: Element): Fiber[] {
  const fibers: Fiber[] = [];
  let fiber = fiberOf(element)?.return;
  while (fiber && fibers.length < MAX_FIBER_DEPTH) {
    fibers.push(fiber);
    fiber = fiber.return;
  }
  return fibers;
}

/** The fibers of components among `fibers`, each with whether an HTML element came before it. */
function componentFibers(fibers: Fiber[]): ComponentFiber[] {
  let inside = false;
  return fibers.flatMap((fiber) => {
    if (typeof fiber.type === "string") inside = true;
    if (!fiber.type || typeof fiber.type === "string") return [];
    return [{ fiber, inside }];
  });
}

function findDesignSystemComponent(candidates: ComponentFiber[]): ComponentInfo | undefined {
  const known = designSystemComponents();
  const match = candidates.find(({ fiber }) => known.has(fiber.type));
  const entry = match && known.get(match.fiber.type);
  if (!match || !entry) return undefined;
  const { fiber, inside } = match;
  return { ...entry, inside, props: fiber.memoizedProps ?? {}, element: rootElement(fiber) };
}

/** The component's own name, when it is one a person would write: capitalised, not a wrapper. */
function directName({ fiber, inside }: ComponentFiber): string | undefined {
  if (inside) return undefined;
  // Cast: a component's type is a function or object that may carry these names.
  const { displayName, name, styledComponentId } = fiber.type as ComponentType;
  // Bundlers add a number to repeated names ("Typography2").
  const ownName = (displayName ?? name ?? "").replace(/\d+$/, "");
  const isUsable = /^[A-Z]/.test(ownName) && !/^Component$|Provider$/.test(ownName);
  return isUsable && !styledComponentId ? ownName : undefined;
}

function findDirectComponent(candidates: ComponentFiber[]): ComponentInfo | undefined {
  const match = candidates.find((candidate) => directName(candidate) !== undefined);
  const name = match && directName(match);
  if (!match || !name) return undefined;
  const { fiber, inside } = match;
  return { name, inside, props: fiber.memoizedProps ?? {}, element: rootElement(fiber) };
}

/**
 * The nearest design-system component around an element, else the component
 * that renders the element directly.
 */
export const reactComponent: ComponentReader = (element) => {
  const candidates = componentFibers(fibersAbove(element));
  return findDesignSystemComponent(candidates) ?? findDirectComponent(candidates);
};
