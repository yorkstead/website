PaginationControls is the bar under paginated lists. It reads "Showing 11–20 of 34 projects", followed by outline `sm` Buttons for Previous and Next and a mono page counter. A Button is disabled when its href is null.

**The consumer provides** `pagination` (from `createPagination` in `lib/pagination.ts`), `previousHref`, `nextHref`, and the plural `noun`.
