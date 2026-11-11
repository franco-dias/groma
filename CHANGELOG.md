# Changelog

All notable changes to this package are recorded here. Versions follow
[semantic versioning](https://semver.org).

## 0.7.0 (2026-11-11)

- Changed: saved edits are no longer put back on the page by themselves, on
  load or when an element is pinned. On a page that renders late only some of
  them came back. When a page loads with saved edits, the panel now shows a bar
  under the tabs with their number, with "Apply" to put them back and
  "Discard" to remove them.
  `Groma.replayOverrides()` works as before.
- New: the Edits tab lists everything you changed on the page, on any
  element, as before → after, with a ↩ per line. It also shows while the
  panel is open with nothing pinned.
- New: "Copy edits" copies the list as one Markdown text for a coding agent:
  the page, the viewport, and per element its selector, component, source
  path, text and each edit as before → after. A new value that one of the
  page's tokens holds is marked with the token's name.
- New: edit in the Specs tab. A double-click on a value that is one CSS
  property (width, height, gap, radius, a side of margin or padding, a colour,
  the font size and the rest of the typography) turns it into a field. Enter
  applies, Esc cancels, the arrow keys change a number, and a bare number
  means pixels. A single click still copies.
- New: the Box block of the Specs tab names the element's `box-sizing`.
- New: fixed, hug and fill can be chosen. A click on the word beside the size
  opens a menu; the choice sets the width or height, and `flex-grow` or
  `align-self` in a flex parent, as one step to undo.
- New: a flex container shows its direction, `justify-content` and
  `align-items` as buttons to click, in place of the Direction, Align and
  Justify text. Each row says whether it works along or across the direction,
  and the drawings turn with the direction. `space-between`, `space-around`
  and `space-evenly` are a menu on the Justify row, each named with its
  property.
- New: a grid container shows `justify-items` and `align-items` as the same
  buttons, named "across each cell" and "down each cell".
- New: a grid's columns and rows are listed one by one. − and + remove or add
  a track; a double-click on a size edits it; the drawing before it makes the
  track fixed, hug (`auto`) or fill (`1fr`). Rows show when the page declares
  them. A list such as `repeat(auto-fill, …)` stays one text value, with the
  number of tracks laid out.
- New: fixed, hug and fill work on an item of a grid, with `justify-self` and
  `align-self`. An item that fills its cell now reads "fill" on both axes; the
  height read "hug" before.
- New: an item placed in a grid by hand shows its `grid-column` and
  `grid-row`, to edit.
- Fixed: "fill" was shown for the width of every absolutely positioned
  block. An absolute or fixed element now reads "fill" only on an axis where
  both of its sides are set.
- New: a double-click on "margin" or "padding" in the box diagram edits all
  four sides at once.
- Changed: in the Specs tab, values that only copy are dimmed and values that
  can be edited are tinted under the pointer. Width and height stand further
  apart.
- Fixed: a size declared with `fit-content`, `max-content` or `min-content`
  was reported as "fill" on a block element. It is "hug".
- New: notes. Write an instruction on the pinned element in the Edits tab; it
  is saved and copied with the edits.
- New: undo and redo for edits, notes and resets, with the buttons in the
  Edits tab or Ctrl/⌘ + Z in the panel. A reload keeps the edits and forgets
  the steps.
- New: the eye in the Edits tab shows the page without your edits, and brings
  them back.
- Changed: a value the browser would ignore is no longer saved as an edit, and
  `!important` typed after a value is applied. Saved edits are put back each
  time an element is pinned, for pages that render late or again. An edit the
  browser refuses to store is kept in memory until the page goes away.
  Resetting the only edit of an element leaves no empty `style` attribute.
- New storage keys: `__groma_before:<path>` (what the page had before an
  edit) and `__groma_notes:<path>`. Edits saved by earlier versions still
  work; they are listed without a "before".
- New: [docs/roadmap.md](docs/roadmap.md), what is planned and in what order.

- Changed, landing page: on a device with only touch (no mouse or trackpad)
  the page no longer loads Groma, and shows the npm button where "Try it
  here" was.
  The shortcuts section's subtitle there says a keyboard and a mouse or
  trackpad are needed, instead of pointing to a pill that is not on the page.

## 0.6.3 (2026-11-10)

No code changes: the script is identical to 0.6.2. This release updates what
the npm page and the landing page say.

- Changed: the tagline is now "Inspect any web page like a design file." in
  the README, the package description, the landing page and the page title.
  Groma works on any web page, an app or a design handoff, not only on designs
  made with AI. The README, the landing page and the package keywords follow.
- New: `docs/usage.md` has a section on using Groma on an app: where to add
  the script, the Content Security Policy, and why a minified production
  build shows no React component names.
- Changed, landing page: the command line on a phone is as wide as its text,
  not the full width, and the intro text no longer touches the screen's
  edges. The use cases have a fourth card, "Audit an app that's
  already built", and the command shows `your-page.html`.
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
