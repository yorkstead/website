# Plan
1. Add 0013 challenge and rate-limit persistence; preserve 0009–0012 sources of truth.
2. Implement trusted enrollment service with invitation/tenant locks, email-proof consumption and Better Auth password hashing; retain existing provider hooks.
3. Narrow HTTP controller with explicit gate, same-origin validation, shared throttling and generic failures; sign in with actual provider then redeem through CC-006.
4. Add gated customer UX and authorized synthetic portal; exclude customer paths from analytics/referrer/cache surfaces.
5. Add disposable tests and run required matrix; record release blockers and handoff.

Implementation refinement: a narrowly matched `proxy.ts` enforces true disabled HTTP 404 before React streaming. Component and API gates remain defense in depth; no owner/public matcher or authentication behavior changes.
