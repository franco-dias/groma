# Groma landing page

The page that presents Groma: English at `/`, Brazilian Portuguese at
`/pt-br/`. It is the final, built page, a plain static site: any static host
serves this folder as it is. Nothing here ships in the npm package (`files` in
`package.json` lists only `dist` and the `gromajs` command).

## Preview

```bash
cd landing && python3 -m http.server 4800
```

Then open http://localhost:4800.

## What is where

| Path | What it is |
| --- | --- |
| `index.html`, `pt-br/index.html` | The page, in each language. Edit both when the copy changes |
| `assets/runtime.js` | Renders the page's interactive parts from the markup, with React (`react*.js`) |
| `assets/version.js` | Shows the latest version on npm and runs Groma at that version |
| `assets/try-it.js` | "Try it here": the hint that tells a visitor which key to hold |
| `assets/typography.js` | Makes every text a `Typography` component, with its props read from its styles |
| `media/` | The motion graphic under the headline, and its poster |
| `favicon.svg` | The static Groma logo, from `docs/images/` |

## Conventions

The page is made to be inspected with Groma, which runs on it. Keep it that way
when you edit it:

- **Colors** are CSS variables declared on `:root` (`--color-text-primary`,
  `--color-accent-12`…). Use a variable, never a literal, so Groma shows a
  token for every color.
- **Spacing**: every padding, margin and gap is a multiple of 4px.
- **Components** are declared in the markup with `data-component`,
  `data-source` and `data-props`, so Groma names them and lists their props.
- **The Alt key** is written as
  `<span class="k-mac">⌥ Option</span><span class="k-pc">Alt</span>`: the page
  shows the one that matches the visitor's keyboard.
- **The version** is never written by hand: `version.js` asks npm on every
  visit and updates the pill and the script tag to copy. It never shows a
  version older than the one in `window.__gromaVersion`, which the page was
  saved with.
- **Touch screens** see the npm button where a mouse sees "Try it here".
- **Formatting**: the two pages are formatted with oxfmt, like the rest of
  the repo (`npm run format` and `npm run format:check` cover them). A code box
  (`.code-t`) keeps its whitespace (`white-space: pre`), and the formatter
  would wrap the text inside it onto a new line, so each one has
  `<!-- oxfmt-ignore -->` right before it. Keep that comment on a new box.

## Deploy

It is live at https://gromajs.dev (`www.gromajs.dev` redirects to it), served
by Vercel from this folder. Any static host serves it the same way; there is
no build step.

On Vercel: Root Directory `landing`, Framework Preset "Other", no build
command, output directory `.`. `vercel.json` makes `/pt-br` redirect to
`/pt-br/`, so the page's relative links (`../assets/…`, the language switch)
resolve from the folder.
