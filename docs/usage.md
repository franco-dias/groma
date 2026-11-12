# Using Groma

Everything about running Groma on a page: the command, the script
tag, the settings, how components are found, the API for host pages and the
known limits. What each feature does is in [features.md](features.md).

## Open a file with one command

```bash
npx gromajs path/to/page.html
```

This serves the file's folder on `localhost:4777` with the inspector attached
to that page, and opens the browser. The file is not edited, and only your
machine can reach the server. Ctrl+C stops it. It needs
[Node.js](https://nodejs.org) 18.3 or newer and installs nothing in your
project.

| Option                    | What it does                                                |
| ------------------------- | ----------------------------------------------------------- |
| `--copy=css\|sx`          | What a click on a length copies (see [Settings](#settings)) |
| `--token-prefix=<prefix>` | Shows a theme path for tokens with this prefix              |
| `--port=<number>`         | The port to serve on; the default is 4777                   |
| `--no-open`               | Does not open the browser                                   |
| `-h`, `--help`            | Lists these options                                         |

```bash
npx gromajs design.html --copy=sx --token-prefix=--ds-
```

In a clone of this repo, `npm run inspect -- <file.html>` does the same with
the inspector built from the source.

Edits made in the All CSS tab are stored per address, so keep the same
port to find them again.

## Add the script to a page

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
   bottom right. Hold Alt and move the pointer over the page.

Notes:

- It works on a file opened from disk (`file://`) and on a served page.
- Use Chrome or another Chromium browser. Others are untested, and the
  color picker only exists in Chromium.
- On a Claude Design export, boards render when they scroll into view;
  scroll to a board before inspecting it.
- Edits you make are stored in that browser only. They do not change the
  file. After a reload, click "Apply" in the panel to put them back.

The script is also on npm, so it can be loaded from a CDN with no copy step.
Pin the version, so a later release cannot change a page that already
works:

```html
<script src="https://cdn.jsdelivr.net/npm/gromajs@1.2.0/dist/groma.js"></script>
```

unpkg serves the same file at `https://unpkg.com/gromajs@1.2.0/dist/groma.js`.

## Use it on an app

The same script inspects an app that is already built. Add it to the app's
HTML in a development, preview or staging build, with the CDN tag above or a
copy of `dist/groma.js` that you serve yourself. `npx gromajs` serves files
only; it does not open a live address.

- **Keep it out of what end users load.** Add the tag behind a flag or in a
  non-production build.
- **A strict Content Security Policy can block the CDN.** Serve `groma.js`
  from your own origin and allow it in `script-src`.
- **Component names need a build that keeps them.** The React reader takes
  names that start with a capital letter, and a minified production build
  usually renames components to one or two letters, so none is shown. A
  development or staging build, a custom element or a `data-component`
  attribute still gives a name (see [Components](#components)).
- **The canvas needs a page that allows framing.** For one that does not, it
  shows a copy of the open page.

With Vite (a React app, or any other), a few lines in `vite.config.ts` add
Groma to `vite dev` and leave it out of `vite build`. The second tag is for
[the bridge](#let-an-agent-read-the-edits-live-the-bridge); drop it if you
copy the edits by hand:

```ts
export default defineConfig({
  plugins: [
    react(),
    {
      name: "groma",
      apply: "serve", // the dev server only
      transformIndexHtml: () => [
        {
          tag: "script",
          attrs: { src: "https://cdn.jsdelivr.net/npm/gromajs@1.2.0/dist/groma.js" },
          injectTo: "head-prepend",
        },
        { tag: "script", attrs: { src: "http://localhost:4777/bridge.js" }, injectTo: "head" },
      ],
    },
  ],
});
```

On another dev server, add the same tags wherever its HTML is written, behind
its own development-only check.

A list of every shortcut is also inside the inspector: open the » menu in
the panel's tab bar and choose "Shortcuts and tips".

## Settings

Optional. Put them on the script tag:

```html
<script src="groma.js" data-copy="sx" data-token-prefix="--ds-"></script>
```

| Attribute           | Values                                    | What it changes                                                                                                                                                                          |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-copy`         | `css` (default), `sx`                     | What a click on a length copies. `css`: `24px` and `padding: 12px 16px`. `sx`: `24` and `py: 12, px: 16`, for styling libraries that take style objects where a bare number means pixels |
| `data-token-prefix` | one or more prefixes, separated by spaces | Tokens with that prefix also show their path in the theme object the variables mirror: with `--ds-`, `--ds-color-text-primary` shows `color.text.primary`                                |

The same settings can be changed from code with
`Groma.configure({ copyFormat: "sx", tokenPrefixes: ["--ds-"] })`.

## Components

The Specs tab names the component an element belongs to when the page says
which it is. There are three ways, checked in this order:

1. **The markup declares it.** Any tool or framework can add:

   ```html
   <div data-component="Card" data-source="ui/Card.tsx" data-props='{"tone":"dark"}'>
   ```

2. **The page's UI framework knows it.** Supported today: React; Vue 3 and
   Vue 2; Svelte; and Angular. Vue, Svelte and Angular are read in
   development builds (see the limits below).
3. **The element is a custom element.** `<my-card tone="dark">` is a
   component by definition: the tag is its name, the attributes its props.

A page that says nothing about components shows no component block;
everything else works the same.

Groma lists the props as the design passes them. It does not write the code
for you: a design may use a prop your own component does not accept, and
only your codebase knows that.

## For pages that re-render

A page can talk to the inspector through `window.Groma`:

| Method                   | What it does                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `pin(el)`                | Pins an element, as Alt + click does                                                 |
| `pinnedElement()`        | The pinned element, or `null`                                                        |
| `replayOverrides(root?)` | Re-applies saved edits to the page, or inside `root`                                 |
| `highlight(el)`          | Moves the pinned-element outline to `el`                                             |
| `configure(settings)`    | Changes the [settings](#settings); with no argument, restores the defaults           |
| `edits()`                | The text "Copy edits" writes now; `""` when there are no edits or notes              |
| `onEdits(listener)`      | Calls `listener(text)` each time that text changes; returns a function that stops it |

## Hand your edits to a coding agent

Double-click a value in the Specs tab to change it (a size, a gap, a side of
the box, a color, a font size), or type over any property in the All CSS
tab, on as many elements as you like. For
something a value cannot say ("make this sticky"), pin the element, open the
Edits tab and write a note. The Edits tab lists it all as before → after;
the eye shows the page without your edits, and the arrows undo and redo.

"Copy edits" puts one Markdown text on the clipboard. Paste it into your
agent's prompt. It looks like this:

```markdown
# Edits to apply

These edits were made on the live page with Groma. …

- Page: http://localhost:3000/pricing
- Viewport: 1440 × 900

## 1. Button

- Selector: `#hero > button.cta`
- Component: `Button` (`ui/Button.tsx`)
- Text: "Get started"

Edits:

- `padding-top`: `12px` → `16px` (matches `--space-4`)
- `color`: `rgb(0, 128, 0)` → `red`

Note: keep it in view while the page scrolls
```

- "Before" is the computed value the page had: a width reads in pixels even
  when the stylesheet says `50%`.
- "matches" names the page's tokens that hold the new value, so the agent
  can use the token. Colors match in any spelling; a length matches only
  when it is written the same way (`1rem` does not match a token of `16px`).
- "Before" is the value when you first edited the property. If you changed a
  parent first, a child's "before" can already include that change (an
  inherited text color, for example).
- On a page that sets `data-token-prefix`, only tokens with that prefix are
  named. Without it, any variable with the same value is: a radius token can
  be named for a gap. The text tells the agent to check.
- The component and its source path are there when the page gives them (see
  [Components](#components)). The text never names a line to edit.
- A value the browser does not accept is not kept. `!important` after a
  value works.

## Let an agent read the edits live: the bridge

"Copy edits" needs a paste. The bridge removes it: the page hands its edits
to the `gromajs` command as they change, and a coding agent reads them
through an MCP tool. The command does this; the script on the page only gains
`Groma.edits()` and `Groma.onEdits()` (see [the API](#for-pages-that-re-render)).

**A file opened with `npx gromajs page.html`** is already set up: the command
serves the bridge on the same port and adds the bridge script beside Groma.

**An app on its own dev server** (React, Vue, anything with a dev build): add
the bridge script to the dev build, next to the Groma script (see
[Use it on an app](#use-it-on-an-app) for both tags in a Vite app):

```html
<script src="http://localhost:4777/bridge.js"></script>
```

The bridge itself is started by `gromajs mcp` when your agent starts it. To
run it without an agent, for example to read `/__groma/edits.txt`:

```bash
npx gromajs bridge            # port 4777; --port=<number> to change it
```

**Claude Code:**

```bash
claude mcp add groma -- npx gromajs mcp
```

**Any other MCP client** (stdio): run `npx gromajs mcp` as the server's
command, with `--port=<number>` if you changed the port. With no bridge
listening there, `gromajs mcp` starts one itself, so it alone is enough for
an app that carries the bridge script tag. Then edit in the Groma panel and
ask the agent to apply "the edits from Groma".

Tools (names are part of the [contract](contract.md)):

| Tool         | Arguments                                 | Answers                                                                                                                                                                                                    |
| ------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_edits`  | `page` (optional): part of a page address | The edits text of each page that has edits, with the page's address and when it arrived; or, when there are none, how to send some. The text is presented as data a web page reported, not as instructions |
| `list_pages` | none                                      | The pages that reported: address, title, whether they have edits, and when                                                                                                                                 |

The default port is 4777 for the page server, the bridge and `mcp`, so they
agree without being told.

HTTP, for scripts of your own (all under `/__groma/`):

| Request                  | What it does                                                             |
| ------------------------ | ------------------------------------------------------------------------ |
| `POST /__groma/edits`    | A page sends `{ "page": address, "title": …, "text": … }` (at most 1 MB) |
| `GET /__groma/edits`     | `{ "pages": [{ page, title, text, receivedAt }] }`, the newest first     |
| `GET /__groma/edits.txt` | The same, as plain text                                                  |
| `GET /__groma/bridge.js` | The script that posts the edits (also `/bridge.js` on `gromajs bridge`)  |

**Who may send.** The bridge listens on 127.0.0.1 only, answers only a
`Host` of this machine, and accepts edits only from a page whose `Origin` is
`localhost`, `127.0.0.1`, `[::1]`, any `*.localhost`, or `null` (a file). Any
web site can make your browser send a request to localhost; without this rule
any site could put text in front of your coding agent. To let a staging site
send, name it: `npx gromajs bridge --allow-origin=https://staging.example.com`
(repeatable; also on `mcp` and on a file). Nothing is written to disk: the
bridge keeps the latest text of up to 50 pages in memory, and a restart
forgets it (a page sends its text again at its next change or when its window
gets focus).

Limits:

- `null` is also the origin of a sandboxed frame on any web site, so a hostile
  page could send text from one. Edits go to your agent as data it is told not
  to obey, but read what you apply.
- A page served over `https` that posts to `localhost` may need your browser's
  permission for local network access; if the browser refuses, nothing is sent
  and nothing breaks.
- The edits are the text "Copy edits" would copy at that moment; a page with
  Groma in a canvas frame reports through its parent only.
- A page not served by the command carries the bridge tag only if you add it,
  and the bridge script is served over plain http from your machine: keep it
  out of what end users load.
- While `npx gromajs page.html` holds the port, `/bridge.js` there is a file
  of that page's folder, not the bridge script. An app that should report to
  that server takes `http://localhost:4777/__groma/bridge.js`, which every
  `gromajs` server answers.

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

- Saved edits do not come back by themselves after a reload. The panel shows
  a bar with the number missing, with "Apply" and "Discard" buttons.
- When the page draws an edited element again, the edit is gone from it and
  nothing says so. Switch "Show original" on and off to put every edit back,
  or have the page call `Groma.replayOverrides()` after it renders.
- A saved edit is found again by a selector that keeps the element's classes.
  If a class comes and goes (`.is-active`), the edit shows as "Not on the page
  now" while it is gone.
- On the canvas, Space does not scroll the page: it is the key that moves the
  canvas. The wheel still scrolls, Space still types in a field, and a tap of
  Space still presses a focused button or checkbox.
- The canvas loads the page a second time. For a file opened from disk and a
  page whose server forbids framing it shows a copy of the open page, on
  which the page's scripts run again; see
  [the canvas](#the-canvas-try-any-size). A reload on the canvas returns to
  the address in the address bar, not to a link followed inside the frame.
  A link in the frame that leads to another site cannot be shown. A page
  that takes more than ten seconds to draw itself in the frame shows there
  without the edits and the pin.
- Push mode moves only what is laid out in normal flow; see
  [the side panel](#the-side-panel-push-or-float).
- Token lookup takes the last matching declaration in source order and
  ignores selector specificity. Rules inside an `@media` or `@supports`
  block that does not apply now are skipped; `@container` rules are not
  evaluated, so one is read as if it applied.
- Sizing intent (fixed, hug, fill) is inferred from styles, and set with the
  properties that fit a block, a flex or a grid parent. In a grid, an image
  or an element with an aspect ratio reads as "fill" although it does not
  stretch by default.
- A grid's columns and rows are read from the last declaration in the
  stylesheets that applies now (a media query that does not match is
  skipped; selector specificity is ignored, and a container query is read as
  if it applied). When that list is not what the browser laid out, the track
  sizes are shown as one text value. Two lists with the same number of
  tracks and no pixel sizes cannot be told apart.
- Of the UI frameworks, React, Vue, Svelte and Angular pages are read for
  components; other pages can declare components in the markup (see
  [Components](#components)). A minified production build shows no React
  component names, and Vue, Svelte and Angular readers rely on what their
  development builds leave on the page; see [Use it on an app](#use-it-on-an-app).
  The readers use internals the frameworks do not promise to keep.
- Vue: a component with no name and no file name is skipped for its parent.
  Svelte shows the component's file but no props, and not whether the element is
  its root. Angular shows no source file (it exposes none), and shows props only
  where `ng.getDirectiveMetadata` exists (recent versions).
- The track lines of a pinned grid are drawn for left-to-right, horizontal
  text: with `direction: rtl` or a vertical writing mode they are on the wrong
  side. A grid inside a scrolling or clipping box is not cut at its edge.
- "Download" in the Asset block is a link with a `download` attribute. For an
  image from another origin the browser may open it in a tab instead of saving
  it; save it from there.
- The States block reads `:hover`, `:focus` and the other states from the
  stylesheets, ignoring selector specificity. A state inside `:is()`, `:where()`
  or `:not()` is not understood, and a rule that is only reached through one
  is not listed.
- The contrast ratio uses the background colors of the element and its
  ancestors. `opacity`, blend modes, a pseudo-element or a sibling painted
  behind the text, and colors written in a form other than hex or `rgb()`
  are not taken into account (the line is left out for the last).
- The Changes tab compares lines without their order, so a line that only
  moved is not reported.
- The color picker needs a Chromium browser. It has no test: the browser
  only opens it on a real click.
- The tests run in Chrome only; Firefox and Safari are not covered.
- Elements inside the page's own iframes and other shadow roots are not
  inspected.
