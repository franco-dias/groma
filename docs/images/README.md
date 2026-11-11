# Logo files

| File | What it is | Use it for |
| --- | --- | --- |
| `groma-logo.svg` | The mark on its dark tile, animated | Large, one-off placements |
| `groma-logo-static.svg` | The same mark, no animation, with a heavier line so it holds at 16px | Favicons, social images, anywhere animation is stripped |
| `groma-logo-horizontal-light.svg` | Mark and name, name in dark ink, animated | Light backgrounds. The README's default |
| `groma-logo-horizontal-dark.svg` | Mark and name, name in light ink, animated | Dark backgrounds |

The tile is dark in every file, so the mark reads on any background. Only the
name changes between the light and dark lockups. The README switches between
them with a `<picture>` element that follows the reader's theme.

## The mark

It is the mark of the landing page (top left), drawn at a larger size: a groma
seen from the side. A staff with a foot, a cross bar, and a plumb line with its
bob hanging from each end of the bar, in soft blue (`#7aa2ff`) on a dark tile
with a vertical gradient (`#1a1e25` to `#0f1115`) and a faint white ring.

The landing page draws it on a 24-unit grid at 20px inside a 28px tile, with a
1.6 line and round ends. Here the tile is 64 units, so the drawing is scaled by
(20 / 28 × 64) / 24 and centred: line 3.05 units, bobs of radius 2.48. The
static file uses a 4.2 line instead, so the lines do not disappear in a
browser tab.

The animation is CSS inside the SVG and plays once: the staff and its foot
draw, then the bar, the plumb lines drop from its ends and the bobs fall into
place, then the name slides in. Each part's final state is its plain drawing, so a
renderer that drops animations (or a reader who prefers reduced motion)
shows the finished logo. Do not change that: animate *from* a start state,
never *to* the resting one.

## The name

The name is "Groma" in Geist SemiBold (Copyright 2024 The Geist Project
Authors, SIL Open Font License 1.1), converted to outlines so it looks the
same everywhere, with no font to load.

- Size 42 units on the mark's 64-unit grid, tracking -0.02 em, kerning applied.
- Gap of 18 units between the tile and the name; the name's capital height is
  centred on the tile.

To change the text, outline it again from the font file, shaping it with
HarfBuzz so the kerning is right, and replace the `<path class="word">` in both
lockups. The two lockups must stay identical apart from the name's fill.
