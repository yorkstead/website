The Card is the site's container: a `card` fill, a 1px `border` and `radius-xl` corners, with no shadow. `CardContent` pads it at 20px (`space-5`).

**Use** it for pillars, case studies, industries and form panels. The usual content order is:
1. A `micro` mono kicker in `primary` (`02 // REAL OWNERSHIP`)
2. A `card-title` heading, 12px below the kicker
3. `body` copy in `muted-foreground`

**The consumer provides** `children`, plus any hover treatment (for example `hover:border-primary/40`).

**Don't** add drop shadows, colored left borders or gradients. Keep separation to borders.
