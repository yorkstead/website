# Command Center PWA refinement

## Discovery and boundaries

The existing manifest (`app/manifest.ts`) launches `/`, has explicit identity `/`, root scope, and four private shortcuts. `components/service-worker-register.tsx` registers the unchanged root worker only in production. `public/sw.js` intercepts only allowlisted public navigation; private routes go to the network. Dashboard pages independently verify owner sessions; `/dashboard` redirects signed-out visitors to `/login?next=/dashboard`. Login already defaults and returns to `/dashboard` after successful authentication. No custom install UI exists. The prior operator guide describes installing from the dashboard but incorrectly promises automatic biometric prompts and uses the old product name. No separate previous PWA discovery artifact was found in this checkout; these findings and the operator guide are the available evidence.

## Acceptance criteria

1. Manifest name is `Yorkstead Command Center`, short name `Yorkstead`, launch `/dashboard`, identity `/`, scope `/`.
2. Preserve all four shortcuts and existing owner authorization/return behavior (including Analytics' existing fallback to dashboard after login).
3. No custom install UI is added anywhere; any future custom UI must be inside an authenticated owner dashboard boundary.
4. Preserve worker bytes and its private-route exclusions; verify dashboard descendants, login, account and API bypass caching while public pages still cache.
5. Browser tests cover the served manifest, signed-out launches and shortcut redirects, plus successful login return to dashboard.
6. Document Android's delayed manifest updates, stable identity, reinstall fallback and lack of private offline access.

Non-goals: CC-026, marketing redesign, new install UX, authentication changes, shortcuts changes, database/configuration changes, merge or manual deployment.
