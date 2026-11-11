/** Borrows attributes of a page element for a while and gives them back exactly as they were. */

type Lent = { name: string; original: string | undefined };

function giveBack(element: Element, { name, original }: Lent): void {
  if (original === undefined) element.removeAttribute(name);
  else element.setAttribute(name, original);
}

/**
 * Sets the attributes on the element. The returned function puts each back:
 * an attribute the element did not have is removed, not left empty.
 */
export function lendAttributes(element: Element, lent: Record<string, string>): () => void {
  const originals = Object.keys(lent).map((name) => ({
    name,
    original: element.getAttribute(name) ?? undefined,
  }));
  Object.entries(lent).forEach(([name, value]) => element.setAttribute(name, value));
  return () => originals.forEach((attribute) => giveBack(element, attribute));
}
