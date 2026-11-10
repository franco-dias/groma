# Features

What the inspector does, feature by feature. Each section says what the user
sees, the rules the behaviour must keep, where the code lives and which
tests protect it. When you change a feature, change its section here in the
same commit.

Terms used below:

- **Pinned element**: the element the panel describes. There is at most one.
- **Board** (artboard): the frame a design page lays a screen out on. Found
  by `BOARD_SELECTOR` in `src/board.ts`.
- **Board pixels**: an element's own CSS pixels, whatever the board's zoom.
  **Screen pixels** are what `getBoundingClientRect()` returns.
- **Token**: a CSS variable a design declares a value with.

## 1. Inspect mode

Hold Alt, or lock it on from the launcher (feature 12). While it is on, the
pointer is a crosshair.

- Hover draws the hovered element's box model: margin, border, padding,
  content, its children and the gaps between flex items.
- A chip names the hovered element: name, size in board pixels, position on
  its board. It sits above the element, or below when there is no room.
- Click pins the element. The whole press (pointer and mouse down, up,
  click) is kept from the page.
- Releasing Alt clears the overlay. So does the window losing focus,
  because the Alt keyup never arrives in that case.
- The inspector never inspects its own UI.
- Hovering the same element again does not redraw.
- The box model scales with CSS transforms (a zoomed board).

Code: `src/overlay/hover.ts`, `box-model.ts`, `tooltip.ts`, `layer.ts`.
Tests: `tests/hover.test.ts`.

## 2. Measuring

With an element pinned, hovering another element in inspect mode shows the
distances between the two, in red.

- Elements side by side: the gaps between their nearest edges.
- One inside the other: the four insets.
- Numbers are in board pixels, at any zoom.
- Only the target's dashed outline and the distances are drawn, not the
  target's box model.
- A label sits on its line when the line is long enough, and beside it
  otherwise; two short neighbours go to opposite sides.

Code: `src/overlay/distances.ts`. Tests: `tests/measure.test.ts`.

## 3. Side panel

Opens when an element is pinned, docked to the right edge.

- Four tabs: Specs, All CSS, Layers, Changes. The Changes tab is hidden on
  pages that are not Claude Design exports.
- Collapse leaves a 28px rail that names the element; clicking the rail or
  pinning another element expands it.
- The left edge resizes the panel between 320 and 560px.
- Close unpins the element; the outline and the grid go away.
- Width, open tab and unit are remembered per origin
  (`localStorage["__live_inspector_panel"]`).
- Keys typed in the panel do not reach the page's own shortcuts.

Code: `src/panel/panel.ts`, `layout.ts`, `panel.html`, `src/styles/panel.css`.
Tests: `tests/panel.test.ts`.

## 4. Pinned outline and grid

- The pinned element has a blue outline with a tag: its name and size. The
  tag moves inside the outline near the top of the window.
- The outline follows the element while the page scrolls, zooms or moves
  it, and hides when the page removes the element.
- "Outline element" in the All CSS tab switches it off.
- The grid (off, 4 or 8 board pixels) covers the pinned element's board and
  scales with it. It uses the `difference` blend mode so it shows on light
  and dark boards.

Code: `src/outlines.ts`. Tests: `tests/panel.test.ts`, `tests/specs.test.ts`.

## 5. Specs tab

What a developer needs to build the element. A click on any value, token or
code box copies it.

- **Header**: breadcrumb (board › parent › element; the parent is a button
  that pins it), tag, name, size, classes. Generated class names are muted.
- **Component** (feature 6).
- **Layout**: size with its sizing intent, position on the board, display,
  direction, alignment, gap, radius, border, opacity. Values too long for
  half a row get a full row.
- **Sizing intent**: per axis, `fixed` (a declared size), `hug` (sized by
  content) or `fill` (sized by the parent). Derived from declared styles
  and the parent's flex settings.
- **Box**: margin around padding around the content size. Clicking
  "margin" or "padding" copies it as MUI `sx` (`py: 12, px: 16`).
- **Colors** (feature 7).
- **Typography**: family, weight, size, line height, tracking. Only for
  elements with text of their own.
- **Motion**: one row per transition or animation, with its easing curve.
- Lengths show as bare numbers in px (one MUI spacing step is 1px), or in
  rem. The unit switch is in the action bar.

Code: `src/panel/specs-tab.ts`, `src/specs/*`. Tests: `tests/specs.test.ts`,
unit tests in `src/specs/`.

## 6. Component

On React pages, the component an element belongs to.

- Shows the component as JSX with its text, number and boolean props, and
  its source path when the page provides one.
- "Component" when the element is the component's root; "Inside component"
  when it only sits inside one, with a button that pins the root.
- The component's name is used for the element everywhere: header, chip,
  outline tag, rail.
- Names and source paths come from the `@ds-bundle` header a Claude Design
  export embeds; otherwise from the React component's own name.
- Pages without React show no component block.

Code: `src/specs/component.ts`, `src/element-name.ts`.
Tests: `tests/component.test.ts`.

## 7. Colours and tokens

Each colour is a row: swatch, hex, alpha, its role (Background, Border,
Text, Fill, Stroke, Picked).

- **Declared token**: the row lists the MUI theme path
  (`palette.background.paper`) when the variable starts with `--mui-`, then
  the CSS variable, then the token's value in every scope that sets it. The
  scope the element is in stands out.
- Text and icon colours usually come from an ancestor; the lookup walks up
  for inherited properties.
- **Matches token**: the design wrote the colour by hand, but a token has
  the same value.
- **No token**: no token has that colour. The row is flagged.
- Non-colour values declared with a token list it under the layout cells.

Code: `src/specs/tokens.ts`, `colors.ts`, `src/page-styles.ts`.
Tests: `tests/specs.test.ts`.

## 8. Compare

- The compare action makes the pinned element the baseline (A). The next
  pinned element is B.
- The block lists only the specs that differ, as before → after, and
  counts the identical ones. Position and component are not compared.
- Stop, or Esc, ends the comparison.

Code: `src/specs/sections.ts` (`compareSpecs`), `src/panel/specs-tab.ts`.
Tests: `tests/specs.test.ts`.

## 9. Links

- "Copy link" copies the page URL with `?inspect=<selector>` and the
  board's id as the hash.
- Opening such a link pins that element once the page has rendered it; the
  inspector keeps looking for 15 seconds.

Code: `src/link.ts`. Tests: `tests/specs.test.ts`.

## 10. All CSS tab and edits

Every computed property of the pinned element, grouped. Values are
editable.

- An edit is applied to the element's inline style at once, saved, and
  listed under "Your edits".
- A value that is focused and left unchanged keeps its edit. Escape cancels
  typing.
- Reset, or clearing the value, puts back the inline value the page had
  before the first edit.
- Arrow keys change a number by 1 (Shift: 10, Alt: 0.1), applied live.
- The list keeps its scroll position after an edit, and focus follows to
  the row the user was moving to.
- Tag, id, classes and rect rows are read-only.
- The content editor changes an element's HTML, or a form control's value,
  on Ctrl/⌘+Enter; Reset restores the original.
- Edits are saved in `localStorage`, per page path, keyed by a selector
  that leads back to the same element (ids and classes escaped).
- Saved edits are replayed on load. Pages that render late call
  `LiveInspector.replayOverrides(root?)`.
- If storage is blocked or full, the edit still applies.

Code: `src/panel/css-tab.ts`, `src/edits/*`. Tests: `tests/edits.test.ts`.

## 11. Layers

- The Layers tab shows the tree of the pinned element's board (or of the
  page), opened down to the pinned element. Hover outlines a layer; click
  pins it; the caret opens it.
- Alt + right-click lists every layer under the pointer, topmost first,
  with sizes. Choosing one pins it. Without Alt, the browser's own menu is
  left alone.

Code: `src/panel/layers-tab.ts`, `src/overlay/layer-menu.ts`.
Tests: `tests/layers.test.ts`.

## 12. Launcher

- A pill at the bottom right from page load: "Inspect · hold ⌥".
- Clicking it locks inspect mode on; Esc or its ✕ unlocks.
- It moves left when the panel is open.

Code: `src/launcher.ts`. Tests: `tests/launcher.test.ts`.

## 13. Changes

On a Claude Design export (a page with `<script id="dc-data">`), compares
the page with an older export file the user picks.

- Lists boards that changed (with added and removed line counts), were
  added, or were removed.
- Clicking a changed board opens its lines and scrolls the page to it.
- Lines are compared without their order.
- A file that is not an export gets an explanation, not a silent failure.

Code: `src/export-diff.ts`, `src/panel/changes-tab.ts`.
Tests: `tests/changes.test.ts`, `src/export-diff.test.ts`.

## 14. API for the host page

`window.LiveInspector`, typed as `LiveInspectorApi` in `src/main.ts`:
`pin(el)`, `pinnedElement()`, `replayOverrides(root?)`, `highlight(el)`.
It is the only global the script creates. The Cadence design canvas calls
it, so treat it as a public contract.
