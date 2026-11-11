/** Click-to-copy for values, tokens and buttons in the panel. */

const FEEDBACK_MS = 1200;

type CopyText = string | (() => string);
type CopyResult = "is-copied" | "is-copy-blocked";

/**
 * Makes `node` copy `text` when clicked. For 1.2 seconds afterwards `node`
 * carries the class `is-copied` (or `is-copy-blocked`); the stylesheets turn
 * that into a tint and a "Copied" mark that add no size, so nothing around
 * the node moves.
 */
export function copyOnClick<TNode extends HTMLElement>(node: TNode, text: CopyText): TNode {
  return makeCopyable({ node, text, marked: [node] });
}

/** What to copy, and where the feedback shows beside the node itself. */
export type CopyMarking = { text: CopyText; row: HTMLElement };

/** The same, and `row` carries the feedback class too. */
export function copyOnClickMarking<TNode extends HTMLElement>(
  node: TNode,
  { text, row }: CopyMarking,
): TNode {
  return makeCopyable({ node, text, marked: [node, row] });
}

type Copyable<TNode> = { node: TNode; text: CopyText; marked: HTMLElement[] };

function makeCopyable<TNode extends HTMLElement>({ node, text, marked }: Copyable<TNode>): TNode {
  node.classList.add("copy");
  node.title ||= "Click to copy";
  node.addEventListener("click", async (event) => {
    event.stopPropagation();
    const result = await tryCopy(text);
    marked.forEach((element) => element.classList.add(result));
    setTimeout(() => marked.forEach((element) => element.classList.remove(result)), FEEDBACK_MS);
  });
  return node;
}

async function tryCopy(text: CopyText): Promise<CopyResult> {
  try {
    await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
    return "is-copied";
  } catch {
    return "is-copy-blocked";
  }
}
