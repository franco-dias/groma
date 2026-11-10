# Logo files

| File | What it is | Use it for |
| --- | --- | --- |
| `groma-logo.svg` | The mark on its dark tile, animated | Large, one-off placements |
| `groma-logo-static.svg` | The same mark, final frame, no animation | Favicons, social images, anywhere animation is stripped |
| `groma-logo-horizontal-light.svg` | Mark and name, name in dark ink, animated | Light backgrounds. The README's default |
| `groma-logo-horizontal-dark.svg` | Mark and name, name in light ink, animated | Dark backgrounds |

The tile is dark in every file, so the mark reads on any background. Only the
name changes between the light and dark lockups. The README switches between
them with a `<picture>` element that follows the reader's theme.

The animation is CSS inside the SVG and plays once: the staff and bar draw,
the plumb lines swing until they hang true, a red line measures between them,
then the name slides in. Each part's final state is its plain drawing, so a
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
