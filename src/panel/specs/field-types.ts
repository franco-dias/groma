/** An editable value of the Specs tab, and what is going on with it. */
import type { TokenList } from "../token-list/token-list";
import type { SpecsContext } from "./specs-context";

/**
 * A value that is one CSS property: `value` is what the property holds. With
 * `whole`, the value is one part of the property (a track of a grid) and
 * `whole` gives the property's value for what was typed.
 */
export type EditableField = {
  context: SpecsContext;
  prop: string;
  value: string;
  whole?: (typed: string) => string;
};

/** An editable value and what is going on with it. Its fields change as the user works. */
export type FieldSession = {
  node: HTMLElement;
  field: EditableField;
  /** What the field holds when opened: the saved edit as it was typed, or the page's value. */
  held: string;
  /** The text the node showed, which Escape puts back. */
  text: string | null;
  isEditing: boolean;
  tokens?: TokenList;
};
