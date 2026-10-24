"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DialogBoundary } from "@/components/ui/dialog-boundary";
import type { ClientAccessView } from "@/lib/client-access-view";
import type { ClientAccessOperation } from "@/lib/client-access-schema";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40";
const field =
  "w-full rounded-lg border border-border bg-background p-2 text-sm";
export function ClientAccess() {
  const [view, setView] = useState<ClientAccessView | null>(null),
    [tenantId, setTenantId] = useState(""),
    [page, setPage] = useState(0),
    [organizationPage, setOrganizationPage] = useState(0),
    [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState<{
      operation: ClientAccessOperation;
      scope: string;
    } | null>(null);
  const [recipient, setRecipient] = useState(""),
    [projectIds, setProjectIds] = useState<string[]>([]),
    [tenantName, setTenantName] = useState(""),
    [newTenantId, setNewTenantId] = useState(""),
    [mappingId, setMappingId] = useState("");
  const generation = useRef(0),
    preparationKey = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(),
      current = ++generation.current;
    const query = new URLSearchParams({
      page: String(page),
      organizationPage: String(organizationPage),
    });
    if (tenantId) query.set("tenantId", tenantId);
    fetch(`/api/client-access?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (generation.current === current) {
          setView(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && generation.current === current) {
          setError(e.message);
          setView(null);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [tenantId, page, organizationPage, refresh]);
  function reload() {
    setLoading(true);
    setError("");
    setView(null);
    setPending(null);
    setRefresh((n) => n + 1);
  }
  async function execute(operation: ClientAccessOperation) {
    setBusy(true);
    setError("");
    const current = generation.current;
    try {
      const response = await fetch("/api/client-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      preparationKey.current = null;
      if (generation.current === current) reload();
    } catch (e) {
      if (generation.current === current) {
        setError(e instanceof Error ? e.message : "Administration unavailable");
        setPending(null);
        setView(null);
      }
    } finally {
      setBusy(false);
    }
  }
  function select(id: string) {
    setTenantId(id);
    setPage(0);
    setView(null);
    setPending(null);
    setError("");
    setLoading(true);
    setRecipient("");
    setProjectIds([]);
    preparationKey.current = null;
  }
  const selected = view?.selected;
  const canWrite = Boolean(view?.writesEnabled && !loading && !busy);
  function revoke(operation: ClientAccessOperation, scope: string) {
    setPending({ operation, scope });
  }
  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground">
        ← Command Center
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Client Access</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Inspect authoritative organization mappings and prepare onboarding.
        Customer enrollment and project access remain disabled. Invitations are
        never issued or sent here.
      </p>
      <div className="my-5 flex flex-wrap items-center gap-3">
        <button className={button} disabled={busy} onClick={reload}>
          Refresh access records
        </button>
        <span className="text-xs">
          {view?.writesEnabled
            ? "Disposable administration enabled"
            : "Read-only administration; production writes disabled"}
        </span>
      </div>
      {error && (
        <p
          role="alert" aria-label="Client Access error"
          className="my-4 rounded-lg border border-destructive p-4"
        >
          {error} Refresh and review records before retrying.
        </p>
      )}
      {loading && <p role="status">Loading access records…</p>}
      {view && (
        <>
          <label className="block max-w-xl text-sm">
            Organization
            <select
              aria-label="Organization"
              className={`${field} mt-2`}
              value={tenantId}
              disabled={busy}
              onChange={(e) => select(e.target.value)}
            >
              <option value="">Select an organization</option>
              {view.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.status} · {o.id}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex gap-3">
            <button
              className={button}
              disabled={!organizationPage || busy}
              onClick={() => {
                select("");
                setOrganizationPage((n) => n - 1);
              }}
            >
              Previous organizations
            </button>
            <button
              className={button}
              disabled={!view.organizationsMore || busy}
              onClick={() => {
                select("");
                setOrganizationPage((n) => n + 1);
              }}
            >
              Next organizations
            </button>
          </div>
          {!view.organizations.length && (
            <p className="mt-4">No registered organizations on this page.</p>
          )}
          <details className="mt-6 rounded-lg border border-border p-4">
            <summary>Create disabled organization (disposable only)</summary>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void execute({
                  action: "createTenant",
                  tenantId: newTenantId,
                  name: tenantName,
                });
              }}
            >
              <label>
                Explicit organization ID
                <input
                  className={field}
                  required
                  maxLength={128}
                  value={newTenantId}
                  disabled={!canWrite}
                  onChange={(e) => setNewTenantId(e.target.value)}
                />
              </label>
              <label>
                Organization name
                <input
                  className={field}
                  required
                  maxLength={200}
                  value={tenantName}
                  disabled={!canWrite}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </label>
              <button className={button} disabled={!canWrite}>
                Create disabled organization
              </button>
            </form>
          </details>
        </>
      )}
      {selected && (
        <div className="mt-8 space-y-7 break-words">
          <section aria-labelledby="readiness">
            <h2 id="readiness" className="text-xl font-semibold">
              {selected.name} — onboarding readiness
            </h2>
            <p className="mt-2">
              Tenant: {selected.status} · Revision {selected.revision} · Launch
              blocked
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {selected.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              An invitation record alone never makes a customer launch-ready.
              Identity, membership and grants must all be active for effective
              access.
            </p>
            <form
              className="mt-4 flex flex-wrap gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void execute({
                  action: "renameTenant",
                  tenantId: selected.id,
                  name: tenantName,
                  expectedRevision: selected.revision,
                });
              }}
            >
              <label className="text-sm">
                New organization name
                <input
                  className={field}
                  required
                  maxLength={200}
                  value={tenantName}
                  disabled={!canWrite}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </label>
              <button className={button} disabled={!canWrite}>
                Rename organization
              </button>
            </form>
          </section>
          <section aria-labelledby="projects">
            <h2 id="projects" className="text-xl font-semibold">
              Project mappings
            </h2>
            {!selected.projects.length && <p>No mappings on this page.</p>}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {selected.projects.map((p) => (
                <article
                  key={p.id}
                  className="rounded-lg border border-border p-4"
                >
                  <h3 className="font-medium">{p.id}</h3>
                  <p className="mt-2 text-sm">
                    {p.status} · Revision {p.revision} · Source{" "}
                    {p.sourceExists ? "present" : "missing"} · Approved content{" "}
                    {p.approvedContent ? "present" : "missing"}
                  </p>
                  <ul className="my-3 list-disc pl-5 text-sm">
                    {p.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <button
                    className={button}
                    disabled={!canWrite || p.status === "archived"}
                    onClick={() =>
                      revoke(
                        {
                          action: "archiveMapping",
                          tenantId: selected.id,
                          projectId: p.id,
                          expectedRevision: p.revision,
                          confirmed: true,
                        },
                        `Archive mapping ${p.id} in organization ${selected.id}. All project access through this mapping becomes unusable; grants remain unchanged.`,
                      )
                    }
                  >
                    Review mapping archival
                  </button>
                </article>
              ))}
            </div>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void execute({
                  action: "createMapping",
                  tenantId: selected.id,
                  projectId: mappingId,
                });
              }}
            >
              <label className="text-sm">
                Existing persisted project ID
                <input
                  className={field}
                  required
                  maxLength={200}
                  value={mappingId}
                  disabled={!canWrite}
                  onChange={(e) => setMappingId(e.target.value)}
                />
              </label>
              <button className={button} disabled={!canWrite}>
                Create disabled mapping
              </button>
              <p className="text-xs text-muted-foreground">
                Explicit IDs only. No inferred organizations, grants, activation
                or publication.
              </p>
            </form>
          </section>
          <section aria-labelledby="identities">
            <h2 id="identities" className="text-xl font-semibold">
              Customer identities and memberships
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Associated identities only. Orphaned means this membership has no
              project grants. Unassociated identities are not assigned by email
              or organization name. Identity suspension and reactivation are
              unavailable.
            </p>
            {!selected.identities.length && (
              <p className="mt-3">No associated identities on this page.</p>
            )}
            {selected.identities.map((i) => (
              <article
                key={i.id}
                className="mt-3 rounded-lg border border-border p-4"
              >
                <h3>{i.email}</h3>
                <p className="my-2 text-sm">
                  Identity {i.id}: {i.status} · Membership {i.membershipStatus}{" "}
                  · Role {i.role} · Revision {i.revision}
                  {i.orphaned ? " · Orphaned (no grants)" : ""}
                </p>
                <button
                  className={button}
                  disabled={
                    !canWrite ||
                    !i.revision ||
                    i.membershipStatus === "suspended"
                  }
                  onClick={() =>
                    revoke(
                      {
                        action: "suspendMembership",
                        tenantId: selected.id,
                        identityId: i.id,
                        expectedRevision: i.revision!,
                        confirmed: true,
                      },
                      `Suspend membership ${i.id} in organization ${selected.id}. This removes access to every project in this organization; other organizations remain unchanged.`,
                    )
                  }
                >
                  Review membership suspension
                </button>
              </article>
            ))}
          </section>
          <section aria-labelledby="grants">
            <h2 id="grants" className="text-xl font-semibold">
              Project grants
            </h2>
            {!selected.grants.length && (
              <p className="mt-3">No grants on this page.</p>
            )}
            {selected.grants.map((g) => (
              <article
                key={`${g.projectId}:${g.identityId}`}
                className="mt-3 rounded-lg border border-border p-4"
              >
                <p>
                  {g.projectId} → {g.identityId}
                </p>
                <p className="my-2 text-sm">
                  {g.permission} · {g.status} · Effective{" "}
                  {g.effective ? "yes" : "no"} · Revision {g.revision}
                </p>
                <button
                  className={button}
                  disabled={!canWrite || g.status === "revoked"}
                  onClick={() =>
                    revoke(
                      {
                        action: "revokeGrant",
                        tenantId: selected.id,
                        identityId: g.identityId,
                        projectId: g.projectId,
                        expectedRevision: g.revision,
                        confirmed: true,
                      },
                      `Revoke view grant for identity ${g.identityId}, project ${g.projectId}, organization ${selected.id}. Other project grants remain unchanged.`,
                    )
                  }
                >
                  Review grant revocation
                </button>
              </article>
            ))}
          </section>
          <section aria-labelledby="preparations">
            <h2 id="preparations" className="text-xl font-semibold">
              Prepared invitation configurations
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparation saves configuration only. It creates no invitation
              token, issuance, delivery or email proof. Expiry duration applies
              only after a separately authorized future issuance.
            </p>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                preparationKey.current ??= crypto.randomUUID();
                setPending({
                  operation: {
                    action: "prepareInvitation",
                    tenantId: selected.id,
                    preparationId: preparationKey.current,
                    recipientEmail: recipient,
                    projectIds,
                    expiresInSeconds: 86400,
                  },
                  scope: `Prepare invitation configuration for ${recipient} in organization ${selected.id}, projects ${projectIds.join(", ")}. Expiry duration: 24 hours after future issuance. No token will be created or delivered.`,
                });
              }}
            >
              <label className="text-sm">
                Intended recipient
                <input
                  className={field}
                  type="email"
                  required
                  maxLength={320}
                  value={recipient}
                  disabled={!canWrite}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    preparationKey.current = null;
                  }}
                />
              </label>
              <fieldset disabled={!canWrite}>
                <legend className="mb-2 text-sm">
                  Explicit project scope (current page)
                </legend>
                {selected.projects
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <label
                      className="mb-2 flex items-start gap-2 text-sm"
                      key={p.id}
                    >
                      <input
                        type="checkbox"
                        checked={projectIds.includes(p.id)}
                        onChange={(e) => {
                          setProjectIds((ids) =>
                            e.target.checked
                              ? [...ids, p.id]
                              : ids.filter((id) => id !== p.id),
                          );
                          preparationKey.current = null;
                        }}
                      />
                      {p.id}
                    </label>
                  ))}
              </fieldset>
              <button
                className={button}
                disabled={
                  !canWrite ||
                  !projectIds.length ||
                  selected.status !== "active"
                }
              >
                Review preparation
              </button>
            </form>
            {selected.preparations.map((p) => (
              <article
                className="mt-3 rounded-lg border border-border p-4"
                key={p.id}
              >
                <p>Prepared only · {p.recipient}</p>
                <p className="mt-2 text-sm">
                  {p.projects.join(", ")} · Duration {p.expiresInSeconds}{" "}
                  seconds · Prepared {p.createdAt}
                </p>
              </article>
            ))}
          </section>
          <section aria-labelledby="invitations">
            <h2 id="invitations" className="text-xl font-semibold">
              Issued invitations
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Issued records are distinct from prepared configuration. Delivery
              is unknown/unavailable. Redeemed records reflect the existing
              verified redemption lifecycle.
            </p>
            {!selected.invitations.length && (
              <p className="mt-3">No issued invitations on this page.</p>
            )}
            {selected.invitations.map((i) => (
              <article
                className="mt-3 rounded-lg border border-border p-4"
                key={i.id}
              >
                <p>
                  {i.recipient} ·{" "}
                  {i.expired ? "expired (pending record)" : i.status}
                </p>
                <p className="my-2 text-sm">
                  {i.id} · {i.projects.join(", ")} · Expires {i.expiresAt} ·
                  Revision {i.revision}
                </p>
                {i.revokedAt && (
                  <p className="my-2 text-sm">
                    Revoked/superseded {i.revokedAt}
                  </p>
                )}
                {i.redeemedAt && (
                  <p className="my-2 text-sm">
                    Verified and redeemed {i.redeemedAt}
                  </p>
                )}
                <button
                  className={button}
                  disabled={!canWrite || i.status !== "pending"}
                  onClick={() =>
                    revoke(
                      {
                        action: "revokeInvitation",
                        tenantId: selected.id,
                        invitationId: i.id,
                        expectedRevision: i.revision,
                        confirmed: true,
                      },
                      `Revoke pending invitation ${i.id} for ${i.recipient}, organization ${selected.id}, projects ${i.projects.join(", ")}. This prevents redemption; existing grants are unchanged.`,
                    )
                  }
                >
                  Review invitation revocation
                </button>
              </article>
            ))}
          </section>
          <section aria-labelledby="audit">
            <h2 id="audit" className="text-xl font-semibold">
              Lifecycle audit history
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Newest events first, paginated. Older events are retained.
              Administrative events cover this workspace; existing invitation
              history remains authoritative.
            </p>
            {selected.audit.map((a) => (
              <p className="mt-3 text-xs" key={a.id}>
                {a.at} · {a.type} {a.recordId} · {a.projectId} {a.identityId} ·{" "}
                {a.from ?? "created"} → {a.to} · Revision {a.revision} · Owner{" "}
                {a.actor}
              </p>
            ))}
            {selected.invitationAudit.map((a) => (
              <p className="mt-3 text-xs" key={a.id}>
                {a.at} · Invitation {a.invitationId} · {a.event} · Actor{" "}
                {a.actor}
              </p>
            ))}
            {!selected.audit.length && !selected.invitationAudit.length && (
              <p className="mt-3">No recorded lifecycle events on this page.</p>
            )}
          </section>
          <nav
            aria-label="Access record pages"
            className="flex flex-wrap items-center gap-3"
          >
            <button
              className={button}
              disabled={!page || busy}
              onClick={() => {
                setPage((n) => n - 1);
                setPending(null);
                setView(null);
                setLoading(true);
              }}
            >
              Previous records
            </button>
            <span className="text-sm">
              Page {page + 1} · Up to 25 per collection
            </span>
            <button
              className={button}
              disabled={!selected.more || busy}
              onClick={() => {
                setPage((n) => n + 1);
                setProjectIds([]);
                setPending(null);
                setView(null);
                setLoading(true);
              }}
            >
              Next records
            </button>
          </nav>
        </div>
      )}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
          <DialogBoundary
            label="Confirm exact scope"
            onClose={() => {
              if (!busy) setPending(null);
            }}
          >
            <section className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-background p-6">
              <h2 id="confirm-access" className="text-xl font-semibold">
                Confirm exact scope
              </h2>
              <p className="my-4 break-words text-sm leading-6">
                {pending.scope}
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                No reactivation is available. Changed records require a fresh
                review.
              </p>
              <div className="flex gap-3">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => setPending(null)}
                >
                  Cancel
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void execute(pending.operation)}
                >
                  Confirm operation
                </button>
              </div>
            </section>
          </DialogBoundary>
        </div>
      )}
    </main>
  );
}
