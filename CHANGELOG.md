# Changelog

All notable changes to this package are recorded here. Versions follow
[semantic versioning](https://semver.org).

## Unreleased

- Changed: the tagline is now "Survey any HTML design before you build it." in
  the README, the package description and the landing page. Groma works on any
  HTML page, not only on designs made with AI.
- Changed: the README shows two screenshots, the inspector and the canvas.

## 0.6.2 (2026-11-11)

No code changes: the script is identical to 0.6.1. This release updates what
the npm page shows.

- Changed: the tagline, in the README and the package description: "Survey the
  AI design piece before you build it."
- New, in the repository only: `landing/`, the landing page, a static site in
  English and Brazilian Portuguese. It is not part of the package.

## 0.6.1 (2026-11-10)

- Changed: a new logo, the one the landing page uses: a groma seen from the
  side, in blue on a dark tile. The files in `docs/images/` keep their names.

- Fixed: on a page that replaces its `<body>` or its whole document after it
  loads, as a self-unpacking design export does, the inspector's launcher and
  panel were thrown away with the old content and never came back. Groma now
  puts itself back.

## 0.6.0 (2026-11-10)

- New: `npx gromajs <file.html>` opens any HTML design file with Groma
  attached, with nothing to clone or install. It serves the file's folder on
  `localhost`, does not edit the file, and takes the options the repo's
  `npm run inspect` always had (`--copy`, `--token-prefix`, `--port`,
  `--no-open`), plus `--help`. The package now ships the command beside the
  script and needs Node.js 18.3 or newer to run it.

## 0.5.0 (2026-11-10)

- New: canvas mode. "Show on a canvas" in the » menu puts the page in a frame
  on a canvas, like an artboard: drag its edges to try any width and height,
  pick 375, 768 or 1280 from the toolbar, zoom with Ctrl/⌘ + wheel and drag
  the canvas to move around. Space + drag and a middle-button drag move the
  canvas from over the page too. The page lays itself out for the frame, media
  queries included, and inspecting works as on the page, in the page's own
  pixels at any zoom. The choice and the size are remembered. The page loads
  a second time inside the frame. A file opened from disk and a page whose
  server forbids framing are shown from a copy of the open page; for a file,
  "Use the file…" in the toolbar loads the original HTML instead.
- New: the side panel slides in and out instead of appearing at once, and in
  push mode the page moves aside with it. It follows the system's "reduce
  motion" setting.
- New: Alt + Shift + G opens the side panel with nothing pinned, and closes
  it again. The » menu and the reference are then reachable before an element
  is pinned.

## 0.4.0 (2026-11-10)

- New: the side panel pushes the page aside instead of covering it, and the
  » menu has a "Push the page aside" switch to float it again. The choice is
  remembered. Push is the default, so the panel no longer hides the right
  edge of the page. Groma adds the panel's width to the page's `margin-right`
  on `<html>` and restores the page's value when the panel closes. Elements
  fixed to the right edge, `vw` layouts and media queries still see the full
  window; float is for those pages.
- Fixed: a page element fixed at the highest z-index, added after Groma, could
  cover the panel, the launcher and the outlines. Groma now sits in the
  browser's top layer, above every z-index. Browsers without the Popover API
  keep the old behaviour.
- Fixed: hover outlines now redraw when the page moves the hovered element
  under a still pointer (a pushed layout, a scroll), instead of staying where
  the element was.

## 0.3.1 (2026-11-10)

No code changes: the script is identical to 0.3.0. This release updates the
README that the npm page shows.

- Changed: a heavier logo. The mark sits on a dark tile, with a thick bar and
  staff against thin plumb lines, solid plumb bobs and a red dimension line.
- New: a horizontal logo with the name, in Geist SemiBold, in a light and a dark
  version (`docs/images/`). The README shows it as its title and follows the
  reader's theme.

## 0.3.0 (2026-11-10)

Made for any project: nothing about a framework or a design system is
assumed by default.

- New: a logo (`docs/images/`), animated and static.
- New: a Reference tab with every shortcut and trick, opened from the »
  menu in the tab bar. "Collapse panel" moved into the same menu.
- Fixed: the grid only showed on dark boards. It now shows on any
  background, and no longer spills over the page around the board.
- The npm package is `gromajs`: npm refused `groma` as too close to existing
  names. The product, the file and the global keep the name Groma.
- Licensed under MIT.
- **Renamed to Groma.** Before the first publication, so there is no alias:
  the product is Groma, the file `dist/groma.js`, the global
  `window.Groma`, the host element `<groma-inspector>`, the script-tag
  marker `data-groma` and the storage keys `__groma_*`. Edits saved under
  the old `__live_inspector_*` keys are not carried over.

- **Changed**: a click on a length now copies CSS (`24px`,
  `padding: 12px 16px`). The earlier form (`24`, `py: 12, px: 16`) is the
  `sx` copy format: `data-copy="sx"` on the script tag.
- **Changed**: a token's theme path is shown only for prefixes the page
  configures (`data-token-prefix`). No prefix is built in any more.
- **Changed**: the component block shows the component's name and a list of
  the props the design passes. It no longer writes a JSX line: the design
  may pass props a project's own component does not accept.
- New: `npm run inspect -- <file.html>` opens any HTML file with the
  inspector attached, without editing it.
- New: `Groma.configure()` and the script-tag settings.
- New: components can be declared in the markup (`data-component`,
  `data-source`, `data-props`), and custom elements are recognised as
  components. React pages work as before.

- Browser tests for the inspector's behaviour (`tests/`, 88 tests), run
  headless in the installed Chrome. `npm test` runs them with the unit
  tests; `test:unit` and `test:browser` run one kind.
- `docs/features.md` describes every feature with its rules, code and
  tests; `AGENTS.md` gives maintainers the context and the development
  rules.

## 0.2.0

The interface was redesigned from the "Inspector States" design file.

- New visual language: one set of design tokens (`src/styles/tokens.css`),
  sans-serif labels with monospace values, type sizes 10 to 13 px.
- Panel: segmented tab bar, an action bar with unit and grid switches and
  icon actions, a 28px rail when collapsed. Width is limited to 320–560px.
- Specs: element header with a breadcrumb and a collapsible class list,
  component block with copyable JSX and source path, sizing-intent glyphs,
  a box diagram, token rows (theme path, CSS variable, value per theme,
  "Matches token" and "No token" states), typography block, motion rows
  with easing curves, and a comparison block with A and B.
- Overlays: name tag on the pinned outline, a name chip in place of the
  text tooltip, distance lines with end caps and labels that move beside
  short lines, a grid that shows on light and dark pages.
- New: a launcher pill at the bottom right that locks inspect mode on.
- Layers under the pointer now list each layer's size.
- Changes tab: empty and "not an export" states, expandable changed boards.
- Copy feedback is a tint and a "Copied" mark that add no size.

## 0.1.0

First packaged version.

- Inspect mode: box model overlay, tooltip, distances from the pinned
  element, layers-under-pointer menu.
- Side panel docked to the right, with Specs, All CSS, Layers and Changes
  tabs.
- Specs: component and props, sizing intent, artboard position, design
  tokens with MUI theme paths and per-theme values, px/rem, grid, compare,
  copy link, colour picker.
- All CSS: editable values, saved per page and replayed on load.
- The inspector's UI now lives in a shadow root, so page styles and
  inspector styles no longer affect each other.
