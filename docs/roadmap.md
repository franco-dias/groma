# Roadmap

Where Groma is going. The goal: come as close as possible to Figma's inspect
panel on a live page, stay very light, and let a developer edit the page in
place and hand the changes to a coding agent.

What each shipped feature does is in [features.md](features.md). This file
lists what is planned, in order. Move an item to the changelog when it ships.

0.7 shipped the first part: edit in the Specs tab, the Edits tab with undo,
and "Copy edits" for a coding agent. 0.8 made editing closer to Figma's: drag
a number to change it, token suggestions while typing, and text edited right
on the page. 0.9 closed the gap to Figma's inspect panel: colour formats and
contrast, Copy CSS, effects, states, assets, theme variables for shadows and
transitions, keyboard navigation and grid track lines. 1.0 added the agent
bridge (a local endpoint and an MCP server in the `gromajs` command, so an
agent reads the live edits with no copy and paste), component readers for
Vue, Svelte and Angular, and froze the contract in
[contract.md](contract.md) ([CHANGELOG.md](../CHANGELOG.md)).

Nothing is planned after 1.0 yet.

## Staying light

- No dependencies in `dist/`, no framework, one file. These rules are what
  keep the script small: in-page tools with a panel are usually several
  times its size because they bundle a UI library.
- A ceiling for `dist/groma.js`: 60 KB gzipped. Groma runs in
  development and staging builds, so the number is about staying an order of
  magnitude lighter than such tools, not about every byte. 1.0.1 is 58.5 KB.
- The changelog says what each release added to the size, so a feature that
  costs several KB is a decision someone saw.

## What stays out

- Writing the code or JSX. The export describes before → after and leaves
  the implementation to the agent and the project.
- Dragging elements to move or reorder them.
- Accounts, cloud sync and designer collaboration.
