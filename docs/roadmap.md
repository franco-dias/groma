# Roadmap

Where Groma is going. The goal: come as close as possible to Figma's inspect
panel on a live page, stay very light, and let a developer edit the page in
place and hand the changes to a coding agent.

What each shipped feature does is in [features.md](features.md). This file
lists what is planned, in order. Move an item to the changelog when it ships.

0.7 shipped the first part: edit in the Specs tab, the Edits tab with undo,
and "Copy edits" for a coding agent. 0.8 made editing closer to Figma's: drag
a number to change it, token suggestions while typing, and text edited right
on the page ([CHANGELOG.md](../CHANGELOG.md)).

## 0.9: Inspect parity

What Figma's inspect panel answers and Groma does not yet. In this order,
the small and sure ones first:

1. **Colour format and contrast.** A switch in the Colors block shows and
   copies colours as hex, rgb or hsl. The text colour gets its contrast ratio
   against the background behind it, with the WCAG level it meets.
2. **Copy as CSS.** One button copies the element's declared styles as CSS
   declarations: what the page's rules and its inline style say, not the
   hundreds of computed values.
3. **Effects.** Shadows, filters, backdrop filters and gradients as a block
   of their own, each part readable (offset, blur, spread, colour; the stops
   of a gradient), in place of two raw strings in the Layout block.
4. **Theme variables for shadows and transitions.** Where the page keeps
   its shadows, durations and easings in variables, they are offered while a
   shadow or a transition is being edited, and named where the element uses
   or matches one, as colour and length tokens already are.
5. **States.** The `:hover`, `:focus`, `:active` and `:disabled` rules that
   apply to the element, read from the stylesheets, as what each state
   changes.
6. **Assets.** For an image: its natural size beside the size shown, and its
   address to copy or download. For an inline SVG: copy its markup.
7. **Keyboard navigation.** With an element pinned: arrow keys move the pin
   to the parent, the first child and the siblings.
8. **Grid, the rest.** The track lines drawn on the page while a grid
   container is pinned, and `justify-content` and `align-content` as buttons
   when the tracks leave room to distribute.

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
  magnitude lighter than such tools, not about every byte. 0.8.0 is 48.3 KB.
- The changelog says what each release added to the size, so a feature that
  costs several KB is a decision someone saw.

## What stays out

- Writing the code or JSX. The export describes before → after and leaves
  the implementation to the agent and the project.
- Dragging elements to move or reorder them.
- Accounts, cloud sync and designer collaboration.
