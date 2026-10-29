import { createProposalAction, saveLeadQualificationAction, updateProposalStateAction } from "@/app/actions/crm-sales";
import type { ContactInquiry } from "@/lib/contact-inquiries";
import type { CrmProposal } from "@/lib/crm-sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CrmSalesEditor({ lead, proposals, consultations }: { lead: ContactInquiry; proposals: CrmProposal[]; consultations: Array<{ id: string; serviceSlug: string; date: string; status: string; requirementCount: number; requirements: string[] }> }) {
  return <section className="mt-6 grid gap-4 border-t border-border pt-5 xl:grid-cols-2">
    <form action={saveLeadQualificationAction} className="grid gap-3 rounded-xl border border-border bg-background/40 p-4">
      <input type="hidden" name="leadId" value={lead.id} />
      <div><h3 className="text-sm font-semibold">Qualification</h3><p className="mt-1 text-xs text-muted-foreground">Budget indication is context only; it never counts as revenue.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Industry<select name="industry" defaultValue={lead.industry} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3"><option value="">Choose industry</option><option value="manufacturing">Manufacturing</option><option value="logistics">Logistics</option><option value="restaurant">Restaurant</option><option value="other">Other</option></select></label>
        <label className="text-xs">Company size<Input name="companySize" defaultValue={lead.companySize} maxLength={500} className="mt-1" placeholder="e.g. 45 employees" /></label>
        <label className="text-xs">Urgency<Input name="urgency" defaultValue={lead.urgency} maxLength={500} className="mt-1" placeholder="e.g. before peak season" /></label>
        <label className="text-xs">Decision-maker<Input name="decisionMaker" defaultValue={lead.decisionMaker} maxLength={500} className="mt-1" placeholder="Name or role" /></label>
        <label className="text-xs">Budget indication<Input name="budgetIndication" defaultValue={lead.budgetIndication} maxLength={500} className="mt-1" placeholder="Unconfirmed context" /></label>
      </div>
      <label className="text-xs">Pain / requirements<Textarea name="pain" defaultValue={lead.pain} maxLength={2000} className="mt-1 min-h-20" /></label>
      <label className="text-xs">Next step<Textarea name="nextStep" defaultValue={lead.nextStep} maxLength={500} className="mt-1 min-h-16" placeholder="Specific action and owner" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Won reason<Input name="wonReason" defaultValue={lead.wonReason} maxLength={500} className="mt-1" /></label><label className="text-xs">Lost reason<Input name="lostReason" defaultValue={lead.lostReason} maxLength={500} className="mt-1" /></label></div>
      <Button type="submit" size="sm" variant="outline" className="justify-self-start">Save qualification</Button>
    </form>
    <div className="grid content-start gap-3 rounded-xl border border-border bg-background/40 p-4">
      <div><h3 className="text-sm font-semibold">Consultations & requirements</h3>{consultations.length ? <div className="mt-2 space-y-2">{consultations.map((item) => <div key={item.id} className="rounded-md border border-border/70 p-2"><p className="text-xs text-muted-foreground"><a className="text-primary hover:underline" href={`/dashboard/consultations?lead=${lead.id}`}>{item.serviceSlug} · {item.status}</a>{item.date ? ` · ${item.date}` : ""} · {item.requirementCount} captured fields</p>{item.requirements.length ? <ul className="mt-1 space-y-1">{item.requirements.map((requirement) => <li key={requirement} className="text-[11px] leading-4 text-muted-foreground">{requirement}</li>)}</ul> : null}</div>)}</div> : <p className="mt-1 text-xs text-muted-foreground">No linked consultation yet. Start one from Quick actions to attach requirements and outcome.</p>}</div>
      <div><h3 className="text-sm font-semibold">Proposals</h3><p className="mt-1 text-xs text-muted-foreground">Only an amount entered here contributes to pipeline value.</p></div>
      {proposals.length ? <div className="space-y-2">{proposals.map((proposal) => <div key={proposal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs"><div><strong className="capitalize">{proposal.engagementType}</strong><p className="mt-1 text-muted-foreground">{proposal.nextAction || "No next action"}{proposal.nextActionAt ? ` · Next ${proposal.nextActionAt.slice(0, 10)}` : ""}{proposal.sentAt ? ` · Sent ${proposal.sentAt.slice(0, 10)}` : ""}{proposal.decidedAt ? ` · Decided ${proposal.decidedAt.slice(0, 10)}` : ""}</p><form action={updateProposalStateAction} className="mt-2 flex items-center gap-2"><input type="hidden" name="leadId" value={lead.id} /><input type="hidden" name="proposalId" value={proposal.id} /><select aria-label="Proposal state" name="state" defaultValue={proposal.state} className="h-8 rounded-md border border-border bg-background px-2"><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select><Button type="submit" size="sm" variant="outline">Update state</Button></form></div><strong>${(proposal.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>)}</div> : <p className="text-xs text-muted-foreground">No proposals recorded.</p>}
      <form action={createProposalAction} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
        <input type="hidden" name="leadId" value={lead.id} />
        <label className="text-xs">Engagement<select name="engagementType" className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3"><option value="audit">$350 audit offer</option><option value="sprint">$1,500–$3,500 sprint offer</option><option value="system">$5,000+ system offer</option><option value="custom">Custom</option></select></label>
        <label className="text-xs">Explicit proposal amount ($)<Input name="amount" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" required className="mt-1" placeholder="0.00" /></label>
        <label className="text-xs">State<select name="state" className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3"><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></label>
        <label className="text-xs">Next action date<Input name="nextActionAt" type="date" className="mt-1" /></label>
        <label className="text-xs sm:col-span-2">Next action<Input name="nextAction" maxLength={1000} className="mt-1" placeholder="Prepare scope review" /></label>
        <Button type="submit" size="sm" variant="outline" className="justify-self-start">Record proposal</Button>
      </form>
    </div>
  </section>;
}
