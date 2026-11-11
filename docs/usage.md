# Using Groma

Everything about running Groma on a design file: the command, the script
tag, the settings, how components are found, the API for host pages and the
known limits. What each feature does is in [features.md](features.md).

## Open a file with one command

```bash
npx gromajs path/to/design.html
```

This serves the file's folder on `localhost:4777` with the inspector attached
to that page, and opens the browser. The file is not edited, and only your
machine can reach the server. Ctrl+C stops it. It needs
[Node.js](https://nodejs.org) 18.3 or newer and installs nothing in your
project.

| Option | What it does |
| --- | --- |
| `--copy=css\|sx` | What a click on a length copies (see [Settings](#settings)) |
| `--token-prefix=<prefix>` | Shows a theme path for tokens with this prefix |
| `--port=<number>` | The port to serve on; the default is 4777 |
| `--no-open` | Does not open the browser |
| `-h`, `--help` | Lists these options |

```bash
npx gromajs design.html --copy=sx --token-prefix=--ds-
```

In a clone of this repo, `npm run inspect -- <file.html>` does the same with
the inspector built from the source.

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

The script is also on npm, so it can be loaded from a CDN with no copy step.
Pin the version, so a later release cannot change a design file that already
works:

```html
<script src="https://cdn.jsdelivr.net/npm/gromajs@0.6.1/dist/groma.js"></script>
```

unpkg serves the same file at `https://unpkg.com/gromajs@0.6.1/dist/groma.js`.

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

## The side panel: push or float

The panel pushes the page aside by default, so it never covers what you are
inspecting. Groma does this by adding the panel's width to the page's right
margin on `<html>`, and puts the page's own value back when the panel closes.

Some pages look wrong when pushed: elements fixed to the right edge of the
window stay under the panel, and layouts sized in `vw` or chosen by media
queries still see the full window width. For those, open the » menu in the
panel and switch off "Push the page aside". The panel then floats over the
page. The choice is remembered for the site.

## The canvas: try any size

Open the » menu in the panel and choose "Show on a canvas". (Alt + Shift + G
opens the panel when nothing is pinned.) The page moves
into a frame that you can resize by its edges, like an artboard, with three
ready sizes in the toolbar (375, 768 and 1280 wide). The page inside lays
itself out for the frame, media queries included, and you inspect it as
usual. Zoom with the toolbar or Ctrl/⌘ + wheel; drag the canvas to move
around. Over the page a drag belongs to the page, so hold Space and drag, or
drag with the middle button, to move the canvas from there. The ✕ in the toolbar, or the same menu item, goes back to the page.
The choice and the size are remembered for the site.

The frame shows the page's own address again, so the page loads a second
time inside it: it makes its requests again and starts from a fresh state.
What you had open on the page (a dialog, a filled form) is not carried over.

Two kinds of page cannot be loaded in the frame by their address: a file
opened from disk (`file://`), and a page whose server forbids framing
(`X-Frame-Options: DENY`, or a CSP `frame-ancestors` that excludes the page
itself). For those the canvas fills the frame with a copy of the page as it
is open, which works without any step from you.

The page's scripts run again on that copy. If something shows twice or looks
wrong, and the page is a file from disk, click "Use the file…" in the toolbar
and pick the HTML file: the frame then gets the original. The browser asks
for the file again each time the canvas opens. Opening the file with
[the inspect command](#open-a-file-with-one-command) avoids both.

## Known limits

- On the canvas, Space does not scroll the page: it is the key that moves the
  canvas. The wheel still scrolls, Space still types in a field, and a tap of
  Space still presses a focused button or checkbox.
- The canvas loads the page a second time. For a file opened from disk and a
  page whose server forbids framing it shows a copy of the open page, on
  which the page's scripts run again; see
  [the canvas](#the-canvas-try-any-size). A reload on the canvas returns to
  the address in the address bar, not to a link followed inside the frame.
  A link in the frame that leads to another site cannot be shown.
- Push mode moves only what is laid out in normal flow; see
  [the side panel](#the-side-panel-push-or-float).
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
- Elements inside the page's own iframes and other shadow roots are not
  inspected.
