# Using Groma

Everything about running Groma on a design file: the command, the script
tag, the settings, how components are found, the API for host pages and the
known limits. What each feature does is in [features.md](features.md).

## Open a file with one command

From this repo, after [setting up](development.md#set-up):

```bash
npm run inspect -- path/to/design.html
```

This builds the inspector, serves the file's folder on `localhost:4777`
with the inspector attached to that page, and opens the browser. The file
is not edited, and only your machine can reach the server. Ctrl+C stops it.

| Option | What it does |
| --- | --- |
| `--copy=css\|sx` | What a click on a length copies (see [Settings](#settings)) |
| `--token-prefix=<prefix>` | Shows a theme path for tokens with this prefix |
| `--port=<number>` | The port to serve on; the default is 4777 |
| `--no-open` | Does not open the browser |

```bash
npm run inspect -- design.html --copy=sx --token-prefix=--ds-
```

Edits made in the All CSS tab are stored per address, so keep the same
port to find them again.

## Add the script to the file

You need the built script, `dist/groma.js`. Build it once (see
[Set up](development.md#set-up)), then:

1. Copy `dist/groma.js` next to your HTML file.
2. Add the script as the first tag inside `<head>`:

   ```html
   <head>
     <script src="groma.js"></script>
     …
   </head>
   ```

3. Open the file in a browser. A pill reading "Inspect" appears at the
   bottom right. Hold Alt and move the pointer over the design.

Notes:

- It works on a file opened from disk (`file://`) and on a served page.
- Use Chrome or another Chromium browser. Others are untested, and the
  colour picker only exists in Chromium.
- On a Claude Design export, boards render when they scroll into view;
  scroll to a board before inspecting it.
- Edits you make in the All CSS tab are stored in that browser only. They
  do not change the file.

Once the package is published to npm, the script can also be loaded from a
CDN with no copy step:

```html
<script src="https://cdn.jsdelivr.net/npm/groma@0.2.0/dist/groma.js"></script>
```

The package is not published yet (see [Release](development.md#release)).

A list of every shortcut is also inside the inspector: open the » menu in
the panel's tab bar and choose "Shortcuts and tips".

## Settings

Optional. Put them on the script tag:

```html
<script src="groma.js" data-copy="sx" data-token-prefix="--ds-"></script>
```

| Attribute | Values | What it changes |
| --- | --- | --- |
| `data-copy` | `css` (default), `sx` | What a click on a length copies. `css`: `24px` and `padding: 12px 16px`. `sx`: `24` and `py: 12, px: 16`, for styling libraries that take style objects where a bare number means pixels |
| `data-token-prefix` | one or more prefixes, separated by spaces | Tokens with that prefix also show their path in the theme object the variables mirror: with `--ds-`, `--ds-color-text-primary` shows `color.text.primary` |

The same settings can be changed from code with
`Groma.configure({ copyFormat: "sx", tokenPrefixes: ["--ds-"] })`.

## Components

The Specs tab names the component an element belongs to when the page says
which it is. There are three ways, checked in this order:

1. **The markup declares it.** Any tool or framework can add:

   ```html
   <div data-component="Card" data-source="ui/Card.tsx" data-props='{"tone":"dark"}'>
   ```

2. **The page's UI framework knows it.** Supported today: pages rendered
   with React.
3. **The element is a custom element.** `<my-card tone="dark">` is a
   component by definition: the tag is its name, the attributes its props.

A page that says nothing about components shows no component block;
everything else works the same.

Groma lists the props as the design passes them. It does not write the code
for you: a design may use a prop your own component does not accept, and
only your codebase knows that.

## For pages that re-render

A page can talk to the inspector through `window.Groma`:

| Method | What it does |
| --- | --- |
| `pin(el)` | Pins an element, as Alt + click does |
| `pinnedElement()` | The pinned element, or `null` |
| `replayOverrides(root?)` | Re-applies saved edits to the page, or inside `root` |
| `highlight(el)` | Moves the pinned-element outline to `el` |
| `configure(settings)` | Changes the [settings](#settings); with no argument, restores the defaults |

## Known limits

- Token lookup takes the last matching declaration in source order and
  ignores selector specificity.
- Sizing intent (fixed, hug, fill) is inferred from styles; children of CSS
  grid are treated as plain blocks.
- Of the UI frameworks, only React pages are read for components; other
  pages can declare components in the markup (see [Components](#components)).
- The Changes tab compares lines without their order, so a line that only
  moved is not reported.
- The colour picker needs a Chromium browser. It has no test: the browser
  only opens it on a real click.
- The tests run in Chrome only; Firefox and Safari are not covered.
- Elements inside iframes and other shadow roots are not inspected.
