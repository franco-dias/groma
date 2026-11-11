/** What every block of the Specs tab knows about the element it describes. */
import { getSelector } from "../../edits/selector";
import { savedStyles } from "../../edits/style-overrides";
import { createStyleLookup, type StyleLookup } from "../../page-styles";
import { specSections } from "../../specs/sections";
import type { Spec, SpecSection } from "../../specs/spec";

export type SpecsContext = {
  element: Element;
  computedStyle: CSSStyleDeclaration;
  stylesOf: StyleLookup;
  sections: SpecSection[];
  /** Where the element's edits are saved. */
  selector: string;
  /** The element's saved style edits, by property. */
  saved: Record<string, string>;
  /** The tab's scroll area, which holds the blocks. */
  body: HTMLElement;
};

export function createContext(element: Element, body: HTMLElement): SpecsContext {
  const computedStyle = getComputedStyle(element);
  const stylesOf = createStyleLookup();
  const sections = specSections({ element, computedStyle, stylesOf });
  const selector = getSelector(element);
  return { element, computedStyle, stylesOf, sections, selector, saved: savedStyles(selector), body };
}

/** Where a spec is: its section and its name. */
export type SpecAddress = [section: string, name: string];

/** A spec by section and name, when it has a value. */
export const findSpec = ({ sections }: SpecsContext, [section, name]: SpecAddress): Spec | undefined =>
  sections
    .find((candidate) => candidate.label === section)
    ?.rows.find((row) => row.name === name && row.value);
