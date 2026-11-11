# Roadmap

Where Groma is going. The goal: come as close as possible to Figma's inspect
panel on a live page, stay very light, and let a developer edit the page in
place and hand the changes to a coding agent.

What each shipped feature does is in [features.md](features.md). This file
lists what is planned, in order. Move an item to the changelog when it ships.

## 0.7: Copy changes for an agent

The loop that does not exist yet: edit the page, then hand over what changed.

- **Page-wide change list.** Every edited element with before → after per
  property, a reset per item, and a before/after toggle for the whole page.
- **Copy changes.** One Markdown block an agent can act on. Per element: the
  selector, the component's name, its source path when the page gives one, a
  snippet of its text, and each property's before → after. Also the page's
  address and the viewport size.
- **Token names in the export.** When a new value matches a token, the export
  says so (`16px`, matches `--space-4`), so the agent uses the token and not
  a raw value.
- **Notes.** A plain-text instruction attached to an element ("make this
  sticky"), with no edit needed. It travels in the same export.
- **Undo and redo.**

## 0.8: Edit like Figma

- Edit values in the Specs tab, not only in All CSS.
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

- A size budget for `dist/groma.js`, checked by the build: 40 KB gzipped
  (0.6.3 is 31 KB).
- No dependencies in `dist/`, as today.

## What stays out

- Writing the code or JSX. The export describes before → after and leaves
  the implementation to the agent and the project.
- Dragging elements to move or reorder them.
- Accounts, cloud sync and designer collaboration.
