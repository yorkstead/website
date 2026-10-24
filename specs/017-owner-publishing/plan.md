# Implementation plan

1. Verify latest main includes PR #59 and migrations 0013/0014; create new branch.
2. Add an owner-verified transactional workspace/candidate/status/approved-preview read to the existing service, reusing its source-first lock order, source extraction and projection assembler. Retain CC-008 transitions unchanged.
3. Add strict, owner-only GET/POST controller and lazy runtime adapter with configured-origin CSRF, bounded requests and private no-store responses.
4. Build Client Publishing within the existing dashboard navigation: selector, candidates, exact draft review, per-record explicit transitions, approved preview and audit. Use responsive native controls, accessible messages, pending state and request cancellation/selection guards.
5. Test service/transport with fictional PostgreSQL fixtures and owner browser flows. Verify the security boundaries, historical migration bytes and production customer gates; record checks, update handoff and open an unmerged PR.
