# Changelog

All notable changes to this package are recorded here. Versions follow
[semantic versioning](https://semver.org).

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
