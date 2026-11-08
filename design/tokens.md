# E.Rent design tokens

Three layers, defined in `app/globals.css`.

1. Primitives: `--black #000`, `--white #fff`, `--grey-500 #808080`, `--grey-700 #595959`, `--grey-950`, `--grey-900`, `--grey-200`, `--grey-100`.
2. Semantic: background, surface, border, foreground, muted, primary. Light and dark values.
3. Tailwind: mapped through `@theme inline`, used as `bg-background`, `text-muted`, `border-border`.

Contrast: `#808080` on white is ~3.9:1, so secondary text on white uses `#595959` (~7:1). On black, `#808080` passes (~5.3:1).

Spacing 4 and 8 grid. Radius 8px (12px for large surfaces). Borders over shadows. One family (Inter), weights 400, 500, 600. House photography is the only colour on screen.
