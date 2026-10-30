SiteHeader is the shared sticky navigation on the homepage, Work, Walkthroughs, Solutions, Platform, Pricing & Model, and About pages. It holds the `BrandMark`, primary route links, a `ThemeToggle`, and a menu button that opens the same route list at smaller widths. The Walkthroughs action is called out as a `primary`-tinted mono pill between tablet and desktop breakpoints.

- It is `background` at 95% with backdrop blur and a bottom `border`. Height is `header` (56px, 64px from lg), inside the `content-max` container.
- At desktop widths the navigation links share the header row; at smaller widths the labelled menu button exposes the same destinations.
- The active route is worked out from the current path. In the app that comes from `next/navigation`; the previews always treat the path as `/`.

**The consumer provides** nothing. Render it once per page, above `<main>`. To add a navigation item, edit the `navigation` array in `components/site-header.tsx`.
