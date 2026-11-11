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

Opens when an element is pinned, docked to the right edge. It either pushes
the page aside or floats over it (see below).

- **Alt + Shift + G** opens the panel with nothing pinned, from anywhere on
  the page, and closes it again (unpinning the element, if there is one).
  The empty panel shows a hint in place of the tabs' content; the » menu,
  the reference and the Edits tab (feature 18) work, so the canvas, the
  shortcuts and the list of edits are reachable before anything is pinned. Pinning an element fills it. The shortcut is matched
  by the key's place on the keyboard (`KeyG`), because Alt changes the
  letter a key types.

- It slides in from the right edge when it opens and out to it when it
  closes, in 200ms (`--ins-dur-slide`). In push mode the page moves with
  it: on every frame of the slide the page gives way by as much of the panel
  as is on screen, so the page's edge stays on the panel's edge. For the
  rest of the inspector the panel is closed from the moment it starts to
  leave (nothing is pinned, the launcher moves back). With "reduce
  motion" set in the system, and in a browser without `@starting-style` and
  `transition-behavior: allow-discrete`, it shows and hides at once.
  Collapsing to the rail is not animated.
- Five tabs: Specs, All CSS, Layers, Edits, Changes. The Changes tab is
  hidden on pages that are not Claude Design exports.
- The » button opens a small menu: "Shortcuts and tips" (feature 16),
  "Push the page aside", "Show on a canvas" (feature 17) and "Collapse
  panel". A click elsewhere in the
  panel, or Esc, closes it.
- **Push the page aside** is on by default. The panel then takes its width
  out of the page instead of covering it: Groma sets one inline
  `margin-right` on `<html>` (the page's own margin plus the panel's width)
  and puts the page's value back when the panel closes or the user switches
  to float. It follows the panel as it collapses (28px) and is resized.
  Switched off, the panel floats over the page.
- The page's own `margin-right` on `<html>` is the only thing push mode
  touches. It cannot move elements fixed to the right edge of the window, and
  layouts sized in `vw` and media queries still see the full window width.
  That is why float exists.
- Collapse leaves a 28px rail that names the element; clicking the rail or
  pinning another element expands it.
- The left edge resizes the panel between 320 and 560px.
- Close unpins the element; the outline and the grid go away.
- Width, open tab, unit and push/float mode are remembered per origin
  (`localStorage["__groma_panel"]`).
- Keys typed in the panel do not reach the page's own shortcuts.
- The inspector is always above the page. Its host element is a manual
  popover, so it sits in the browser's top layer, which paints over every
  other element whatever its z-index. A page element fixed at the highest
  z-index that comes later in the document cannot cover the panel, the
  launcher or the outlines. Browsers without the Popover API fall back to the
  host's own z-index. A modal `<dialog>` that the page opens later sits above
  the inspector, and blocks it while it is open.
- The inspector survives a page that replaces its `<body>` or its whole
  document after it loads, as a self-unpacking design export does: the host
  is put back, with everything it holds, and back in the top layer.

Code: `src/panel/panel.ts`, `layout.ts`, `panel.html`, `src/page-shift.ts`,
`src/root.ts` (the top layer), `src/styles/panel.css`.
Tests: `tests/panel.test.ts`, `tests/page-shift.test.ts`,
`tests/layering.test.ts`.

## 4. Pinned outline and grid

- The pinned element has a blue outline with a tag: its name and size. The
  tag moves inside the outline near the top of the window.
- The outline follows the element while the page scrolls, zooms or moves
  it, and hides when the page removes the element.
- "Outline element" in the All CSS tab switches it off.
- The grid (off, 4 or 8 board pixels) covers the pinned element's board,
  whichever element of the board is pinned, and scales with it.
- The grid shows on light and dark boards alike: its lines are a mask over
  a backdrop filter, not a colour. (A blend mode does not work: the
  inspector's host is its own stacking context.)
- The grid is cut to the part of the board the page shows, so it never
  spills over the page's own chrome; its lines still start at the board's
  corner.

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
  "margin" or "padding" copies all four sides.
- **Colors** (feature 7).
- **Typography**: family, weight, size, line height, tracking. Only for
  elements with text of their own.
- **Motion**: one row per transition or animation, with its easing curve.
- Lengths show as bare numbers in px, or in rem. The unit switch is in the
  action bar.
- **What a click copies** depends on the page's copy format (feature 15).
  `css`, the default: `24px`, and `padding: 12px 16px` for a box name.
  `sx`: `24`, and `py: 12, px: 16`. In rem, both formats copy rem.

Code: `src/panel/specs-tab.ts`, `src/specs/*`. Tests: `tests/specs.test.ts`,
unit tests in `src/specs/`.

## 6. Component

The UI component an element belongs to. A page can say this in three ways,
each a "reader" in `src/specs/components/`, tried in this order:

1. `declared.ts`: `data-component`, `data-source` and `data-props` (JSON)
   attributes in the markup. Explicit, so it wins.
2. `react.ts`: React's internals, plus the `@ds-bundle` header a Claude
   Design export embeds for names and source paths.
3. `custom-element.ts`: a tag with a hyphen is a component; its attributes
   are its props. It looks at most five levels up, so an app shell far
   above an element is not reported as its component.

A reader returns null when it has nothing to say and must never throw. To
support another framework, add a reader and list it in
`src/specs/component.ts`.

- Shows the component's name, the props the design passes to it (text,
  numbers and booleans) as a name/value list, and its source path when the
  page provides one. The name and each value copy on click.
- It does not suggest code (no JSX). A design can pass a prop the project's
  own component does not accept, and the inspector cannot know a project's
  API. It reports what the design uses and stops there.
- "Component" when the element is the component's root; "Inside component"
  when it only sits inside one, with a button that pins the root.
- The component's name is used for the element everywhere: header, chip,
  outline tag, rail.
- A page that says nothing about components shows no component block.

Code: `src/specs/component.ts`, `src/specs/components/*`,
`src/element-name.ts`.
Tests: `tests/component.test.ts`.

## 7. Colours and tokens

Each colour is a row: swatch, hex, alpha, its role (Background, Border,
Text, Fill, Stroke, Picked).

- **Declared token**: the row lists a theme path (`color.text.primary`)
  when the variable starts with a prefix the page configured (feature 15),
  then
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
  listed under "Your edits". The Edits tab (feature 18) lists the edits of
  every element.
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
- Saved edits are replayed on load, and again each time an element is
  pinned, so what the tabs list as edited is on the page. Pages that render
  late call `Groma.replayOverrides(root?)` to get them back without a pin.
- A value the browser would ignore (`banana` for a padding) is not kept: the
  row goes back to what it showed, and an edit that was there stays.
  `!important` typed after a value is applied as its priority.
- If storage is blocked or full, the edit still applies, and is kept in
  memory until the page goes away: it is listed, copied and undone like any
  other, and is only not there after a reload.
- Undoing or resetting the only edit of an element that had no inline style
  leaves it with no `style` attribute.
- Every edit goes through `edit()` in `src/edits/changes.ts`, which applies
  it, saves it and records it for undo. Do not call the functions of
  `overrides.ts` for a user's edit from anywhere else.

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

`window.Groma`, typed as `GromaApi` in `src/main.ts`:
`pin(el)`, `pinnedElement()`, `replayOverrides(root?)`, `highlight(el)`,
`configure(settings?)`.
It is the only global the script creates. Host pages call it, so treat it
as a public contract.

## 15. Settings

A page can tell the inspector how its project writes things. Both settings
are optional, and the defaults assume nothing about the project.

- **Copy format** (`data-copy`, `copyFormat`): `css` (default) or `sx`.
- **Token prefixes** (`data-token-prefix`, `tokenPrefixes`): none by
  default. A token with a configured prefix also shows its dotted path.
- Read from the script tag at start; changed later with
  `Groma.configure()`, which applies to the open panel at once.
  `configure()` with no argument restores the defaults.
- Unknown values are ignored.

Code: `src/config.ts`. Tests: `tests/config.test.ts`,
`tests/specs.test.ts`.

## 16. Reference

A tab that lists every shortcut and trick, opened from the » menu.

- Content lives in `src/panel/reference.html`, grouped by subject: Inspect,
  Copy, Specs, All CSS, Edits, Layers and panel, Canvas, Good to know.
- Modifier keys are named as the user's keyboard does (⌥ and ⌘ on a Mac,
  Alt and Ctrl elsewhere).
- It has no tab in the tab bar, and it is not the tab the panel reopens on.
- **It must stay true.** A new or changed shortcut, click target or setting
  changes this file in the same commit.

Code: `src/panel/reference-tab.ts`, `reference.html`, `src/platform.ts`.
Tests: `tests/reference.test.ts`.

## 17. Canvas

"Show on a canvas" in the » menu puts the page in a frame on a canvas, like
an artboard in a design tool, to try the design at any width and height. It
is off by default; the choice and the frame's size are remembered per origin
(`localStorage["__groma_canvas"]`).

- The frame loads the page's own address again in an `<iframe>`. The page
  therefore runs a second time inside the frame, and its media queries, `vw`
  units and fixed elements see the frame's size. The first copy stays
  underneath, hidden by the canvas and untouched.
- Drag the frame's right edge, bottom edge or corner to resize it, between
  240 × 160 and 3840 × 2400. The toolbar has three sizes: 375 × 812,
  768 × 1024 and 1280 × 800. The label above the frame shows its size.
- Zoom with the toolbar, or Ctrl/⌘ + wheel over the canvas or the page,
  between 10% and 400%. "Fit" shows the whole frame, and never zooms in. A
  wheel or a drag on the canvas itself moves the frame; a wheel over the page
  scrolls the page.
- A plain drag that starts over the page belongs to the page (selecting
  text, the page's own drag interactions). **Space + drag** and a
  **middle-button drag** move the canvas from anywhere, also from over the
  page. While Space is held the frame lets the pointer through to the
  canvas, and Space does not scroll the page.
- Space is taken whatever has the focus, in the page or in the inspector,
  except where it types: a text field, a `<textarea>`, editable content. A
  focused button or checkbox does not swallow it (one is focused after every
  click on it). Space released with no drag is passed on: the focused
  control is pressed once, as the key alone would have done. With the canvas
  off, Space is never touched.
- A fitted frame stays fitted when the panel opens, closes or is resized.
  Once the user zooms or moves it, the view is theirs and is left alone.
- Everything else works in the frame as on the page: hover, pin, distances,
  the layer menu, the grid, edits. Sizes and distances are in the page's own
  pixels at any zoom. The marks are drawn outside the frame, in the
  inspector's own layer, so they keep their size when the frame is zoomed;
  they are cut at the frame's edge.
- The panel docks beside the canvas and never covers the frame. Push mode
  does nothing on the canvas.
- The pinned element stays pinned when the canvas opens or closes, if the
  other copy of the page has it too. After a resize the panel shows the
  element as the page laid it out at the new size.
- The copy of the script inside the frame does not start. It only points
  `window.Groma` at the inspector outside, so a page that calls
  `Groma.replayOverrides()` still works.
- The browser does not let the inspector read a frame that loads a file
  opened from disk (`file://`), or a page whose server forbids framing
  (`X-Frame-Options`, CSP `frame-ancestors`). The frame is then filled with
  **a copy of the open page** instead: its HTML as it is now, without the
  inspector, handed to the frame as `srcdoc`, which the browser does let us
  read. A page from disk goes straight to the copy; any other page gets it
  when the first load of its address is refused.
- The page's scripts run again on the copy, on HTML they have already
  changed. A page that adds things as it loads could show them twice. For a
  page from disk the toolbar has **"Use the file…"**: the user picks the
  HTML file and the frame gets the original source. A browser does not let
  a page remember a file, so this is asked again each time.
- A copy has no address of its own (`about:srcdoc`). Links to an element and
  saved edits use the address of the page (`pageAddress()` in `src/page.ts`).
- When a link followed inside the frame leads to a page the inspector cannot
  read (another site), the canvas says so and offers the way back.
- If the user follows a link inside the frame, leaving the canvas goes to
  that address, so the page underneath is not the old one.

Every module reads the page through `src/page.ts`: which document it is
(`pageDocument`, `pageWindow`), where its elements are on screen (`rectOf`)
and how to listen to it (`onPage`).

Code: `src/canvas/canvas.ts`, `view.ts`, `canvas.html`, `src/page.ts`,
`src/root.ts` (`mountOnPage`, the clip), `src/styles/canvas.css`.
Tests: `tests/canvas.test.ts`, `src/canvas/view.test.ts`.

## 18. Edits tab and Copy edits

Everything the user changed on this page, on any element, and the way to
hand it to whoever changes the source: a coding agent, or a person.

- **The list.** One group per edited element: its name, its selector, then
  one line per edit as before → after. "Before" is the computed value the
  page had when the property was first edited (the content, for a content
  edit); it is saved with the edit (`localStorage["__groma_before:<path>"]`),
  so it is still there after a reload. An edit saved by a version before 0.7
  has no "before", and shows only its value. It is the value at the moment
  of the first edit, so it includes earlier edits it depends on: a text
  colour inherited from a parent that was edited first reads as the parent's
  new colour.
- A click on a group's name pins that element. A group whose element the
  page no longer has says so, and cannot be pinned.
- **↩ on a line** removes that edit and puts back the page's own value.
- The list needs no pinned element: the tab also shows while the panel is
  open with nothing pinned.
- **Notes.** With an element pinned, the top of the tab has a note field for
  it: an instruction in plain words ("make this sticky"). It is saved when
  the field is left (`localStorage["__groma_notes:<path>"]`), changes nothing
  on the page, is listed with the element's edits and is copied with them.
  Clearing the field removes the note; Esc cancels typing.
- **Undo and redo**: the two buttons in the bar, and Ctrl/⌘ + Z and
  Shift + Ctrl/⌘ + Z while the focus is in the panel and not in a field (a
  field undoes its own typing). They cover style edits, content edits, notes
  and resets. A run of arrow-key nudges on one value is one step. The
  history is kept in memory: a reload keeps the edits and forgets the steps.
- **Show the original page** (the eye): puts back what the page had, for
  every edit, without removing the edits; pressed again, it applies them
  again. While it is on, `Groma.replayOverrides()` does nothing, so a page
  that re-renders does not bring the edits back. Making an edit switches it
  off first.
- **Copy edits** copies one Markdown text: the page's address, the viewport
  size, then per element its selector, its component and source path when
  the page gives them, the start of its text, each edit as before → after,
  and its note. It is off while there is nothing to copy.
- **Token names.** When the new value of a style is held by one of the
  page's tokens (a CSS variable the element can see), the line names it:
  `16px (matches --space-4)`. Colours match in any spelling; other values
  match as text. At most three tokens are named, shortest names first. A
  value that already says `var(…)` is left as it is. A value with no digit
  but zero (`none`, `auto`, `0px`) is never matched: tokens that hold those
  have nothing to do with the property. On a page that sets token prefixes
  (feature 15), only tokens with one of them are named.
- A value is written as inline code on one line; one that holds backticks
  gets a longer fence. A note of several lines is written as a quote, so no
  line of it reads as a heading of the text. The element's text is its text
  as shown (`innerText`).
- The text describes the change and where the element is on the rendered
  page. It does not say which file or line to edit, and it writes no code:
  that is the reader's job, with the project in front of them.
- **The format is read by agents.** Changing its headings or the shape of
  its lines changes what people's prompts and tools see; say so in the
  changelog.

Code: `src/panel/edits-tab.ts`, `src/edits/changes.ts` (the list, the
history), `src/edits/handoff.ts` (the text), `src/edits/overrides.ts`
(`showOriginal`), `src/styles/edits.css`.
Tests: `tests/edits-tab.test.ts`, `src/edits/handoff.test.ts`.
