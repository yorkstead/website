The Button is the site's single action control. It has four variants and three sizes and is built with `cva` on shadcn "new-york".

**Use**
- `default` (fill `primary`, `primary-foreground` text, `shadow-glow` halo): the one main action in a view, such as "Book a workflow audit". Use at most one per section.
- `secondary`: the second action beside a primary (`secondary` fill, `border`).
- `outline`: neutral actions and the icon-only theme toggle (50% `background`, `border`; on hover the border shifts toward `primary`).
- `ghost`: low-emphasis actions (Cancel, inline menu actions) in `muted-foreground`.
- Sizes: `default` is 36px tall (`control`) with 16px padding, `sm` is 32px with 12px text, and `icon` is a 36px square.

**The consumer provides** `children` (a label, optionally with a 16px lucide icon, which is sized automatically), `onClick` or `type`, and `asChild` to render a Next `<Link>` with button styling. Icon-only buttons must have an `aria-label`.

**Don't**
- Don't place two `default` buttons side by side.
- Don't recolor `primary` for emphasis.
- Don't use `primary` text on light grounds for long labels: the light pair measures 3.9:1, so keep labels short and at 14px/500.

Focus is a 2px `ring`. Disabled buttons drop to 50% opacity.
