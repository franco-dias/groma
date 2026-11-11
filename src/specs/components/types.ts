/** What every way of finding a component produces. */

export type ComponentInfo = {
  name: string;
  /** Where the component's source lives, when the page says. */
  sourcePath?: string;
  /** False when the element is the component's own root, true when it only sits inside it. */
  inside: boolean;
  /** The component's root element on the page. */
  element?: Element;
  /** The component's props. Text, numbers and booleans are shown. */
  props: Record<string, unknown>;
};

/**
 * One way a page can say which component an element belongs to.
 * Returns undefined when it has nothing to say about `element`; it must never throw.
 */
export type ComponentReader = (element: Element) => ComponentInfo | undefined;
