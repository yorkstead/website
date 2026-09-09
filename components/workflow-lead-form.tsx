"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { submitWorkflowLead, type WorkflowLeadState } from "@/app/actions/workflow";
import { trackConversionEvent } from "@/components/conversion-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brand } from "@/lib/brand";
import { workflowAuditBookingURL } from "@/lib/workflow-audit-config";
import { workflowProblemAreas, type WorkflowLeadField } from "@/lib/workflow-lead";
import { cn } from "@/lib/utils";

const initialState: WorkflowLeadState = { status: "idle", message: "" };

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-500 dark:text-red-400">{message}</p> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
      {pending ? "Sending…" : "Show Yorkstead the Problem"}
    </Button>
  );
}

export function WorkflowLeadForm() {
  const [state, action] = useActionState(submitWorkflowLead, initialState);
  const started = useRef(false);
  const searchParams = useSearchParams();
  const bookingURL = workflowAuditBookingURL();

  const trackStart = () => {
    if (!started.current) {
      started.current = true;
      trackConversionEvent("view_content", { page: "workflow" });
    }
  };

  const trackInvalid = (event: React.InvalidEvent<HTMLFormElement>) => {
    const field = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name as WorkflowLeadField;
    if (field) trackConversionEvent("lead", { field, status: "validation_error" });
  };

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 sm:p-8">
        <div className="grid size-11 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5" />
        </div>
        <div className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Lead received</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">The problem is on the table.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{state.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {bookingURL ? (
            <a href={bookingURL} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
              Book an audit call <ArrowRight className="size-4" />
            </a>
          ) : (
            <a href={`mailto:${brand.email}?subject=${encodeURIComponent("Workflow lead follow-up | Yorkstead Systems")}`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium">
              Email Yorkstead <ArrowRight className="size-4" />
            </a>
          )}
          <Link href="/" className="inline-flex h-11 items-center rounded-lg px-4 text-sm text-muted-foreground hover:text-foreground">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} onFocusCapture={trackStart} onInvalidCapture={trackInvalid} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workflow-name">Name</Label>
          <Input id="workflow-name" name="name" autoComplete="name" minLength={2} maxLength={100} required aria-invalid={Boolean(state.errors?.name)} />
          <FieldError message={state.errors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow-company">Company</Label>
          <Input id="workflow-company" name="company" autoComplete="organization" minLength={2} maxLength={150} required aria-invalid={Boolean(state.errors?.company)} />
          <FieldError message={state.errors?.company} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workflow-email">Email</Label>
          <Input id="workflow-email" name="email" type="email" autoComplete="email" maxLength={180} required aria-invalid={Boolean(state.errors?.email)} />
          <FieldError message={state.errors?.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow-phone">Phone</Label>
          <Input id="workflow-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} required aria-invalid={Boolean(state.errors?.phone)} />
          <FieldError message={state.errors?.phone} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workflow-description">What part of the business needs improvement?</Label>
        <Textarea id="workflow-description" name="description" minLength={20} maxLength={4000} required placeholder="Tell us what is slowing the business down and what a clearer operating flow would look like." aria-invalid={Boolean(state.errors?.description)} />
        <FieldError message={state.errors?.description} />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Where is the problem happening?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {workflowProblemAreas.map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground/90">
              <input type="checkbox" name="problemAreas" value={item} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <FieldError message={state.errors?.problemAreas} />
      </div>

      <input type="hidden" name="utm_source" value={searchParams.get("utm_source") ?? ""} />
      <input type="hidden" name="utm_medium" value={searchParams.get("utm_medium") ?? ""} />
      <input type="hidden" name="utm_campaign" value={searchParams.get("utm_campaign") ?? ""} />
      <input type="hidden" name="utm_content" value={searchParams.get("utm_content") ?? ""} />
      <input type="hidden" name="utm_term" value={searchParams.get("utm_term") ?? ""} />
      <div className="sr-only" aria-hidden="true">
        <Label htmlFor="workflow-website">Website</Label>
        <Input id="workflow-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message && state.status === "error" ? (
        <div role="alert" className={cn("rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-600 dark:text-red-400")}>{state.message}</div>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-5 text-muted-foreground">
          We treat this as a direct business conversation, not a marketing list.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
