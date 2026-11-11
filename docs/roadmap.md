# Roadmap

Where Groma is going. The goal: come as close as possible to Figma's inspect
panel on a live page, stay very light, and let a developer edit the page in
place and hand the changes to a coding agent.

What each shipped feature does is in [features.md](features.md). This file
lists what is planned, in order. Move an item to the changelog when it ships.

0.7 shipped the first part: edit in the Specs tab, the Edits tab with undo,
and "Copy edits" for a coding agent ([CHANGELOG.md](../CHANGELOG.md)).

## 0.8: Edit like Figma

In this order:

1. **Read declared values correctly.** The style lookup takes the last
   declaration in the stylesheets, even inside a media query that does not
   apply now. It is the known limit behind wrong grid columns and wrong token
   names, and token suggestions build on it.
2. **Drag a number to scrub it**: sizes, gap, radius, the sides of the box,
   font size, grid tracks. One drag is one step to undo.
3. **Suggest the page's tokens while typing a value**: a short list under the
   field, by the kind of value (colours for a colour, lengths for a spacing).
   Choosing one writes `var(--token)`.
4. **Double-click text on the page to edit it in place**, while inspect mode
   is locked on.
5. **Left over from 0.7:**
   - in rem mode the fields still hold pixels;
   - an edit that ends where it started stays listed (`row → row`);
   - after "Discard", nothing on screen offers the way back.

## 0.9: Inspect parity

- Effects: shadows, blurs, filters, gradients.
- On a grid: the track lines drawn on the page, and `justify-content` and
  `align-content`.
- Colour format switch (hex, rgb, hsl) and contrast ratio.
- "Copy as CSS" for the element's declared styles.
- Assets: copy an SVG, download an image, show its natural size.
- States: the `:hover`, `:focus` and `:disabled` rules that apply to the
  element, read from the stylesheets.
- Keyboard navigation to parent, child and sibling.

## 1.0: Agent bridge

- The `gromajs` command gains a local endpoint and an MCP server, so an agent
  pulls the live changes with no copy and paste. This lives in the command,
  so it adds nothing to the script on the page.
- Component readers for Vue and Svelte, mainly for the source paths they
  expose in development builds.
- The export format and `window.Groma` are frozen as the 1.0 contract.

## Staying light

- No dependencies in `dist/`, no framework, one file. These rules are what
  keep the script small: in-page tools with a panel are usually several
  times its size because they bundle a UI library.
- A ceiling for `dist/groma.js`: 60 KB gzipped at 1.0. Groma runs in
  development and staging builds, so the number is about staying an order of
  magnitude lighter than such tools, not about every byte. 0.7.1 is 43.8 KB.
- The changelog says what each release added to the size, so a feature that
  costs several KB is a decision someone saw.

## What stays out

- Writing the code or JSX. The export describes before → after and leaves
  the implementation to the agent and the project.
- Dragging elements to move or reorder them.
- Accounts, cloud sync and designer collaboration.
