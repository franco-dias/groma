/**
 * Components on pages built with Angular in development mode, which puts a
 * debug API on the page's window: `ng.getComponent(host)` for the component an
 * element is the host of, `ng.getOwningComponent(element)` for the component
 * whose template holds it, and `ng.getDirectiveMetadata(instance)` (recent
 * versions) for its inputs. A production build has no `ng`.
 *
 * shortcut: Angular exposes no source file, so none is shown; the component is
 * named by its class. Without `getDirectiveMetadata` no props are shown, since
 * guessing them from the instance would list its internal state; add the
 * props when older versions matter.
 */
import { pageWindow } from "../../page";
import type { ComponentInfo, ComponentReader } from "./types";

type Instance = Record<string, unknown>;

type Debug = {
  getComponent?: (element: Element) => unknown;
  getOwningComponent?: (element: Element) => unknown;
  // An input's class property, and the name it has outside (or details about it).
  getDirectiveMetadata?: (instance: unknown) => { inputs?: Record<string, unknown> } | undefined;
};

const isInstance = (value: unknown): value is Instance => typeof value === "object" && Boolean(value);

/** The class's name; newer compilers prefix it with an underscore. */
function nameOf(instance: Instance, element: Element): string {
  const own = (instance.constructor as { name?: unknown } | undefined)?.name;
  return (typeof own === "string" && own.replace(/^_+/, "")) || element.localName;
}

/** A signal is a function that carries the framework's `SIGNAL` symbol. */
const isSignal = (value: unknown): value is () => unknown =>
  typeof value === "function" &&
  Object.getOwnPropertySymbols(value).some((symbol) => symbol.description === "SIGNAL");

/**
 * An input's value; a signal input is called for it. Any other function (a
 * callback the page passed in) is never called: that would run the page's
 * code.
 */
function valueOf(instance: Instance, key: string): unknown {
  const value = instance[key];
  return isSignal(value) ? value() : value;
}

function inputsOf(ng: Debug, instance: Instance): Record<string, unknown> {
  const inputs = ng.getDirectiveMetadata?.(instance)?.inputs ?? {};
  return Object.fromEntries(
    Object.entries(inputs).flatMap(([key, outside]) => {
      try {
        return [[typeof outside === "string" ? outside : key, valueOf(instance, key)]];
      } catch {
        return [];
      }
    }),
  );
}

/** The component the element hosts, else the one whose template it is in (as React reports a component around an element). */
export const angularComponent: ComponentReader = (element) => {
  // Cast: the debug API is whatever the page's window offers under `ng`.
  const ng = (pageWindow() as unknown as { ng?: Debug }).ng;
  const host = ng?.getComponent?.(element);
  const instance = isInstance(host) ? host : ng?.getOwningComponent?.(element);
  if (!ng || !isInstance(instance)) return undefined;
  const info: ComponentInfo = {
    name: nameOf(instance, element),
    inside: instance !== host,
    props: inputsOf(ng, instance),
  };
  return isInstance(host) ? { ...info, element } : info;
};
