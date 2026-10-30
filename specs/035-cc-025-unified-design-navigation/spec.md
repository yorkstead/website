# CC-025: Unified Yorkstead Design System & Navigation

## User value

Visitors, owners and customers should recognize Yorkstead's visual language across the public site and authenticated workspaces, understand where they are, and reach the right section on desktop, tablet and phone without losing keyboard or assistive-technology access.

## In scope

1. Treat the existing semantic theme variables and design-system guidance as the shared presentation contract; consolidate navigation link styling so public, owner and customer navigation use the same semantic colors, focus treatment, spacing and active-state cues where their surface behavior permits.
2. Improve the public site's responsive navigation hierarchy and current-route indication while preserving every current destination and the brand/theme controls.
3. Improve owner navigation clarity and responsive usability while preserving route grouping, active hash behavior, collapse preference, mobile drawer keyboard behavior, and account/passkey access.
4. Improve customer portal section navigation at narrow and wide widths and expose the section currently in view to assistive technology.
5. Add focused automated coverage for responsive navigation, active/current state, keyboard operation and preservation of the existing portal and owner navigation behavior. Produce reviewable desktop and mobile screenshots.
6. Document discovery, implementation, verification evidence and any environment limitations in this spec and the active handoff.

## Acceptance criteria

- Yorkstead's current brand mark, semantic light/dark palette, type, existing theme preference and reduced-motion behavior remain intact.
- Semantic design tokens remain canonical; design-system token export continues to be generated/synchronized by the existing build script.
- Existing public destinations, owner destinations/hash links, and customer portal anchor sections remain functional.
- Public navigation works by keyboard and pointer, communicates active route, and fits common phone/tablet/desktop widths without page-level horizontal overflow.
- Owner navigation works at phone and desktop widths; collapsed and expanded preference, selected route/hash, Escape dismissal, focus return, and route access continue to work.
- Customer section navigation is scrollable/usable on small screens; active section state updates as the customer scrolls; links target the correct sections; focus visibility is clear.
- Navigation controls have meaningful accessible names, landmarks, current-state semantics, visible focus and adequate target sizes; reduced-motion is respected.
- No public intake, database access, auth, customer authorization, route, production-data or secret behavior changes.
- New focused automated tests pass. Desktop and mobile screenshots are captured from the implemented site and stored with the spec.
- Required repository verification is run and recorded with pass/fail/skip reasons; exactly one PR is opened with title `CC-025: Unified Yorkstead Design System & Navigation` when live GitHub access is available. No merge or deployment is performed.

## Non-goals

- Rebranding or changing Yorkstead's core palette, logos, type family or brand voice.
- Changing authentication, owner/customer permissions, route destinations, data contracts, lead capture or business workflows.
- Adding dependencies, migrations, new production configuration, external services or personalization/advertising identifiers.
- Reworking every page or dashboard module into a new component library.

## Rollback

Revert the CC-025 PR as one unit. The change is presentation-only and introduces no persisted data or schema changes.
