/** The CSS properties the All CSS tab lists, in groups, and their default values. */

/** A list of property names written as one line of words. */
const names = (list: string): string[] => list.split(" ");

type CssGroup = { label: string; props: string[] };

export const CSS_GROUPS: CssGroup[] = [
  {
    label: "Display & Position",
    props: names("display position top right bottom left z-index visibility overflow overflow-x overflow-y"),
  },
  {
    label: "Box Model",
    props: names(
      "width height min-width max-width min-height max-height box-sizing margin-top margin-right " +
        "margin-bottom margin-left border-top-width border-right-width border-bottom-width " +
        "border-left-width border-style border-color border-radius padding-top padding-right " +
        "padding-bottom padding-left",
    ),
  },
  {
    label: "Flex (container)",
    props: names("flex-direction flex-wrap justify-content align-items align-content gap row-gap column-gap"),
  },
  {
    label: "Flex (item)",
    props: names("flex flex-grow flex-shrink flex-basis align-self justify-self order"),
  },
  {
    label: "Grid (container)",
    props: names(
      "grid-template-columns grid-template-rows grid-template-areas grid-auto-columns grid-auto-rows grid-auto-flow",
    ),
  },
  { label: "Grid (item)", props: names("grid-column grid-row grid-area") },
  {
    label: "Typography",
    props: names(
      "font-family font-size font-weight font-style line-height letter-spacing text-align " +
        "text-transform text-decoration white-space color",
    ),
  },
  {
    label: "Background",
    props: names("background-color background-image background-size background-position background-repeat"),
  },
  {
    label: "Transform & Transition",
    props: names("transform transform-origin transition animation opacity pointer-events"),
  },
];

/** A property showing this value is dimmed, and hidden by "Hide defaults". */
export const DEFAULT_VALUES: Record<string, string> = {
  position: "static",
  top: "auto",
  right: "auto",
  bottom: "auto",
  left: "auto",
  "z-index": "auto",
  overflow: "visible",
  "overflow-x": "visible",
  "overflow-y": "visible",
  visibility: "visible",
  "flex-direction": "row",
  "flex-wrap": "nowrap",
  "justify-content": "normal",
  "align-items": "normal",
  "align-content": "normal",
  "flex-grow": "0",
  "flex-shrink": "1",
  "flex-basis": "auto",
  "align-self": "auto",
  "justify-self": "auto",
  order: "0",
  "grid-template-columns": "none",
  "grid-template-rows": "none",
  "grid-template-areas": "none",
  "grid-auto-columns": "auto",
  "grid-auto-rows": "auto",
  "grid-auto-flow": "row",
  "grid-column": "auto",
  "grid-row": "auto",
  "grid-area": "auto",
  transform: "none",
  animation: "none",
  "pointer-events": "auto",
  "text-decoration": "none solid rgb(0, 0, 0)",
  "text-transform": "none",
  "font-style": "normal",
  "letter-spacing": "normal",
  "background-image": "none",
};
