"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { completeLeadFollowUp, convertLeadToProject, type LeadActionState } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";

const initialState: LeadActionState = { error: null };

export function CompleteLeadFollowUp({ leadId }: { leadId: number }) {
  const [state, action, pending] = useActionState(completeLeadFollowUp, initialState);
  return <form action={action}>
    <input type="hidden" name="id" value={leadId} />
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
      {pending ? "Completing…" : "Mark follow-up complete"}
    </Button>
    {state.error && <p role="alert" className="mt-2 text-xs text-amber-600">{state.error}</p>}
  </form>;
}

export function ConvertLeadToProject({ leadId }: { leadId: number }) {
  const [state, action, pending] = useActionState(convertLeadToProject, initialState);
  return <form action={action}>
    <input type="hidden" name="id" value={leadId} />
    <Button type="submit" variant="outline" disabled={pending} className="w-full justify-start">
      {pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
      {pending ? "Converting…" : "Convert to project"}
    </Button>
    {state.error && <p role="alert" className="mt-2 text-xs text-amber-600">{state.error}</p>}
  </form>;
}
