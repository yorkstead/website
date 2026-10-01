SiteHeader is the sticky top bar on every public page. It holds the `BrandMark`, the "Operations demo" external link (a `primary`-tinted mono pill), the `ThemeToggle` and a menu button that opens a Radix dropdown of the site navigation, with a mono row of section links below.

- It is `background` at 95% with backdrop blur and a bottom `border`. Height is `header` (56px, 64px from lg), inside the `content-max` container.
- The active link is worked out from the current path. In the app that comes from `next/navigation`; the previews always treat the path as `/`.

**The consumer provides** nothing. Render it once per page, above `<main>`. To add a navigation item, edit the `navigation` array in `components/site-header.tsx`.
