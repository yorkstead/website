# Slice 1 — Implementation Plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. `components/ui/button.tsx`: Update `buttonVariants` base classes with `transition-[colors,transform,box-shadow] duration-150 ease-out active:scale-[0.985] disabled:active:scale-100`.
2. `components/theme-toggle.tsx`: Render both `<Sun>` and `<Moon>` inside a `relative` wrapper with CSS `rotate`/`scale`/`opacity` transitions keyed off `.dark` so SSR/hydration stays clean.
3. `components/site-header.tsx` & `components/navigation/navigation-link-styles.ts`: Add subtle active bottom hairline (`after:` pseudo-element) on desktop links and `origin-top-right` entrance classes on `DropdownMenu.Content`.

## Rollback

Revert the four component/style files; zero state, route, or API impact.
