# Professional entity identity — specification

## Objective
Make the Yorkstead Systems organization and Brandon York's professional founder identity consistently interpretable by people and search systems, while retaining useful client-facing content.

## Scope
- Keep the Organization ID at `https://yorkstead.com/#organization`.
- Publish one canonical Person ID at `https://yorkstead.com/brandon-york#person`.
- Create an indexable `/brandon-york` page with ProfilePage mainEntity referencing the Person.
- Retain `/about` as the business About page and link editorially to the founder profile.
- Preserve first-party work examples and their Organization-level attribution.
- Add sitemap, metadata, and schema regression coverage.
- No new CMS, database migration, authentication changes, external profile edits, or unverifiable personal profile sameAs links.

## Constraints
- No references to unrelated persons or legal/news matters.
- No fabricated credentials, clients, profile identities, or outcome metrics.
- No production domain changes in the implementation branch.
- No merge or deployment without owner approval.

## Acceptance
1. Person, ProfilePage, and Organization use stable, consistent IDs.
2. Profile page has a clear H1 and professional biography, canonical, indexable metadata, social previews, and editorially relevant internal links.
3. Sitemap includes the profile exactly once.
4. Existing public pages remain functional and organization-owned work attribution remains truthful.
5. Bun lint, typecheck, tests, and build pass; rendered metadata and HTTP checks completed when executable.
6. Canonical hostname conflict is documented as a separate owner-approved infrastructure change.
