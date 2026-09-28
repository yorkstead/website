"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function RecoveryForm({ token, invalid }: { token?: string; invalid: boolean }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState(invalid ? "That reset link is invalid or expired. Request a new one below." : "");
  const resetting = Boolean(token) && !invalid;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (resetting && data.get("password") !== data.get("confirm")) { setMessage("The passwords do not match."); return; }
    setBusy(true); setMessage("");
    try {
      const result = resetting
        ? await authClient.resetPassword({ token: token!, newPassword: String(data.get("password")) })
        : await authClient.requestPasswordReset({ email: String(data.get("email")).trim(), redirectTo: `${window.location.origin}/recover` });
      if (result.error) { setMessage(resetting ? "That link may have expired or already been used. Request a new link and try again." : "We couldn’t request a reset email. Please try again shortly."); }
      else { setDone(true); setMessage(resetting ? "Your password has been updated. Sign in, then add a new passkey from your account page." : "If that email matches an account, a reset link is on its way. Check your inbox and spam folder. The link expires in 15 minutes."); }
    } catch { setMessage("The request could not be completed. Please try again."); }
    finally { setBusy(false); }
  }
  const style = "mt-2 block w-full rounded-lg border bg-background p-3";
  return <div className="mt-6 space-y-5">
    <p className="text-muted-foreground">{resetting ? "Choose a new password with at least 12 characters." : "Enter the email address used for your owner account. We’ll email you a link to choose a new password."}</p>
    {!done && <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
      {resetting ? <><label className="block">New password<input className={style} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><label className="block">Confirm new password<input className={style} name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label></> : <label className="block">Owner email<input className={style} name="email" type="email" autoComplete="email" required /></label>}
      <button className="w-full rounded-lg bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-60" disabled={busy}>{busy ? "Please wait…" : resetting ? "Save new password" : "Email me a reset link"}</button>
    </fieldset></form>}
    {message && <p role="status" className="rounded-lg border p-4">{message}</p>}
    {resetting && !done && <Link className="block text-primary underline" href="/recover">Request a new reset link</Link>}
    <Link className="block text-primary underline" href="/login?auto=0&next=/account">Back to sign in</Link>
  </div>;
}
