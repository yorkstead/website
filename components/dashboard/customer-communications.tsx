"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommunicationsView } from "@/lib/customer-communications";
const panel = "mt-6 rounded-xl border border-border bg-card p-5";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40";
export function CustomerCommunications() {
  const [view, setView] = useState<CommunicationsView | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(0),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/customer-communications?page=${page}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Communications temporarily unavailable. Refresh to try again.",
          );
        const data: CommunicationsView = await response.json();
        if (!controller.signal.aborted) setView(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setView(null);
          setError(
            "Communications temporarily unavailable. Refresh to try again.",
          );
        }
      });
    return () => controller.abort();
  }, [page, refresh]);
  function reload(next = page) {
    setView(null);
    setError("");
    setPage(next);
    setRefresh((n) => n + 1);
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <Link href="/dashboard" className="text-sm text-primary">
        Back to workspace
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Customer Communications</h1>
      <p className="mt-3 text-muted-foreground">
        Read-only delivery and security history. Production delivery, recovery
        and webhook ingestion are disabled.
      </p>
      <button className={`${button} mt-4`} onClick={() => reload()}>
        Refresh communications
      </button>
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
      {!view && !error && (
        <p role="status" className="mt-4">
          Loading communications…
        </p>
      )}
      {view && (
        <>
          <section aria-label="Communications readiness" className={panel}>
            <h2 className="text-xl font-semibold">Release blockers</h2>
            <p className="mt-3">Provider: {view.provider}</p>
            <p className="mt-2">Recovery: {view.recovery}</p>
            <p className="mt-2">
              Provider acceptance is separate from delivery confirmation.
              Neither verifies email ownership or invitation redemption.
            </p>
            <Link
              className="mt-3 inline-block text-primary"
              href="/dashboard/portal-readiness"
            >
              Review Portal Readiness
            </Link>
          </section>
          <section aria-label="Delivery queue health" className={panel}>
            <h2 className="text-xl font-semibold">Delivery queue health</h2>
            {view.queue.length ? (
              <ul className="mt-3 space-y-2">
                {view.queue.map((q) => (
                  <li key={q.state}>
                    {q.state}: {q.count} · retries: {q.retries}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3">No queued notifications.</p>
            )}
            <h3 className="mt-4 font-semibold">Delivery observations</h3>
            {view.delivery.map((d) => (
              <p key={d.status}>
                {d.status}: {d.count}
              </p>
            ))}
          </section>
          <section aria-label="Suppression status" className={panel}>
            <h2 className="text-xl font-semibold">
              Bounces, complaints and suppressions
            </h2>
            {view.suppressions.length ? (
              view.suppressions.map((s) => (
                <p className="mt-2" key={s.reason}>
                  {s.reason}: {s.count}
                </p>
              ))
            ) : (
              <p className="mt-3">No recorded suppressions.</p>
            )}
          </section>
          <section aria-label="Message lifecycle" className={panel}>
            <h2 className="text-xl font-semibold">Message lifecycle</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Safe metadata only. No recipients, action links or message bodies.
            </p>
            <div className="mt-3 space-y-3">
              {view.jobs.map((j) => (
                <article
                  key={j.id}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="break-all font-mono text-xs">{j.id}</p>
                  <p>
                    {j.type}: {j.state} · {j.delivery}
                  </p>
                  <p>
                    Attempts: {j.attempts} · Failure: {j.failure ?? "none"}
                  </p>
                  <p className="text-sm">
                    Created: {j.createdAt} · Expires: {j.expiresAt}
                  </p>
                </article>
              ))}
              {!view.jobs.length && <p>No delivery history.</p>}
            </div>
          </section>
          <section aria-label="Security and audit history" className={panel}>
            <h2 className="text-xl font-semibold">
              Security and audit history
            </h2>
            <ul className="mt-3 space-y-2">
              {view.audit.map((a) => (
                <li key={a.id}>
                  {a.event} · {a.at}
                </li>
              ))}
            </ul>
            {!view.audit.length && <p className="mt-3">No recorded events.</p>}
          </section>
          <nav
            aria-label="Communications history pages"
            className="mt-4 flex items-center gap-3"
          >
            <button
              className={button}
              disabled={page === 0}
              onClick={() => reload(page - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className={button}
              disabled={!view.hasMore}
              onClick={() => reload(page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
