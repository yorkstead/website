"use client";

import { useActionState } from "react";
import type { OpportunityActionState } from "@/app/actions/opportunities";

type Action = (state: OpportunityActionState, formData: FormData) => Promise<OpportunityActionState>;

export function OpportunityActionForm({ action, children, className, label }: { action: Action; children: React.ReactNode; className?: string; label?: string }) {
  const [state, formAction, pending] = useActionState(action, { error: null, success: null });
  return <form action={formAction} aria-label={label} className={className}>
    {children}
    <div className="grid gap-1" aria-live="polite">
      {state.error ? <p role="alert" className="text-xs text-amber-600">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-xs text-emerald-600">{state.success}</p> : null}
      {pending ? <p role="status" className="text-xs text-muted-foreground">Saving…</p> : null}
    </div>
  </form>;
}
