The ProjectStatusBadge shows the lifecycle state of a portfolio project, using an outline `Badge` in one of four status colors.

| status | tokens | meaning |
| --- | --- | --- |
| Live system | `status-live-*` | Currently used to run a real business |
| In development | `status-dev-*` | Being built and refined; may already be online |
| Concept prototype | `status-concept-*` | A working exploration of an idea, not a customer deployment |
| Previously used | `status-previous-*` | Used in a real workplace in the past; not currently in active use |

The text uses `status-*-fg`, the fill uses `status-*-fill` at 10%, and the border uses `status-*-border` at 30% in light and 25% in dark. The meaning is shown as a `title` tooltip. Every text color clears 5:1 on `card` in both themes.

**The consumer provides** `status`, which must be one of the four strings. Show `ProjectStatusLegend` nearby wherever several statuses appear.
