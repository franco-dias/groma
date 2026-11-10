/** Click-to-copy for values, tokens and buttons in the panel. */

/**
 * Makes `node` copy `text` when clicked. The result shows as a mark over the
 * node (see `.copy` in styles/rows.css), so nothing around it moves.
 */
export function copyOnClick<T extends HTMLElement>(node: T, text: string | (() => string)): T {
  node.classList.add("copy");
  node.title ||= "Click to copy";
  node.addEventListener("click", async () => {
    let result = "is-copied";
    try {
      await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
    } catch {
      result = "is-copy-blocked";
    }
    node.classList.add(result);
    setTimeout(() => node.classList.remove(result), 700);
  });
  return node;
}
