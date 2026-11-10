/**
 * The React component an element belongs to, with its props.
 *
 * React keeps a "fiber" on every DOM node it renders; walking up the fibers
 * gives the components around an element. A Claude Design export also lists
 * its design-system components in a bundle header:
 *
 *   /* @ds-bundle: {"namespace": "Acme", "components": [{name, sourcePath}]} *\/
 *
 * which tells us the public name and source file of each one.
 */

export interface ComponentInfo {
  name: string;
  /** Where the component's source lives, when the page says. */
  sourcePath?: string;
  /** False when the element is the component's own root, true when it only sits inside it. */
  inside: boolean;
  props: Record<string, unknown>;
}

interface Fiber {
  type: unknown;
  return: Fiber | null;
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

/**
 * The nearest design-system component around an element, else the component
 * that renders the element directly. Null on pages that do not use React.
 */
export function componentOf(el: Element): ComponentInfo | null {
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
    if (entry) return { ...entry, inside, props };

    const { displayName, name, styledComponentId } = type as ComponentType;
    // Bundlers add a number to repeated names ("Typography2").
    const ownName = (displayName ?? name ?? "").replace(/\d+$/, "");
    const usable = /^[A-Z]/.test(ownName) && !/^Component$|Provider$/.test(ownName);
    if (!direct && !inside && !styledComponentId && usable) {
      direct = { name: ownName, inside, props };
    }
  }
  return direct;
}

/** `<Typography variant="h4" component="h1">`: the component as you would write it. */
export function componentJsx({ name, props }: ComponentInfo): string {
  const attributes = Object.entries(props)
    .filter(([prop]) => !["children", "className", "style"].includes(prop))
    .flatMap(([prop, value]) => {
      if (typeof value === "string") return [`${prop}="${value}"`];
      if (typeof value === "number") return [`${prop}={${value}}`];
      if (typeof value === "boolean") return [value ? prop : `${prop}={false}`];
      return [];
    });
  return `<${[name, ...attributes].join(" ")}>`;
}
