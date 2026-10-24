"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DialogBoundary } from "@/components/ui/dialog-boundary";
import type { ManualReadinessId } from "@/lib/portal-readiness-catalog";
import type { PortalReadinessView } from "@/lib/portal-readiness-service";
import type { ReadinessOperation } from "@/lib/portal-readiness-schema";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40";
export function PortalReadiness() {
  const [view, setView] = useState<PortalReadinessView | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(0),
    [refresh, setRefresh] = useState(0),
    [pending, setPending] = useState<{
      operation: ReadinessOperation;
      scope: string;
    } | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController(),
      current = ++generation.current;
    fetch(`/api/portal-readiness?page=${page}`, {
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
  }, [page, refresh]);
  function reload() {
    setView(null);
    setError("");
    setPending(null);
    setLoading(true);
    setRefresh((n) => n + 1);
  }
  function review(
    action: ReadinessOperation["action"],
    scope: string,
    requirementId?: ManualReadinessId,
  ) {
    if (!view) return;
    const base = {
      expectedRevision: view.revision,
      contextDigest: view.assessment.contextDigest,
      assessmentDigest: view.assessment.digest,
      confirmed: true as const,
    };
    const operation = (
      action === "attest"
        ? { action, ...base, requirementId }
        : { action, ...base }
    ) as ReadinessOperation;
    setPending({ operation, scope });
  }
  async function execute(operation: ReadinessOperation) {
    setBusy(true);
    const current = generation.current;
    try {
      const response = await fetch("/api/portal-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (current === generation.current) reload();
    } catch (e) {
      if (current === generation.current) {
        setError(e instanceof Error ? e.message : "Readiness unavailable");
        setView(null);
        setPending(null);
      }
    } finally {
      setBusy(false);
    }
  }
  const a = view?.assessment,
    canWrite = Boolean(view?.writesEnabled && !busy && !loading);
  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground">
        ← Command Center
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Portal Readiness</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Customer production access remains disabled. This is evidence and
        approval infrastructure only. Readiness is an assessment, never
        permission to launch, send invitations or onboard a customer.
      </p>
      <div className="my-5 flex flex-wrap items-center gap-3">
        <button className={button} disabled={busy} onClick={reload}>
          Refresh readiness
        </button>
        <span className="text-xs">
          {view?.writesEnabled
            ? "Disposable review registry enabled"
            : "Read-only assessment; production writes disabled"}
        </span>
      </div>
      {loading && <p role="status">Loading release assessment…</p>}
      {error && (
        <p
          role="alert"
          aria-label="Readiness error"
          className="my-5 rounded-lg border border-destructive p-4"
        >
          {error} Refresh and review current evidence.
        </p>
      )}
      {a && view && (
        <div className="space-y-7 break-words">
          <section
            aria-labelledby="overall"
            className="rounded-xl border border-border p-5"
          >
            <h2 id="overall" className="text-xl font-semibold">
              Global review: {a.globalReady ? "Evidence complete" : "Blocked"}
            </h2>
            <p className="mt-3 text-sm">
              Launch ready: no · Customer access enabled: no · Contract version{" "}
              {a.version} · Revision {view.revision}
            </p>
            <p className="mt-3 text-sm">
              Decision: {a.decision.state}
              {a.decision.actor ? ` · Owner ${a.decision.actor}` : ""}
            </p>
            {a.decision.expiresAt && (
              <p className="mt-2 text-xs">
                Decision expires {a.decision.expiresAt}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              An acknowledgment records review only. Mandatory technical
              failures, unknowns and expired evidence remain blockers. Global
              approval never qualifies individual customers.
            </p>
            <dl className="mt-4 grid gap-2 font-mono text-xs">
              <div>
                <dt>Release</dt>
                <dd>
                  {a.context.releaseId} · {a.context.environment}
                </dd>
              </div>
              <div>
                <dt>Code revision</dt>
                <dd>{a.context.codeRevision ?? "Not verified"}</dd>
              </div>
              <div>
                <dt>Schema</dt>
                <dd>
                  {a.context.schemaVersion} · {a.context.schemaIdentity}
                </dd>
              </div>
              <div>
                <dt>Configuration identity</dt>
                <dd>{a.context.configurationIdentity ?? "Not verified"}</dd>
              </div>
              <div>
                <dt>Assessment digest</dt>
                <dd>{a.digest}</dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="blockers">
            <h2 id="blockers" className="text-xl font-semibold">
              Critical global blockers
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {a.criticalBlockers.map((id) => (
                <li key={id}>
                  {a.requirements.find((r) => r.id === id)?.description} ·{" "}
                  {a.requirements
                    .find((r) => r.id === id)
                    ?.status.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
            {!a.criticalBlockers.length && (
              <p>
                Global mandatory evidence is current. Customer-specific
                authorization and separate activation are still required.
              </p>
            )}
          </section>
          <section aria-labelledby="technical">
            <h2 id="technical" className="text-xl font-semibold">
              Technical verification checklist
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              Only trusted server adapters create technical evidence. Production
              secrets, DNS, live delivery, transport, recovery and monitoring
              are not inspected here. Unknown means unverified; successful
              deployment is insufficient.
            </p>
            <button
              className={button}
              disabled={!canWrite}
              onClick={() =>
                review(
                  "verify",
                  "Record the current allowlisted server observations for this exact release context. This sends no messages, performs no live production inspection and changes no customer state. Existing decisions will be invalidated.",
                )
              }
            >
              Review server verification
            </button>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {a.requirements
                .filter((r) => r.scope === "global" && r.kind === "technical")
                .map((r) => (
                  <article
                    className="rounded-lg border border-border p-4"
                    key={r.id}
                  >
                    <h3 className="font-medium">{r.description}</h3>
                    <p className="mt-2 font-mono text-xs">
                      {r.id} · {r.category} · {r.severity} ·{" "}
                      {r.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-sm">{r.reason}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dependency: {r.dependency}
                    </p>
                    <p className="mt-2 text-xs">
                      Responsible: {r.role} · {r.approval}
                    </p>
                    <p className="mt-2 text-xs">
                      Source: {r.source} · Verified{" "}
                      {r.verifiedAt ?? "not verified"} · Expires{" "}
                      {r.expiresAt ?? "unverified"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Invalidation: {r.invalidation}; maximum age{" "}
                      {r.ttlSeconds / 3600} hours.
                    </p>
                  </article>
                ))}
            </div>
          </section>
          <section aria-labelledby="attestations">
            <h2 id="attestations" className="text-xl font-semibold">
              Owner attestations and accountable roles
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              Manual decisions are labeled separately. Attesting means you
              reviewed the runbook and role assignment outside this interface.
              It never changes technical results. No free-text evidence,
              secrets, customer details or connection strings are accepted.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {a.requirements
                .filter((r) => r.kind === "manual")
                .map((r) => (
                  <article
                    className="rounded-lg border border-border p-4"
                    key={r.id}
                  >
                    <h3>{r.description}</h3>
                    <p className="my-2 text-xs">
                      {r.id} · {r.status.replaceAll("_", " ")} · {r.role}
                    </p>
                    <p className="my-2 text-xs">
                      Owner {r.evidenceActor ?? "not recorded"} · Verified{" "}
                      {r.verifiedAt ?? "not verified"} · Expires{" "}
                      {r.expiresAt ?? "unverified"}
                    </p>
                    <button
                      className={button}
                      disabled={!canWrite}
                      onClick={() =>
                        review(
                          "attest",
                          `Record an owner attestation for ${r.id}: ${r.description}. This is not a technical verification and cannot override any mandatory technical blocker. It expires in 24 hours and invalidates prior decisions.`,
                          r.id as ManualReadinessId,
                        )
                      }
                    >
                      Review attestation: {r.id}
                    </button>
                  </article>
                ))}
            </div>
          </section>
          <section aria-labelledby="customer">
            <h2 id="customer" className="text-xl font-semibold">
              Customer-specific prerequisites
            </h2>
            <p className="my-3 text-sm">
              No existing customer is automatically eligible. This global
              registry reads no customer records and grants no customer
              authority.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {a.requirements
                .filter((r) => r.scope === "customer")
                .map((r) => (
                  <li key={r.id}>
                    {r.description} · {r.status.replaceAll("_", " ")} ·{" "}
                    {r.dependency}
                  </li>
                ))}
            </ul>
            <Link
              href="/dashboard/client-access"
              className="mt-4 inline-block text-sm text-primary underline"
            >
              Inspect Client Access separately
            </Link>
          </section>
          <section aria-labelledby="decision">
            <h2 id="decision" className="text-xl font-semibold">
              Revision-bound owner decision
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              Review this exact commit/schema/configuration and evidence digest.
              Changes or expiry make approvals stale. Neither acknowledgment nor
              approval can enable customer features.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className={button}
                disabled={!canWrite}
                onClick={() =>
                  review(
                    "acknowledge",
                    "Acknowledge the current assessment and all remaining blockers for this exact release revision. This does not mark any requirement passed or authorize a launch.",
                  )
                }
              >
                Review acknowledgment
              </button>
              <button
                className={button}
                disabled={!canWrite || !a.globalReady}
                onClick={() =>
                  review(
                    "approve",
                    "Approve only this current global evidence review. This does not authorize any customer, pilot, email, deployment or feature activation. Any changed or expired mandatory evidence invalidates this decision.",
                  )
                }
              >
                Review global approval
              </button>
              <button
                className={button}
                disabled={
                  !canWrite || ["none", "withdrawn"].includes(a.decision.state)
                }
                onClick={() =>
                  review(
                    "withdraw",
                    "Withdraw the current global review decision. Preserve all evidence/history and keep customer access disabled.",
                  )
                }
              >
                Review withdrawal
              </button>
            </div>
          </section>
          <section aria-labelledby="history">
            <h2 id="history" className="text-xl font-semibold">
              Approval and audit history
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Prior release contexts remain retained and stale. Current-context
              audit is paginated; no evidence is deleted.
            </p>
            {view.history.map((h) => (
              <article
                key={h.id}
                className="mt-3 rounded-lg border border-border p-4 text-xs"
              >
                <p>
                  {h.codeRevision ?? "Unknown commit"} · Schema{" "}
                  {h.schemaVersion} · Revision {h.revision} ·{" "}
                  {h.recordedDecision} · Validity {h.decision} ·{" "}
                  {h.currentContext ? "current context" : "prior context"}
                </p>
                <p className="mt-2">
                  Owner {h.actor} · {h.at} · Configuration{" "}
                  {h.configurationIdentity ?? "unverified"}
                </p>
              </article>
            ))}
            {view.audit.map((e) => (
              <p key={e.id} className="mt-3 text-xs">
                {e.at} · Revision {e.revision} · {e.event} ·{" "}
                {e.from ?? "created"} → {e.to} · Owner {e.actor}
              </p>
            ))}
            {!view.history.length && (
              <p className="mt-3 text-sm">
                No release review has been recorded.
              </p>
            )}
            <nav
              aria-label="Release history pages"
              className="mt-4 flex items-center gap-3"
            >
              <button
                className={button}
                disabled={!page || busy}
                onClick={() => {
                  setPage((n) => n - 1);
                  setView(null);
                  setPending(null);
                  setLoading(true);
                }}
              >
                Previous history
              </button>
              <span className="text-xs">Page {page + 1}</span>
              <button
                className={button}
                disabled={!view.more || busy}
                onClick={() => {
                  setPage((n) => n + 1);
                  setView(null);
                  setPending(null);
                  setLoading(true);
                }}
              >
                Next history
              </button>
            </nav>
          </section>
          <section aria-labelledby="runbook">
            <h2 id="runbook" className="text-xl font-semibold">
              Release runbook and rollback summary
            </h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">
              {view.runbook.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 text-sm">
              No production activation mechanism exists here. Restore deny gates
              and use reviewed scoped revocation only under separate operational
              authorization. Preserve audit, backups and revoked access; never
              copy old approvals to a new release.
            </p>
          </section>
        </div>
      )}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
          <DialogBoundary
            label="Confirm release review"
            onClose={() => {
              if (!busy) setPending(null);
            }}
          >
            <section className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-background p-6">
              <h2 className="text-xl font-semibold">
                Confirm exact review scope
              </h2>
              <p className="my-4 break-words text-sm leading-6">
                {pending.scope}
              </p>
              <p className="mb-4 break-all font-mono text-xs">
                Context {pending.operation.contextDigest} · Assessment{" "}
                {pending.operation.assessmentDigest} · Revision{" "}
                {pending.operation.expectedRevision}
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
                  Confirm review operation
                </button>
              </div>
            </section>
          </DialogBoundary>
        </div>
      )}
    </main>
  );
}
