"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
const inputClass =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 focus-visible:outline-2 focus-visible:outline-primary";
export function CustomerEnrollmentForm({ screen }: { screen: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(
    screen === "enroll" || screen === "verify" ? "accept" : screen,
  );
  const [token, setToken] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const operation =
      stage === "accept" ? "begin" : stage === "verify" ? "complete" : stage;
    const body =
      stage === "accept"
        ? { token }
        : stage === "verify"
          ? {
              token,
              challengeId,
              proof: data.get("proof"),
              password: data.get("password"),
            }
          : stage === "sign-in"
            ? { email: data.get("email"), password: data.get("password") }
            : stage === "redeem"
              ? { token }
              : {};
    try {
      const response = await fetch(`/api/customer-enrollment/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        redirect: "error",
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to continue. Try again later.");
        return;
      }
      if (stage === "accept") {
        setChallengeId(result.challengeId);
        setStage("verify");
        setMessage(
          "If delivery is available, check the invited mailbox for your verification proof. It expires in ten minutes.",
        );
      } else if (stage === "sign-out") {
        router.push("/customer/sign-in");
        router.refresh();
      } else if (stage === "recovery") {
        setMessage(result.message);
      } else {
        setToken("");
        router.push("/customer/portal");
        router.refresh();
      }
    } catch {
      setMessage("Unable to continue. Try again later or contact Yorkstead.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm leading-6 text-muted-foreground">
        {stage === "verify"
          ? "Prove ownership of the invited email address. For an existing account, use its current password. For a new account, choose a password of 12–128 characters."
          : stage === "recovery"
            ? "Recovery delivery is not available. Contact Yorkstead through your established support channel. Never send your password or verification proof."
            : "Use your private invitation or your existing customer account. Owner sign-in is separate."}
      </p>
      {stage === "unavailable" ? (
        <p role="status">
          This invitation is invalid, expired, revoked or already used. Ask
          Yorkstead for assistance.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {["accept", "redeem"].includes(stage) && (
            <label className="block text-sm">
              Private invitation token
              <input
                className={inputClass}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                minLength={43}
                maxLength={43}
                autoComplete="off"
                spellCheck={false}
                type="password"
              />
            </label>
          )}
          {stage === "sign-in" && (
            <label className="block text-sm">
              Email address
              <input
                className={inputClass}
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={320}
              />
            </label>
          )}
          {stage === "verify" && (
            <label className="block text-sm">
              Email verification proof
              <input
                className={inputClass}
                name="proof"
                type="password"
                autoComplete="off"
                required
                minLength={43}
                maxLength={43}
                spellCheck={false}
              />
            </label>
          )}
          {["sign-in", "verify"].includes(stage) && (
            <label className="block text-sm">
              Password
              <input
                className={inputClass}
                name="password"
                type="password"
                autoComplete={
                  stage === "sign-in" ? "current-password" : "new-password"
                }
                required
                minLength={12}
                maxLength={128}
              />
            </label>
          )}
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : stage === "accept"
                ? "Verify invited email"
                : stage === "verify"
                  ? "Verify and continue"
                  : stage === "sign-out"
                    ? "Sign out"
                    : stage === "recovery"
                      ? "Recovery information"
                      : stage === "redeem"
                        ? "Accept invitation"
                        : "Sign in"}
          </button>
        </form>
      )}
      <p role="status" aria-live="polite" className="text-sm leading-6">
        {message}
      </p>
      <nav
        aria-label="Customer access"
        className="flex flex-wrap gap-4 text-sm underline"
      >
        <Link prefetch={false} href="/customer/accept">
          Start invitation
        </Link>
        <Link prefetch={false} href="/customer/sign-in">
          Customer sign-in
        </Link>
        <Link prefetch={false} href="/customer/recovery">
          Account recovery
        </Link>
        <button
          onClick={() => {
            setStage("redeem");
            setMessage(
              "Sign in first, then retry your invitation to resume interrupted provisioning.",
            );
          }}
        >
          Resume invitation
        </button>
      </nav>
    </div>
  );
}
