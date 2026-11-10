# live-inspector

A Figma-style inspector for design handoff pages. Add one script to any HTML
page and inspect it the way you would inspect a frame in Figma's Dev Mode:
box model, specs, design tokens and distances.

It is built for engineers who implement a design from an HTML handoff (for
example a Claude Design export) in React and MUI, and it has no runtime
dependencies.

## Use it

```html
<script src="live-inspector.js"></script>
```

Put the tag anywhere in the page, `<head>` included. Then:

| Keys | What happens |
| --- | --- |
| Alt + hover | The hovered element's box model and a tooltip |
| Alt + click | Pins the element and opens the side panel |
| Alt + hover, with an element pinned | Distances from the pinned element |
| Alt + right-click | A menu of every layer under the pointer |

The side panel has four tabs:

- **Specs**: component and props, size and sizing intent (fixed, hug, fill),
  position on the artboard, spacing, colours, font, motion. Design tokens
  appear beside the values, with their MUI theme path and their value in each
  theme. A click copies a value in the form `sx` takes. The toolbar switches
  px and rem, shows a grid, compares two elements, copies a link to the
  element and picks a colour from the screen.
- **All CSS**: every computed property. Values are editable; edits are saved
  in the browser and replayed on reload.
- **Layers**: the artboard's element tree.
- **Changes**: on a Claude Design export, compares the page with an older
  export file.

Pages that re-render can call `window.LiveInspector`; see `LiveInspectorApi`
in [src/main.ts](src/main.ts).

## Develop

```bash
npm install
```

```bash
npm run serve
```

`serve` opens a demo page ([index.html](index.html)) that loads the source
directly and reloads on every change.

| Script | What it does |
| --- | --- |
| `npm run serve` | Demo page with live reload |
| `npm run build` | Typechecks, then writes `dist/live-inspector.js` (one file, styles and markup inlined) |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit tests for the pure logic |

## How the code is organised

Start at [src/main.ts](src/main.ts): it only starts the features.

| Path | What lives there |
| --- | --- |
| `src/selection.ts` | The pinned element. Pickers call `pin`; views subscribe |
| `src/options.ts` | What the user switched on in the panel |
| `src/root.ts` | The shadow root that isolates the inspector from the page's CSS |
| `src/overlay/` | Inspect mode: hover boxes, distances, tooltip, layer menu |
| `src/outlines.ts` | Outline of the pinned element, hover outline, grid |
| `src/panel/` | The side panel, its markup (`panel.html`) and one file per tab |
| `src/specs/` | What the Specs tab knows: sections, tokens, colours, units, sizing, components |
| `src/edits/` | Saved edits: selectors, storage, apply and replay |
| `src/export-diff.ts` | Comparing two Claude Design exports |
| `src/styles/` | The stylesheets, one per area |

Each tab implements the small `Tab` interface in
[src/panel/tab.ts](src/panel/tab.ts); adding a tab means adding a file and
one entry in [src/panel/panel.ts](src/panel/panel.ts).

## Release

The version lives in `package.json` and follows semantic versioning. Record
what changed in [CHANGELOG.md](CHANGELOG.md), then:

```bash
npm version minor
```

`npm version` bumps the version, commits and tags. `npm publish` runs the
tests and the build first (`prepublishOnly`) and ships only `dist/`.

The package is marked `"private": true` and `"license": "UNLICENSED"` until a
licence is chosen; remove `private` to publish. Once published, jsDelivr and
unpkg serve the file:

```html
<script src="https://cdn.jsdelivr.net/npm/live-inspector@0.1.0/dist/live-inspector.js"></script>
```

## Known limits

- Token lookup takes the last matching declaration in source order and
  ignores selector specificity.
- The Changes tab compares lines without their order, so a line that only
  moved is not reported.
- The colour picker needs a Chromium browser.
- Elements inside iframes and other shadow roots are not inspected.
