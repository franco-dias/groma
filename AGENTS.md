# live-inspector: guide for agents

Read this before changing anything. It is the context a new maintainer
needs and the rules that keep the project working.

## What this is

A Figma-style inspector for design handoff pages. One script, added to any
HTML page, lets an engineer hover and pin elements to read their box model,
specs, design tokens and distances.

- **Users**: React engineers on MUI who build a design from an HTML handoff,
  mainly Claude Design exports. One MUI spacing step is 1px for them, so
  lengths are shown and copied as bare numbers.
- **How it ships**: `dist/live-inspector.js`, one self-contained file, to be
  served from a CDN and attached to exported design pages.
- **Where it runs**: inside pages we do not control. This shapes most of
  the rules below.

What each feature does, with the rules it must keep, is in
[docs/features.md](docs/features.md). The file map and the scripts are in
[README.md](README.md). Read the feature's section before you touch it.

## Commands

```bash
npm run serve        # demo page with live reload
npm test             # unit + browser tests
npm run typecheck
npm run build        # typecheck, then dist/live-inspector.js
```

Before you say a change is done: `npm test` and `npm run build` both pass.
The browser tests need Google Chrome installed; they do not download one.

## Rules

### The script is a guest on someone else's page

1. **No runtime dependencies and no frameworks.** The build must stay one
   file with nothing to load. React was considered and rejected for size;
   do not add it, or any dependency that ends up in `dist/`, without the
   owner asking.
2. **All UI lives in the shadow root.** Create top-level nodes with
   `mount()` from `src/root.ts`. Never append inspector nodes to the page's
   DOM, and never add styles to the page.
3. **One global: `window.LiveInspector`.** Nothing else on `window`.
4. **Do nothing until the user inspects.** With Alt up and the lock off,
   the page must behave exactly as without the script. The only standing
   UI is the launcher pill.
5. **Never change the page except for the user's own edits**, and keep what
   the page had so Reset can restore it (`src/edits/overrides.ts`).
6. **The page changes under you.** Pages re-render and replace elements;
   boards render late; `<body>` may not exist yet at start. Check
   `isConnected`, use `whenBodyExists`, and never assume an element found
   earlier is still there.
7. **Fail quietly, never break the page.** Storage can be blocked,
   stylesheets can be cross-origin, the clipboard can refuse. Catch these
   where they happen and carry on.

### Shadow DOM gotchas

- An event that starts inside the inspector reaches `document` listeners
  with the host element as its target. Use `isOwn(target)` to skip the
  inspector's own UI, and `event.composedPath()` when you need the real
  target.
- `document.querySelector` does not see the inspector's nodes. Hold
  references, or query the shadow root.

### Pixels

- Boards are shown zoomed with CSS transforms. `getBoundingClientRect()`
  is in screen pixels; computed styles and `offsetWidth` are in board
  pixels. Use `scaleOf()` and `layoutSize()` from `src/dom.ts`; never mix
  the two by hand.
- Anything shown to the user (sizes, distances, positions) is in board
  pixels.

### Architecture

- `src/main.ts` only starts features. Features do not import each other's
  internals.
- The pinned element lives in `src/selection.ts`. Code that picks an
  element calls `pin()`; code that shows it subscribes with
  `onSelection()`. After an edit or an option change, call `rerender()`.
- A panel tab is one file that implements `Tab` (`src/panel/tab.ts`) and is
  listed in `src/panel/panel.ts`. Tabs do not import each other.
- Logic that needs no page (formatting, parsing, comparing) goes in
  `src/specs/` or a plain module, with a unit test beside it.
- Markup goes in `src/panel/panel.html`; styles in `src/styles/`. Do not
  build static markup or set static styles from TypeScript.

### Design

- Colours, spacing, radii and fonts come from the variables in
  `src/styles/tokens.css`. Do not write a colour or a spacing value
  anywhere else.
- Type sizes are 10, 11, 12 and 13px only; weights 400, 500, 600. Labels
  are sans-serif, values monospace. Hierarchy comes from colour and
  spacing, not size.
- The panel must work between 320 and 560px wide with no horizontal
  scroll.
- Feedback must not move things: copy marks and states add no size.
- The source design is the "Inspector States" file (not in this repo). The
  product departs from it on purpose in four places, which the owner knows;
  do not "fix" them:
  - the All CSS tab stays an editable list of computed properties;
  - hover keeps the coloured box-model overlay, with the name chip;
  - the collapsed panel is a rail that expands on click, with no tab
    sticking out of its edge;
  - a distance label that does not fit its line moves beside it,
    alternating sides.

### Tests

- A behaviour change and its test go in the same commit. A bug fix comes
  with the test that would have caught it.
- Browser tests (`tests/`) drive the inspector as a user does and read its
  UI. Use the helpers in `tests/helpers.ts`; call `reset()` in
  `beforeEach`, because the inspector is one instance per test file.
- The outline and the grid are placed on animation frames: `await
  frames()` before measuring them.
- Do not weaken a test to make it pass. If a test is wrong, say why in the
  commit.
- After writing a test for a fix, break the fix once and confirm the test
  fails.

### Compatibility you must not break silently

- **`window.LiveInspector`** (`LiveInspectorApi` in `src/main.ts`): another
  project calls it. Removing or changing a method is a major version.
- **Storage keys**: `__live_inspector_overrides:<path>`,
  `__live_inspector_html:<path>` and `__live_inspector_panel`. Renaming
  one loses users' saved edits; migrate, or do not rename.
- **Saved selectors** (`src/edits/selector.ts`): changing their shape
  orphans saved edits.
- **Claude Design export format**: `BOARD_SELECTOR`, `#dc-data` and the
  `@ds-bundle` header are read as they are today. If an export changes
  shape, support both shapes.
- **React internals**: component detection reads `__reactFiber$…`. It is
  unofficial; keep it defensive and never let it throw.

### Writing

- Every source file opens with a comment that says what the feature does
  for the user. Keep it true when you change the file.
- Comments explain why, in plain English. A known limit is marked
  `shortcut: <the limit>, <when to upgrade>`; keep those markers.
- Update [docs/features.md](docs/features.md) and
  [CHANGELOG.md](CHANGELOG.md) with the change.

### Releasing

- Versions follow semver; `npm version` bumps, commits and tags.
- The package is `"private": true` with no licence chosen. Do not publish,
  push to a remote or change the licence unless the owner asks.

## Known limits

Listed in the README. The ones most likely to bite:

- Token lookup takes the last matching declaration and ignores selector
  specificity (`src/page-styles.ts`).
- Sizing intent is inferred; grid children are treated as plain blocks.
- The colour picker is Chromium-only and has no test.
- Tests run in Chrome only, with synthetic events.
- Elements inside iframes and other shadow roots are not inspected.

## Trying a change on a real handoff

The demo page (`npm run serve`) covers most cases. For a real export, build
and add `<script src="…/dist/live-inspector.js"></script>` as the first tag
in the `<head>` of a copy of the export, then open it over HTTP. Exports
render boards only when they scroll into view.
