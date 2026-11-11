# The 1.0 contract

What is frozen from 1.0. Changing or removing any of it is a major version;
adding to it is not. Everything else (the panel, the look, the settings'
internals, the tests) may change in a minor version.

## `window.Groma`

The only global. Exactly these seven methods (a test pins the list):

| Method                                                  | Answers                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pin(element: Element): void`                           |                                                                                                                   |
| `pinnedElement(): Element \| null`                      | `null` when nothing is pinned                                                                                     |
| `replayOverrides(root?: ParentNode): void`              |                                                                                                                   |
| `highlight(element: Element): void`                     |                                                                                                                   |
| `configure(changes?: Partial<Config>): void`            | no argument restores the defaults                                                                                 |
| `edits(): string`                                       | the "Copy edits" text now; `""` with no edits or notes                                                            |
| `onEdits(listener: (text: string) => void): () => void` | calls `listener` when that text changes; the result stops it. A listener that throws does not break the inspector |

## Names in the page

- The host element is `<groma-inspector>`; the script tag is found by its
  `data-groma` marker.
- Settings: the attributes `data-copy` (`css` default, `sx`) and
  `data-token-prefix`, and `Groma.configure()` with `copyFormat` and
  `tokenPrefixes`. Defaults and meanings do not change.
- Storage keys: `__groma_overrides:<path>`, `__groma_html:<path>`,
  `__groma_before:<path>`, `__groma_notes:<path>`, `__groma_panel` and
  `__groma_canvas`. Saved selectors keep their shape.
- Component declaration in markup: `data-component`, `data-source`,
  `data-props`.
- Claude Design export: `BOARD_SELECTOR`, `#dc-data` and the `@ds-bundle` header.

## The `gromajs` command

| Command               | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `gromajs <file.html>` | Serves the file with Groma and the bridge client attached     |
| `gromajs bridge`      | Only the bridge; prints the script tag for an app's dev build |
| `gromajs mcp`         | The MCP server over stdio; starts a bridge when none listens  |

Options: `--copy=css|sx`, `--token-prefix=<p>`, `--port=<number>` (default
**4777**, shared by all three commands), `--no-open`, `--allow-origin=<origin>`
(repeatable), `-h`/`--help`. The names `bridge` and `mcp` are taken as
subcommands before a file name.

## The bridge

All under `/__groma/`: `POST /__groma/edits` (`{ page, title, text }`),
`GET /__groma/edits` (`{ pages: [{ page, title, text, receivedAt }] }`),
`GET /__groma/edits.txt`, `GET /__groma/bridge.js` (and `/bridge.js` on
`gromajs bridge`). The origin rule and the 127.0.0.1-only listening are part
of the contract: they may become stricter, never looser.

MCP server name `groma`; tools:

- `get_edits` with the optional argument `page` (a part of a page address).
- `list_pages`, no arguments.

## The text "Copy edits" writes

Markdown, in this order (pinned by `src/edits/handoff.test.ts`):

```markdown
# Edits to apply

<one paragraph of explanation>

- Page: <address>
- Viewport: <width> × <height>

## <n>. <element name>

- Selector: `<css selector>`
- Component: `<name>` (`<source path>`) or "Inside component"
- Text: "<start of the element's text>"
- The page did not have this element when the edits were copied.

Edits:

- `<property>`: `<before>` → `<after>` (matches `<token>`, …)
- Content: "<before>" → "<after>"
- `<property>`: `<after>` (the value before is not known)

Note: <note> (several lines: "Note:" then each line quoted with ">")
```

Elements are numbered from 1. Lines whose information is missing are left
out. A value that holds backticks gets a longer fence. The wording of the
explanatory paragraph may be improved; the headings and the shape of the
lines may not.
