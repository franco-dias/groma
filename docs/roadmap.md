# Roadmap

Where Groma is going. The goal: come as close as possible to Figma's inspect
panel on a live page, stay very light, and let a developer edit the page in
place and hand the changes to a coding agent.

What each shipped feature does is in [features.md](features.md). This file
lists what is planned, in order. Move an item to the changelog when it ships.

0.7 shipped the first part: edit in the Specs tab, the Edits tab with undo,
and "Copy edits" for a coding agent ([CHANGELOG.md](../CHANGELOG.md)).

## 0.8: Edit like Figma

- Drag a number to scrub it.
- Suggest the page's tokens while typing a value, and when picking a colour.
- Double-click text on the page to edit it in place.

## 0.9: Inspect parity

- Effects: shadows, blurs, filters, gradients.
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

- A size budget for `dist/groma.js`: 40 KB gzipped. 0.7.0 is 39.6 KB, so
  the next features need the budget raised or something trimmed first. The
  build does not check it yet.
- No dependencies in `dist/`, as today.

## What stays out

- Writing the code or JSX. The export describes before → after and leaves
  the implementation to the agent and the project.
- Dragging elements to move or reorder them.
- Accounts, cloud sync and designer collaboration.
