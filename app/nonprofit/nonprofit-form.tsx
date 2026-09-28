"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sections, foodOptions } from "@/lib/nonprofit";
import { submitNonprofit } from "@/app/actions/nonprofit";

export function NonprofitForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState({ status: "idle", message: "" });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try { setResult(await submitNonprofit(data)); }
      catch { setResult({ status: "error", message: "We couldn’t send your answers. They’re still here—please try again." }); }
    });
  }
  if (result.status === "success") return <section role="status" className="rounded-2xl border bg-card p-8"><h2 className="text-2xl font-semibold">You’re all set for now.</h2><p className="mt-3">{result.message}</p><p className="mt-3 text-muted-foreground">Brandon will review your details and follow up about anything that’s missing.</p></section>;
  const inputClass = "mt-2 block min-h-12 w-full rounded-lg border bg-background px-3 py-2 text-base";
  return <form onSubmit={submit} className="space-y-6">
    <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
      {sections.map((section, index) => <section key={section.title} className="rounded-2xl border bg-card p-5 sm:p-8">
        <p className="text-xs font-semibold tracking-widest text-primary">SECTION {index + 1} OF {sections.length}</p>
        <h2 className="mt-2 text-2xl font-semibold">{section.title}</h2><p className="mb-6 mt-2 text-sm text-muted-foreground">{section.description}</p>
        <div className="space-y-5">{section.fields.map(([key, label, type]) => <div key={key}>
          <label htmlFor={key} className="text-sm font-medium">{label}{key === "name" || key === "email" ? " *" : ""}</label>
          {type === "textarea" ? <textarea id={key} name={key} maxLength={600} rows={3} className={inputClass} /> : <input id={key} name={key} type={type} maxLength={key === "email" ? 180 : key === "name" ? 100 : 600} minLength={key === "name" ? 2 : undefined} required={key === "name" || key === "email"} autoComplete={key === "name" ? "name" : key === "email" ? "email" : "off"} className={inputClass} />}
        </div>)}</div>
        {index === 2 && <fieldset className="mt-6"><legend className="text-sm font-medium">What food will you handle?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{foodOptions.map(food => <label key={food} className="flex min-h-12 items-center gap-3 rounded-lg border p-3"><input type="checkbox" name="foods" value={food} className="size-5" />{food}</label>)}</div></fieldset>}
        {index === 3 && <p className="mt-6 rounded-lg bg-muted p-4 text-sm">Have a signed sponsorship agreement or IRS determination letter? You can arrange to share those with Brandon separately. Filling out this section is not a signature or confirmation of sponsorship.</p>}
      </section>)}
      <p className="text-sm text-muted-foreground">Your answers go to Brandon’s private website dashboard. Only name and email are required. Answers are not saved until you send them; keep this page open while you work.</p>
      {result.message && <p role="alert" className="rounded-lg border border-destructive p-4">{result.message}</p>}
      <button disabled={pending} className="min-h-12 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:cursor-wait">{pending ? "Sending your answers…" : "Send my answers to Brandon"}</button>
    </fieldset>
  </form>;
}
