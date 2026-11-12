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
- While inspect mode is locked on, a double-click on an element that holds
  only text (no child elements, not a form control) pins it and lets the user
  type in it on the page. Enter (always: no line breaks) or a click elsewhere
  applies; Esc puts the text back. The edit goes through `edit()` with
  `CONTENT`, so it is saved, listed in the Edits tab, undone and copied like a
  content edit made in the All CSS tab. Editing sets `contenteditable` and
  `spellcheck` on the element, and puts each back exactly (absent stays
  absent) on every way out: apply, cancel, the page removing the element,
  another element being pinned, the lock being switched off. Typed keys do
  not reach the inspector's or the page's shortcuts, and no hover is drawn
  meanwhile. Not while Alt is only held, and not with the lock off. It works
  in canvas mode. In a button (or the `summary` of a `details`) the browser
  types no space and takes the space bar as a press of it: the inspector
  types the space itself and keeps the key from pressing the button.
- A switch at the foot of the panel, "Edit text inline (lock inspecting)",
  is there on every tab with the gesture beside it ("Double-click text on
  the page"), so the feature is found. Checking it locks inspect mode on,
  exactly as the launcher pill does, and unchecking it unlocks. The switch
  and the pill are one lock (`src/overlay/inspect-lock.ts`) and always show
  the same state; Esc unlocks both. Holding Alt alone does not edit text.
- Alt pressed and let go while text is being edited is still seen, so
  inspect mode does not stay on after the lock ends.
- Releasing Alt clears the overlay. So does the window losing focus,
  because the Alt keyup never arrives in that case.
- The inspector never inspects its own UI.
- Hovering the same element again does not redraw.
- The box model scales with CSS transforms (a zoomed board).

- An element pinned with a click is read with the pointer on it, so the
  panel first shows what its `:hover` rules give it. When the pointer leaves
  the pinned element, and the transitions that started have ended, the panel
  reads it again and shows the element at rest. Not while a value is open in
  the panel or text is being edited on the page: reading again would take it
  from the user.

Code: `src/overlay/hover.ts`, `box-model.ts`, `tooltip.ts`, `layer.ts`,
`text-edit.ts`, `lend-attributes.ts`, `resting-read.ts`.
Tests: `tests/hover.test.ts`, `tests/text-edit.test.ts`,
`tests/resting-read.test.ts`.

### Keyboard navigation

With an element pinned, Alt and an arrow key move the pin: ↑ to the parent, ↓
to the first child, ← and → to the element before and after it.

- ← and → are the siblings first. Past the first or last sibling the move
  goes on: to the parent's sibling on that side and down to its nearest child
  (the first going →, the last going ←), so the pin stays at the depth it
  was and ← undoes →. A parent's sibling with no children is the end of the
  move itself; when the parent has no sibling either, the walk climbs
  further. At the page's first and last element the keys do nothing.
- ↓ after ↑ goes back to the child the pin came from, not to the first one.
  Any other move in between forgets it.
- A wrapper with no box of its own (`display: contents`) is looked through:
  its children count as its parent's, for ↓, ← and →, and ↑ skips it.

- Alt is the inspect key, so the keys work wherever the focus is: on the
  page or in the panel, with no click needed first and with or without the
  inspect lock. A plain arrow key is always the page's (scrolling).
- They keep their own meaning in a field (an input of the page or the panel,
  a Specs value open as a field, where Alt and an arrow steps by 0.1), while
  a menu of the panel is open, while text is being edited on the page, and
  with another modifier held.
- When they act the key is kept from the page, also when the move has nowhere
  to go. On Windows and Linux that takes Alt + ← and → from the browser's
  back and forward while an element is pinned.
- Skipped: the inspector's own host, `script`, `style`, `link`, `meta`,
  `head`, and elements with no box (`display: none`). ↑ stops at `body`; a
  move with nowhere to go does nothing.
- The pinned element is scrolled into view when it is off screen
  (`scrollIntoView({ block: "nearest", inline: "nearest" })`): a change of
  scroll position caused by the user's own key, and the only change to the
  page.
- The panel does not take the focus: a click on it leaves the focus where it
  was, and Alt is heard in the capture phase, so inspecting works right after
  a click in the panel.

Code: `src/navigate.ts`, `src/navigate-keys.ts`. Tests: `tests/navigate.test.ts`.

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
code box copies it. A double-click on a value that is one CSS property edits
it (see "Editing a value" below).

- **Header**: breadcrumb (board › parent › element; the parent is a button
  that pins it), tag, name, size, classes. Generated class names are muted.
- **Component** (feature 6).
- **Layout**: size with its sizing intent, position on the board, display,
  gap, radius, border, opacity. Values too long for half a row get a full
  row.
- **Flex container**: an element with `display: flex` shows three rows of
  buttons under the cells: Direction (row, column), Justify (start, center,
  end, and one button for the ways to share out the space) and Align (start,
  center, end, stretch). The button of
  the current value is checked; the defaults are read as what they do
  (`normal` is start for Justify and stretch for Align), and a reversed
  direction checks its axis. A click edits `flex-direction`,
  `justify-content` or `align-items` like any other edit; a click on the
  checked button does nothing.
  - Each row says which axis it works on: "along the direction" for Justify,
    "across the direction" for Align. The label's tooltip names the CSS
    property and each button's tooltip its declaration
    (`align-items: center`).
  - The drawings are made for a row and turned by the stylesheet to the axis
    they move the items on, so each shows what it does on the page: in a
    column, Justify's are upright and Align's lie flat.
  - The last button of Justify opens a menu of `space-between`,
    `space-around` and `space-evenly`, each followed by the property it sets
    (`justify-content`); the one in use is checked, and the button then
    carries its drawing and names it in its tooltip. `align-items` has no
    such values, so Align has no menu. The menu is the same small menu as the
    sizing intent's: one open at a time, closed by a click elsewhere in the
    tab or by Esc.
  - A value no button stands for (`baseline`) is shown after
    the buttons as text, to copy and to edit. `flex-wrap` is named beside the
    direction when the container wraps.
- **Grid container**: an element with `display: grid` shows two rows of the
  same buttons (start, center, end, stretch): Justify sets `justify-items`
  and says "across each cell", Align sets `align-items` and says "down each
  cell". The default (`normal`) checks stretch. The drawings are not turned
  with anything: a grid has no direction.
  - Two more rows, both labelled "Distribute", say where the tracks sit in
    the grid: `justify-content` ("the columns across the grid") and
    `align-content` ("the rows down the grid"). Each is shown only when it can
    do something: the tracks leave at least 1px free on that axis (the
    tracks and the gaps against the content box), or the property is not
    `normal`. Buttons: start (also `normal`), center, end, stretch, and a menu
    of `space-between`, `space-around` and `space-evenly`, as on a flex
    container's Justify. The drawings are the flex ones, the second turned
    to the block axis. Two rows with one label are told apart by their hint.
    Code: `src/panel/specs/grid-content.ts`, `src/grid-axes.ts`.
    Tests: `tests/specs-grid-content.test.ts`.
- **Track lines on the page**: while a grid container is pinned, a thin
  dashed line is drawn at each edge of its columns and rows (one more line
  than there are tracks; with a gap the line is in the middle of the gap),
  and each gap is lightly filled. They are placed on animation frames, like
  the pinned outline, so they follow scroll, resize and edits, from the grid's
  rectangle scaled by its zoom, its border and padding, the computed track
  sizes and the gaps, and they follow `justify-content` and `align-content`
  (`src/specs/track-lines.ts`). They take no pointer events, are mounted with
  `mountOnPage()` (cut at the frame in canvas mode), and go when another
  element is pinned, on unpin, when the element stops being a grid and when
  it leaves the page. A grid that is only hovered gets none. Shortcut: left
  to right and horizontal text only. Code: `src/overlay/grid-lines.ts`,
  `src/specs/grid-spots.ts`, `track-lines.ts`. Tests: `tests/grid-lines.test.ts`.
- **Columns and rows of a grid**: one row each, under the buttons
  (`src/specs/tracks.ts`).
  - The number of tracks, between − and +. − removes the last track and is
    off when one is left; + adds a track like the last one.
  - Then each track's size, as the page declares it (`repeat(3, 1fr)` is
    three sizes). A click copies it and a double-click edits it like any
    value; a bare number means the unit the tab shows (pixels, or rem), and
    an emptied field removes the track.
  - Before each size, a drawing says whether the track is fixed, hugs
    (`auto`, or a content size) or fills (a share of the space, `fr`). A
    click opens the menu of the three: hug writes `auto`, fill writes `1fr`,
    fixed writes the size the track has now in pixels.
  - Every change is one edit of `grid-template-columns` or
    `grid-template-rows`. Equal tracks are written as `repeat(n, size)`.
  - A list that is not one size per track (`auto-fill`, `auto-fit`, named
    lines, `subgrid`, a variable) stays one text value to edit, beside the
    number of tracks the browser laid out ("3 laid out"). So does a declared
    list that the browser did not lay out: a different number of columns, or
    a pixel size that is not the track's (for example from a `@container`
    rule, which is not evaluated).
  - Rows are shown only when the page declares them; rows a grid adds by
    itself are not counted.
  - A grid with no declared columns shows no Columns row.
  - More than four equal tracks (a 12-column grid) are shown as one size
    marked "each"; editing it, or its intent, changes them all. − and +
    still count one by one.
  - A size inside a function is shown as written (`minmax(100px, 1fr)`), in
    pixels whatever the unit switch says.
  - A pixel size counts as laid out when it is within half a pixel of the
    track, since layout snaps sizes to fractions of a pixel.
- **Grid item**: an element placed in a grid by hand shows Column and Row
  cells (`span 2`, `1 / 3`), to edit as `grid-column` and `grid-row`. An item
  the grid places itself shows neither.
- **Sizing intent**: per axis, `fixed` (a declared size), `hug` (sized by
  content) or `fill` (sized by the parent). Derived from declared styles
  and the parent's flex or grid settings. A size declared with `fit-content`,
  `max-content` or `min-content` is `hug`.
- **Changing the intent**: each word is a button that opens a menu of the
  three, with the current one checked; a click elsewhere in the tab, or Esc,
  closes it. A choice sets what the element's context needs, and what
  `sizingIntent` reads back as that intent:
  - in a block parent: the property alone (`100%` to fill, `fit-content` to
    hug, the size it has now for fixed);
  - along a flex parent's direction: the property (`auto`, or the size) and
    `flex-grow` (`1` to fill, `0` otherwise). Fixed and hug also set
    `flex-basis: auto`: an item with `flex: 1` has a basis of 0 and would
    shrink to nothing once it stops growing;
  - across a flex parent's direction: `auto` and `align-self` (`stretch` to
    fill; to hug, `flex-start` under a parent that stretches its items and
    `auto` under one that does not);
  - in a grid cell: `auto` and `justify-self` for the width, `align-self` for
    the height (`stretch` to fill; to hug, `start` under a grid that
    stretches its items and `auto` under one that does not).
    Choosing the intent the element already has makes no edit, even where it
    has it by default. A property that already has the value is left alone. The edits of one
    choice are listed apart in the Edits tab and are one step to undo
    (`together()` in `src/edits/history.ts`). An item of a grid with no declared size reads
    as `fill` on an axis the grid stretches it on, which is the default. An
    element with `position: absolute` or `fixed` is not an item of its parent's
    layout: with no declared size it reads `fill` on an axis where both sides
    are declared (`top` and `bottom`), `hug` otherwise, and is sized like a
    child of a block.
- **Box**: margin around padding around the content size. Clicking
  "margin" or "padding" copies all four sides; a double-click on the name
  edits them at once, as the shorthand (`12px 16px`). The block's title carries the
  element's `box-sizing`, which says which box `width` and `height` set; it
  copies and edits like any other value.
- **Effects**: after the Box, only when the element has one. Each group is a
  label and its rows:
  - **Shadow** and **Text shadow** (`box-shadow`, `text-shadow`): one row per
    shadow, in order: a swatch of its colour, `inset` when it is one,
    `x y blur spread` in the tab's unit (a text shadow has no spread), and
    the colour in the chosen format.
  - **Filter** and **Backdrop filter**: one row per function, name and
    argument (`blur 4px`, `brightness 1.1`).
  - **Gradient** (`background-image`): one row per layer that is a gradient,
    a strip painted with the gradient itself, its kind and direction or shape
    (`linear 135deg`, `radial circle`, `conic`), and its stops as swatch,
    colour and position (a stop with two positions keeps both). A layer that
    is `url(...)` is not an effect.
  - A click on a row copies that one shadow, function or gradient as a CSS
    value; a click on the label copies the whole property's value; a
    double-click on the label edits the whole property as text.
  - A shadow colour or gradient stop that equals one of the page's colour
    tokens reads "matches token --name". A shadow that equals a shadow token
    reads the same under the group; when the element declares the property
    with a token (`box-shadow: var(--shadow-md)`) the token's name is shown,
    as in the Layout block.
  - Shadow and gradient still take part in Compare (`shape-rows.ts`).
    Code: `src/panel/specs/effects-block.ts`, `effect-rows.ts`,
    `gradient-rows.ts`, `effect-tokens.ts`, `src/specs/effects.ts`,
    `gradients.ts`, `declarations.ts`. Tests: `tests/specs-effects.test.ts`.
- **Colors** (feature 7).
- **Typography**: family, weight, size, line height, tracking. Only for
  elements with text of their own.
- **Asset**: the first block, only for what shows a file; nothing is fetched.
  - An `<img>` (also in a `<picture>`): a small preview drawn from the pixels
    the page already decoded, the natural size beside the size it is shown at
    in board pixels (`1200 × 800 shown at 300 × 200`), a `2×` note when the
    file is a whole number (2 or more) of times bigger than shown on both
    axes, the file's name from its current source (`embedded` for a data
    URL), "Copy address" (the absolute URL) and "Download" (an `<a download>`
    made inside the inspector and clicked; a data URL is saved as
    `image.png`). A cross-origin file may open in the browser instead of
    saving, as the browser decides (`docs/usage.md`).
  - An inline `<svg>` (the element itself, not its shapes): its `viewBox` and
    size, and "Copy SVG", which copies its markup as it is on the page.
  - An element whose `background-image` has `url(...)` layers: one row per
    layer, the name and "Copy address". Gradient layers are in Effects.
    Code: `src/panel/specs/asset-block.ts`, `asset-image.ts`, `asset-rows.ts`,
    `src/specs/assets.ts`. Tests: `tests/specs-assets.test.ts`.
- **States**: after Typography, only when something is found. What each
  interaction state of the element changes (`:hover`, `:focus`,
  `:focus-visible`, `:focus-within`, `:active`, `:disabled`, `:checked`), read
  from the stylesheets without triggering the state. A rule belongs to a state
  for this element when one of its selectors contains the state and, with the
  state pseudo-classes taken out of that selector, the element matches what is
  left: `.button:hover` and `.card:hover .button` both count for a `.button`
  inside a `.card`. A selector with two states (`:hover:focus`) is listed
  under each. Only rules that apply now (`@media` and `@supports` as in the
  Specs tab). Per state: its name, then `property  value` rows, a swatch for a
  colour; a click copies `property: value`. Later rules win per property
  inside a state. A declaration that gives the value the element already has
  (a `var()` is read first) is left out. Read only. Shortcuts: a state inside
  `:is()`, `:where()` or `:not()` is found as text and leaves the function
  empty, so such a rule is not listed; selector specificity is ignored; a
  shorthand is compared with the computed shorthand as text. Code:
  `src/panel/specs/states-block.ts`, `state-rules.ts`, `state-changes.ts`,
  `src/specs/states.ts`. Tests: `tests/specs-states.test.ts`.
- **Motion**: one row per transition or animation, with its easing curve. A
  click on a row copies it. On a transition, a double-click on its duration
  or its easing edits that entry: the page's list has one entry per
  transition (a list the page gave short is repeated out to that many, as CSS
  does), the other entries keep what the page declared (a `var()` survives),
  and the whole `transition-duration` or `transition-timing-function` is
  written as ONE edit, the way a grid track writes the whole
  `grid-template-columns`. A double-click on the "Transition" label in the
  block's head (a muted note, beside the title) edits the whole `transition`
  as text. The fields list time, timing-function and transition tokens (see
  token suggestions). A token the element declares its duration, easing or
  transition with is named under the rows, as the Layout block names tokens.
  Animations (`animation-*`) stay read-only. Code:
  `src/panel/specs/motion-block.ts`, `motion-fields.ts`, `motion-notes.ts`,
  `src/specs/motion-entries.ts`. Tests: `tests/specs-motion-tokens.test.ts`.
- Lengths show as bare numbers in px, or in rem. The unit switch is in the
  action bar.
- **What a click copies** depends on the page's copy format (feature 15).
  `css`, the default: `24px`, and `padding: 12px 16px` for a box name.
  `sx`: `24`, and `py: 12, px: 16`. In rem, both formats copy rem.

**Editing a value.** A double-click turns a value into a field; a single
click still copies.

- Editable: width and height (each half of the size), box-sizing, display,
  gap, radius, opacity, stroke width, columns, the whole of a shadow, filter
  or gradient property (the label in the Effects block), each side of margin and padding and the four at once, each colour (background, border,
  text, fill, stroke), and family, weight, size, line height, tracking,
  transform, align and decoration of the text.
- Not editable, because they are made of several properties or are derived:
  the position on the board, the border (widths and style), "position", the
  content size in the box, a picked colour. In the Layout and Typography
  blocks such a value is dimmed, and a value that can be edited is tinted
  under the pointer, so the two read apart before any click.
- In the size, the × between width and height stands back, so they read as
  two values.
- The field holds the CSS value of the property, with its unit (`8px` where
  the tab shows `8`; the whole family list; `rgba(…)` for a translucent
  colour). For the size it holds the CSS `width` or `height`, which on an
  element sized by its content box is smaller than the size shown. On such
  an element the tooltip of the two fields says so; the Box block names the
  `box-sizing` on every element.
- Enter or leaving the field applies; Esc cancels typing. Arrow keys change a
  number by 1 (Shift: 10, Alt: 0.1), applied live, as in the All CSS tab; a
  run of them is one step to undo. Emptying the field removes the edit.
- **Opacity and other fractions.** A plain number that CSS keeps between 0
  and 1 (`opacity`, `fill-opacity`, `stroke-opacity`, `flood-opacity`,
  `stop-opacity`, `shape-image-threshold`) steps by 0.01, by 0.1 with Shift and
  by 0.001 with Alt, for the arrow keys and the drag alike, and never leaves 0
  to 1 (`stepKindOf` in `src/specs/steps.ts`). The All CSS tab's arrow keys
  follow the same steps.
- **Esc during a drag** cancels it: the value goes back to the one at the
  press (the earlier edit, or none), the drag leaves no edit and no step to
  undo, and the click that ends it still does not copy. That Esc is kept from
  the launcher and the page. A new press after it starts a new drag.
- **In rem mode** the field holds the length in rem (`0.5rem`, not `8px`), a
  bare number typed is rem, and the saved value is the rem one (`1.5rem`; the
  Edits tab shows `8px → 1.5rem`). A unit that was typed is kept. Arrow keys
  and the drag step by 0.25, by 1 with Shift and by 0.0625 with Alt (one pixel
  of a 16px root). Which step is used follows the text of the value: a length
  in rem steps in rem; a plain number (weight, line height, grid placement)
  and a length in px keep 1 / 10 / 0.1. The rem shown has up to three
  decimals, as the cells have, so a value that is not a multiple of a
  thousandth of a rem (13px is 0.8125rem) opens rounded.
  Code: `src/specs/steps.ts`.
- **Drag to scrub.** A value that is one number (`isOneNumber`: width, height,
  gap, radius, opacity, each side of the box, font size, line height,
  tracking, the size of a grid track, a numeric placement) changes when the
  user presses on it and drags sideways, without opening the field: 1 per
  pixel, 10 with Shift, 0.1 with Alt (the arrow keys' steps; a modifier
  pressed mid-drag changes the step from there without a jump). It starts
  after the pointer has moved 3 pixels; a press that moves less is still a
  click, and a double-click still opens the field. The pointer is captured,
  so the drag goes on outside the panel, with the `ew-resize` cursor. The
  value is the one at the press plus the distance, so it does not drift; the
  text changes in place and the tab redraws after the drag. The click that
  ends a drag does not copy. One drag is one step to undo, however long it
  lasts, and a drag that comes back to where it started leaves no edit
  (`beginScrub` / `endScrub` in `edits/history.ts`). A result the browser
  rejects (a negative width or padding) is not applied; a margin may go
  negative. The tooltip says "drag to change" only on values that can be
  dragged. Colours, keywords, lists (`12px 16px`) and the names "margin" and
  "padding" are not dragged.
- **Token suggestions.** While a value is a field, a list under it offers the
  page's tokens (CSS variables the element sees; only those with the page's
  token prefixes when it set some). A colour property (`color`,
  `background-color`, `border-color`, `fill`, `stroke`) lists tokens whose
  value is a colour; a length (sizes, gap, radius, the sides of the box, font
  size, line height, letter spacing, stroke width) lists tokens whose value is
  a length (`px`, `rem`, `calc()`…). A shadow (`box-shadow`, `text-shadow`, and
  the Effects block's labels) lists tokens whose value is one or more shadows
  with a colour, each drawn on a small square; a duration or a delay
  (`transition-duration`, `transition-delay`) lists tokens that are a single
  time (`150ms`, `0.2s`); `transition-timing-function` lists timing functions
  (`ease`, `cubic-bezier()`, `steps()`, `linear()`), each with its curve; the
  whole `transition` lists tokens that contain a time and more than a time
  (`all 150ms ease`). Other properties, a grid track, and a page with no such
  token get no list. Tokens that hold the field's value come
  first (a colour in any spelling; a length compared in pixels, a bare number
  being pixels; a shadow, a time, a timing function or a transition compared
  by what it does: `150ms` is `0.15s`, `ease` is its `cubic-bezier()`), then those whose name contains the typed text, ignoring case
  (`--sp` and `space` both find `--space-4`); each group by length of name.
  At most 8, none while the field only holds what it opened with and no token
  holds it. A click (which does not blur the field) or Enter on the
  highlighted item writes `var(--token)` and closes the field. Arrow keys
  still nudge a number; on text they walk the list. The first Esc closes a
  list that has a highlight; the next cancels the field. The list sits in the
  tab's scroll area, under the field or above it when there is no room, cut
  to fit and scrolling when neither side has room. Names are cut with an
  ellipsis, never a sideways scroll. Out of scope: All CSS fields, the colour
  picker. Code: `src/panel/token-list/`, `src/specs/suggest.ts`.
- A bare number is taken as pixels (rem, in rem mode) where the property
  wants a length (`24` for a gap, `12 16` for the sides of a box), and stays a number where it is
  a value of its own (opacity, weight). A value the browser rejects is
  dropped.
- The edit is the same as one from the All CSS tab: it goes through `edit()`
  (feature 10), is saved, shows in the Edits tab and in "Copy edits", and can
  be undone. An edited value is shown in the edit colour.
- While a value is a field, a click in it places the caret and does not copy.
  The double-click itself still copies the value once, as its first click.

Code: `src/panel/specs/` (`editable-field.ts`), `src/specs/*`. Tests:
`tests/specs.test.ts`, `tests/specs-edit.test.ts`, `tests/specs-scrub.test.ts`,
`tests/specs-grid.test.ts`, `tests/specs-tokens.test.ts`, unit tests in
`src/specs/`.

## 6. Component

The UI component an element belongs to. A page can say this in three ways,
each a "reader" in `src/specs/components/`, tried in this order:

1. `declared.ts`: `data-component`, `data-source` and `data-props` (JSON)
   attributes in the markup. Explicit, so it wins.
2. `react.ts`: React's internals, plus the `@ds-bundle` header a Claude
   Design export embeds for names and source paths.
3. `vue.ts`: Vue 3 (`__vueParentComponent`, the component whose template
   renders the element: name from `__name` or `name`, else the file's name;
   props; `__file` as the source) and Vue 2 (`__vue__` on a component's root,
   searched upward). Development builds.
4. `svelte.ts`: Svelte development builds (`__svelte_meta`): the component is
   named after the file the element was written in, and that file is its
   source. No props, and no line is shown.
5. `angular.ts`: Angular development mode, through the `ng` debug API on the
   page's window: `getComponent` for a host element, else `getOwningComponent`
   ("Inside component"), named by its class. Props are the inputs
   `getDirectiveMetadata` lists, with a signal input called for its value;
   without that call there are none. No source file.
6. `custom-element.ts`: a tag with a hyphen is a component; its attributes
   are its props. It looks at most five levels up, so an app shell far
   above an element is not reported as its component. It is last, so an
   Angular host such as `app-user-card` is named by the Angular reader on an
   Angular page and by this one anywhere else.

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

### Copy CSS

A button in the Specs tab's element header, beside the element's name and
size ("Copy CSS"; the icon alone under 360px), copies the styles the element
declares as CSS declarations, one per line, under a comment with its name
(`/* div.card */`):

- Declared means what the page's style rules that apply now say, plus the
  element's inline style: not inherited values, not the browser's defaults,
  not the computed list. Rules in an `@media` or `@supports` block that does
  not apply are left out.
- Shorthands stay shorthands and `var()` stays as written. The declarations
  are merged by a scratch element that is never on a page: a later
  declaration replaces an earlier one (and moves to the end), `!important`
  holds.
- The user's own edits are inline styles, so they are included.
- Selector specificity is ignored: the last matching declaration wins (the
  same shortcut as the token lookup). An element with no declared styles
  copies only the comment.

Code: `src/panel/specs/copy-css.ts`, `src/specs/declarations.ts`.
Tests: `tests/specs-copy-css.test.ts`, `src/specs/declarations.test.ts`.

## 7. Colours and tokens

Each colour is a row: swatch, value, its role (Background, Border, Text,
Fill, Stroke, Picked).

- **Format**: a HEX | RGB | HSL switch in the block's head sets how every
  colour of the Specs tab is shown (the rows, a comparison) and what a click
  copies: `#2F6BFF` (with the alpha beside it, not copied), `rgb(47 107 255)`
  or `hsl(223 100% 59%)`, and `rgb(47 107 255 / 50%)` when translucent. HSL is
  rounded to whole numbers. The choice is remembered per site with the
  panel's other settings (`colorFormat` in `__groma_panel`). The field a
  double-click opens, the token names and the token modes keep the page's own
  spelling.
- **Contrast**: the Text row has a line with the ratio of the text colour
  against the background behind it (`4.52 : 1`) and the WCAG level it meets
  (`AAA`, `AA`, `Fails AA`). Normal text needs 4.5 for AA and 7 for AAA;
  large text (24px, or 18.66px at weight 700) needs 3 and 4.5. The
  background is the nearest ancestor-or-self colour that is not transparent;
  translucent layers are composited down to an opaque one, the page's canvas
  counts as white, and so does the text colour's own alpha. Over a background
  image or gradient the line reads "over an image" with no number.
  `opacity`, blend modes and elements painted behind the text without being
  its ancestors are ignored (`shortcut:` in `src/specs/contrast.ts`).

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

- Declared values are read from the rules that apply now: a rule inside a
  `@media` or `@supports` block that does not apply to the page (or to the
  canvas frame) is skipped, so a mobile-only width does not win on a desktop
  page. Token themes and modes still read every rule, since a dark theme sits
  in a block that does not apply now. `@container` is not evaluated.

Code: `src/specs/tokens.ts`, `colors.ts`, `color-format.ts`, `contrast.ts`,
`src/page-styles.ts`, `src/panel/specs/color-block.ts`, `color-line.ts`,
`color-format-switch.ts`, `contrast-line.ts`.
Tests: `tests/specs-color.test.ts`.
Tests: `tests/specs.test.ts`.

## 8. Compare

- The compare action makes the pinned element the baseline (A). The next
  pinned element is B.
- The block lists only the specs that differ, as before → after, and
  counts the identical ones. Position and component are not compared.
- Stop, or Esc, ends the comparison.

Code: `src/specs/compare-specs.ts`, `src/panel/specs/compare-block.ts`.
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
- Arrow keys change a number by 1 (Shift: 10, Alt: 0.1), applied live;
  opacity by 0.01 / 0.1 / 0.001, within 0 to 1.
- The list keeps its scroll position after an edit, and focus follows to
  the row the user was moving to.
- Tag, id, classes and rect rows are read-only.
- The content editor changes an element's HTML, or a form control's value,
  on Ctrl/⌘+Enter; Reset restores the original.
- Edits are saved in `localStorage`, per page path, keyed by a selector
  that leads back to the same element (ids and classes escaped).
- Saved edits are not put back on the page by themselves: not when the page
  loads, and not when an element is pinned. A page that renders late would
  get some of them and not others, so the user decides.
  - When the page loads with edits saved on an earlier visit, a bar slides
    in under the tabs and says how many are not on the page, on every tab,
    with "Discard" and "Apply" buttons. It slides out once they are applied.
  - The bar is only about edits from an earlier visit. An edit made during
    this visit never brings it up, even if the page draws the element again
    and the edit is gone from it; switching "Show original" on and off puts
    every edit back.
  - The bar stays away while "Show original" is on: the user chose to look
    at the page without the edits.
  - "Apply" puts every saved edit back. It also leaves the view of the
    original page.
  - "Discard" removes the saved edits the bar counts and keeps those that
    are on the page. It is one step, which undo brings back; notes stay.
    The bar then stays and reads "N edits discarded" ("1 edit discarded")
    with one button, "Undo", which takes that step back and so puts the
    edits on the page again; the bar then slides out. The notice also ends,
    and the bar slides out, at the user's next edit, at an undo made
    elsewhere (the Edits tab's bar, Ctrl/⌘ + Z) and when an element is
    pinned. While shut the bar is out of reach of the keyboard and screen
    readers. Code: `src/panel/edits/apply-bar.ts`, `discard-notice.ts`.
  - An edit whose element is not on the page is not counted: there is
    nothing to put it on. It is listed as "Not on the page now".
  - The edits stay listed in the Edits tab and can be copied whether they
    are on the page or not.
  - The canvas shows the page anew in a frame. Edits that were on the page
    in this visit (made, or applied) are carried over to the frame and back;
    edits not yet applied are not.
  - A page can still call `Groma.replayOverrides(root?)` itself, after it
    renders.
- An edit made from a tab that still shows an element the page has removed
  is not kept. If the page drew the element again, the edit goes to the one
  that is there now.
- A value the browser would ignore (`banana` for a padding) is not kept: the
  row goes back to what it showed, and an edit that was there stays.
  `!important` typed after a value is applied as its priority.
- If storage is blocked or full, the edit still applies, and is kept in
  memory until the page goes away: it is listed, copied and undone like any
  other, and is only not there after a reload.
- Undoing or resetting the only edit of an element that had no inline style
  leaves it with no `style` attribute.
- Every edit goes through `edit()`, `nudgeEdit()` or `removeEdit()` in
  `src/edits/changes.ts`, which applies it, saves it and records it for undo.
  Do not call the functions of `style-overrides.ts` or `content-overrides.ts`
  for a user's edit from anywhere else.

Code: `src/panel/css/`, `src/edits/*`. Tests: `tests/edits.test.ts`.

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

Code: `src/export-diff.ts`, `src/panel/changes/`.
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
- A page that draws itself after the frame has loaded it (a design export
  that unpacks, an app that renders) gets its edits and its pin when their
  elements arrive: the frame's page is watched for up to ten seconds after
  each load (`src/canvas/late-page.ts`). A page that takes longer shows on
  the canvas without them.
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

Code: `src/canvas/` (`canvas.ts`, `view.ts`, `canvas.html`), `src/page.ts`,
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
- An edit that gives a property the value it had before its first edit
  (`flex-direction` row → column → row) is not listed: it removes the edit,
  as ↩ does. Values are compared as written (`red` is not `rgb(255, 0, 0)`).
  Undo and redo walk each step through such a removal.
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
  and resets. A run of arrow-key nudges on one value is one step, and so is
  a drag in the Specs tab (feature 5). The
  history is kept in memory: a reload keeps the edits and forgets the steps.
- The bar's actions carry their names beside the icons: "Undo", "Redo" and
  "Show original". Below 360px of panel width the names drop and the icons
  remain, with their tooltips.
- **Show the original page** (the eye): puts back what the page had, for
  every edit, without removing the edits; pressed again, it applies them
  again. While it is on, `Groma.replayOverrides()` does nothing, so a page
  that re-renders does not bring the edits back. Making an edit switches it
  off first.
- **`Groma.edits()` and `Groma.onEdits(listener)`** give a script on the page
  that same text, and tell it each time the text changes (an edit, undo or
  redo, a discard, a note; showing the original is not a change). The
  `gromajs` command's bridge client uses them to hand the edits to a coding
  agent (see [usage.md](usage.md#let-an-agent-read-the-edits-live-the-bridge)).
  Code: `src/edits/agent-api.ts`, `changed.ts`. Tests: `tests/agent-api.test.ts`.
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

Code: `src/panel/edits/`, `src/edits/changes.ts` and `edit-list.ts` (the
list), `history.ts` (undo), `src/edits/handoff.ts` (the text),
`src/edits/replay.ts` (`showOriginal`), `src/styles/edits.css`.
Tests: `tests/edits-tab.test.ts`, `src/edits/handoff.test.ts`.
