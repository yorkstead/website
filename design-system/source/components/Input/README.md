The Input is a single-line text field, 44px tall (`control-lg`) for touch, with `radius-lg` corners and a 70% `background` fill.

**States**
- Placeholder: `muted-foreground` at 70%.
- Focus: the border turns `primary` and a 2px `primary` ring at 15% appears.
- Disabled: 50% opacity with a not-allowed cursor.

**The consumer provides** `type`, `name`, `value` or `defaultValue`, and an associated `Label` (12px/500, about 6px above the field). Every field needs a visible label, not just a placeholder.
