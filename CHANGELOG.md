# Changelog

All notable changes to this package are recorded here. Versions follow
[semantic versioning](https://semver.org).

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

First packaged version, moved out of the `cadence-hub` design canvas.

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
