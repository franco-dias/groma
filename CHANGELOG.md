# Changelog

All notable changes to this package are recorded here. Versions follow
[semantic versioning](https://semver.org).

## Unreleased

Made for any project: nothing about a framework or a design system is
assumed by default.

- Licensed under MIT.
- **Renamed to Groma.** Before the first publication, so there is no alias:
  the package is `groma`, the file `dist/groma.js`, the global
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
