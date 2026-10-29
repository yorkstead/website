# Contact inquiry persistence recovery

## Status
In progress

## User outcome
Public contact submissions reliably persist as CRM inquiries and never imply CRM persistence when the database write failed.

## Scope
### In scope
- Correct PostgreSQL conflict inference for the existing partial unique index on `contact_inquiries(submission_key)`.
- Audit every public inquiry insertion path for the same conflict-target failure.
- Verify persistence and idempotent duplicate handling against a disposable PostgreSQL database initialized from repository migrations.
- Make the contact form's email-only recovery state explicit about the lack of CRM persistence.

### Out of scope
- Production data or schema operations, migrations, changes to uniqueness constraints, or changes to CRM authorization.
- Changes to unrelated intake flows except correcting the same invalid conflict target.

## Acceptance criteria
- A1: Contact submissions with a non-null submission key insert against the migration-created partial unique index.
- A2: Repeating the same submission key returns the existing duplicate outcome and does not create another inquiry.
- A3: Every audited public inquiry insertion path either infers the partial unique index with a matching predicate or uses untargeted conflict handling.
- A4: If CRM persistence fails but the owner notification email is delivered, the response identifies email-only handling and says the message was not saved in CRM. If email is unavailable, the response instructs direct email and does not claim receipt or persistence.
- A5: No production record or schema is changed.

## Constraints and compatibility
- Keep the existing partial unique index and schema unchanged.
- Preserve privacy-first public intake, existing rate limits, spam handling, and idempotency keys.
- No fabricated customer records or production mutations.

## Verification evidence
- Disposable PostgreSQL integration tests run after ordered repository migrations.
- Run the repository checks in `docs/verification.md` and the PR's required CI checks.
