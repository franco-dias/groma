/**
 * Components on pages built with Svelte in development mode, which leaves
 * `__svelte_meta` on the elements it renders: the file (and line) of the
 * markup that made the element. A production build leaves nothing.
 *
 * shortcut: only the file is known, so the component is named after it
 * ("src/Card.svelte" is Card) and shows no props; the line is not shown,
 * since the export never names a line to edit. Read the component's props
 * from its instance if Svelte exposes them in a stable way.
 */
import type { ComponentReader } from "./types";

type Meta = { loc?: { file?: unknown } };

export const svelteComponent: ComponentReader = (element) => {
  // Cast: the unofficial property Svelte puts on its DOM nodes in development.
  // oxlint-disable-next-line no-underscore-dangle -- the name the framework gives its property
  const file = (element as { __svelte_meta?: Meta }).__svelte_meta?.loc?.file;
  const name =
    typeof file === "string"
      ? file
          .split("/")
          .at(-1)
          ?.replace(/\.svelte$/, "")
      : undefined;
  if (typeof file !== "string" || !name) return undefined;
  // The element sits in the component's markup; whether it is the root is not known.
  return { name, sourcePath: file, inside: true, props: {} };
};
