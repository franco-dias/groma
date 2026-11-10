# Developing Groma

How to set up, run, test, find your way around the code and release. The
rules for changing the code are in [AGENTS.md](../AGENTS.md); read them
first.

## Set up

You need [Node.js](https://nodejs.org) 22.12 or newer (20.19 or newer on the
20 line also works) and npm. The browser
tests also need Google Chrome installed.

```bash
npm install
```

```bash
npm run build
```

The build writes `dist/groma.js` (about 100 KB, 30 KB gzipped) with
the styles and the panel markup inlined, plus a source map.

## Scripts

```bash
npm run serve
```

`serve` opens a demo page ([index.html](../index.html)) that loads the source
directly and reloads on every change. The demo has two cards, a light and a
dark theme scope, tokens, and one colour with no token.

| Script | What it does |
| --- | --- |
| `npm run serve` | Demo page with live reload |
| `npm run inspect -- <file.html>` | Opens any HTML file with the inspector attached |
| `npm run build` | Typechecks, then writes `dist/groma.js` |
| `npm run typecheck` | TypeScript only |
| `npm test` | Every test: unit and browser |
| `npm run test:unit` | Pure logic only, in Node; fast |
| `npm run test:browser` | Behaviour on a real page, headless in Chrome |

## Tests

There are two kinds, and `npm test` runs both.

- **Unit tests** sit next to the code (`src/**/*.test.ts`) and cover the
  logic that needs no page: units, colours, theme paths, motion, the export
  comparison.
- **Browser tests** live in `tests/` and cover what the inspector does on a
  page: inspect mode, measuring, the panel and each tab, tokens, edits and
  their replay, layers, the launcher. They run in a real browser because the
  behaviour depends on layout, computed styles and events. Each test builds
  a small page, drives the inspector as a user does (Alt, hover, click) and
  reads its UI. [tests/helpers.ts](../tests/helpers.ts) has the vocabulary.

The browser tests use the Google Chrome installed on the machine, so there
is no browser download. When a behaviour changes on purpose, change its test
in the same commit; when you fix a bug, add the test that would have caught
it.

## How the code is organised

Start at [src/main.ts](../src/main.ts): it only starts the features.

| Path | What lives there |
| --- | --- |
| `src/selection.ts` | The pinned element. Pickers call `pin`; views subscribe |
| `src/options.ts` | What the user switched on in the panel |
| `src/root.ts` | The shadow root that isolates the inspector from the page's CSS |
| `src/page.ts` | The page being inspected: this document, or the canvas frame's. Its document, its listeners and where its elements are on screen |
| `src/canvas/` | Canvas mode: the page in a frame to resize and zoom; `view.ts` holds the arithmetic |
| `src/overlay/` | Inspect mode: hover boxes, distances, name chip, layer menu |
| `src/outlines.ts` | Outline and name tag of the pinned element, hover outline, grid |
| `src/launcher.ts` | The launcher pill and the inspect lock |
| `src/panel/` | The side panel, its markup (`panel.html`) and one file per tab |
| `src/config.ts` | The settings a page can give the inspector |
| `src/specs/` | What the Specs tab knows: sections, tokens, colours, units, sizing, motion |
| `src/specs/components/` | One reader per way a page can name its components |
| `src/edits/` | Saved edits: selectors, storage, apply and replay |
| `src/export-diff.ts` | Comparing two Claude Design exports |
| `src/icons.ts` | The icons, as SVG drawings |
| `src/styles/` | The stylesheets, one per area; `tokens.css` holds every colour and size |
| `scripts/` | `inspect.mjs`, the command that opens a file with the inspector attached |
| `tests/` | Browser tests, one file per feature |
| `docs/features.md` | Every feature and the rules it follows |

Each tab implements the small `Tab` interface in
[src/panel/tab.ts](../src/panel/tab.ts); adding a tab means adding a file and
one entry in [src/panel/panel.ts](../src/panel/panel.ts).

If you are going to change the code, read [AGENTS.md](../AGENTS.md) first. It
holds the rules that keep the inspector safe to run on pages it does not
control, and it is written for AI agents and people alike.

## Release

The version lives in `package.json` and follows semantic versioning. Record
what changed in [CHANGELOG.md](../CHANGELOG.md), then:

```bash
npm version minor
```

`npm version` bumps the version, commits and tags. `npm publish` runs the
tests and the build first (`prepublishOnly`) and ships only `dist/`.

Publishing is a deliberate step. Before it, `npm run release:check` does everything
`npm publish` would (tests, build, packing) without publishing, and lists the
files that would ship.

1. Move the "Unreleased" notes in [CHANGELOG.md](../CHANGELOG.md) under the new
   version and date.
2. `npm version <patch|minor|major>` sets the version, commits and tags.
3. `npm run release:check`, then `npm publish` (you need to be logged in to
   npm, with two-factor authentication on).
4. `git push --follow-tags`.

A published version can never be reused, and unpublishing is restricted. Fix
mistakes with a new version.
