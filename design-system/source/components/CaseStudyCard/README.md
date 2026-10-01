CaseStudyCard is one project in the "Selected work" list, and the whole card links to `/work/<slug>`.

It shows, in order:
- the number and icon tile
- a `ProjectStatusBadge` with the kicker
- the title in 24px semibold, then the summary
- up to four industry `Badge`s
- the "Operating signal" line
- a screenshot frame (`ProjectMediaFrame`) when the study has preview media

On hover the border moves toward `primary` and the arrow slides right.

**The consumer provides** `study`: one `CaseStudy` from `lib/case-studies.ts`. The preview shows the site's first study, Rework Flow.
