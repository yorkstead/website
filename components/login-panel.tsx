"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Fingerprint, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PrivateDestination = "/dashboard" | "/dashboard/leads" | "/dashboard/consultations" | "/dashboard/marketing" | "/dashboard/marketing/one-sheet" | "/account";

export function LoginPanel({ nextPath = "/dashboard" }: { nextPath?: PrivateDestination }) {
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function checkBootstrap() {
      try {
        const response = await fetch("/api/auth/bootstrap-status", { cache: "no-store" });
        const payload: unknown = response.ok ? await response.json().catch(() => null) : null;
        if (!cancelled) setSetupAvailable(Boolean(payload && typeof payload === "object" && "available" in payload && (payload as { available?: unknown }).available === true));
      } catch {
        if (!cancelled) setSetupAvailable(false);
      }
    }
    void checkBootstrap();
    return () => { cancelled = true; };
  }, []);

  const signInWithPasskey = useCallback(async () => {
    setBusy(true); setMessage("");
    try {
      const { error } = await authClient.signIn.passkey({
        fetchOptions: { onSuccess: () => window.location.assign(nextPath) },
      });
      if (error) setMessage(error.message ?? "The passkey could not be verified.");
    } catch {
      setMessage("Passkey authentication was cancelled or unavailable.");
    } finally {
      setBusy(false);
    }
  }, [nextPath]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    if (mode === "setup") {
      try {
        const response = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-owner-bootstrap-token": bootstrapToken },
          body: JSON.stringify({ email, password, name: brand.founder }),
        });
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        if (!response.ok) setMessage(payload?.message ?? "The owner account could not be created.");
        else window.location.assign("/account?enroll=1");
      } catch {
        setMessage("The owner account could not be created.");
      }
    } else {
      try {
        const { error } = await authClient.signIn.email({ email: email.trim(), password });
        if (error) setMessage(error.message ?? "Those recovery credentials were not accepted.");
        else {
          const response = await fetch("/api/auth/owner-session-status", { cache: "no-store", credentials: "same-origin" });
          const status = response.ok ? await response.json() : null;
          if (status?.authorized) window.location.assign(nextPath);
          else if (status?.authenticated) setMessage("Your password was accepted, but this account does not match the configured website owner. The owner email configuration needs to be checked.");
          else setMessage("Your password was accepted, but the website could not read your login session. Please allow cookies for this site and try again.");
        }
      } catch {
        setMessage("Sign-in could not be completed. Please try again.");
      }
    }
    setBusy(false);
  }

  return <Card className="w-full max-w-md border-border/70 bg-card/85 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"><CardContent className="p-7 sm:p-8">
    <div className="mb-7 flex items-start justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Private Operator Access</div><h1 className="mt-2 text-2xl font-semibold tracking-tight">Project Command Center</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in with your password below, or choose a passkey.</p></div><div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div></div>
    <Button className="h-12 w-full text-sm" onClick={() => void signInWithPasskey()} disabled={busy}><Fingerprint className="size-5" />Continue with a passkey</Button>
    <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="h-px flex-1 bg-border" />Recovery access<span className="h-px flex-1 bg-border" /></div>
    <form onSubmit={submit} className="space-y-3"><label className="block"><span className="mb-1.5 block text-xs text-muted-foreground">Owner email</span><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label><label className="block"><span className="mb-1.5 block text-xs text-muted-foreground">{mode === "setup" ? "Create recovery password" : "Recovery password"}</span><input required minLength={12} type="password" autoComplete={mode === "setup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>{mode === "setup" ? <label className="block"><span className="mb-1.5 block text-xs text-muted-foreground">One-time bootstrap token</span><input required type="password" autoComplete="one-time-code" value={bootstrapToken} onChange={(event) => setBootstrapToken(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label> : null}{message && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{message}</p>}<Button variant="outline" className="h-11 w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <KeyRound />}{mode === "setup" ? "Create owner account" : "Use recovery login"}</Button></form>
    <Link href="/recover" className="mt-5 block text-center text-sm text-primary underline">Forgot your password? Recover access</Link>
    {setupAvailable ? <button className="mt-5 w-full text-center text-xs text-muted-foreground transition hover:text-foreground" onClick={() => { setMode(mode === "login" ? "setup" : "login"); setMessage(""); }}>{mode === "login" ? "First visit? Bootstrap the owner account" : "Already configured? Return to sign in"}</button> : null}
  </CardContent></Card>;
}
