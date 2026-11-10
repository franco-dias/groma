/** Click-to-copy for values, tokens and buttons in the panel. */

const FEEDBACK_MS = 1200;

/**
 * Makes `node` copy `text` when clicked. For 1.2 seconds afterwards `node`,
 * and `feedbackOn` when given, carry the class `is-copied` (or
 * `is-copy-blocked`); the stylesheets turn that into a tint and a "Copied"
 * mark that add no size, so nothing around the node moves.
 */
export function copyOnClick<T extends HTMLElement>(
  node: T,
  text: string | (() => string),
  feedbackOn?: HTMLElement,
): T {
  node.classList.add("copy");
  node.title ||= "Click to copy";
  node.addEventListener("click", async (e) => {
    e.stopPropagation();
    let result = "is-copied";
    try {
      await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
    } catch {
      result = "is-copy-blocked";
    }
    const marked = feedbackOn ? [node, feedbackOn] : [node];
    marked.forEach((el) => el.classList.add(result));
    setTimeout(() => marked.forEach((el) => el.classList.remove(result)), FEEDBACK_MS);
  });
  return node;
}
