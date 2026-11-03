"use client";

import { useEffect, useState } from "react";
import { parseSystemAmountInput } from "@/lib/system-directory";
import {
  registryBillingAmountBases,
  registryBillingSourceKinds,
  registryEvidenceStatuses,
  registryMonitoringMethods,
  registryMonitoringOutcomes,
  registryVerificationMethods,
  type SystemRegistryRecord,
} from "@/lib/system-registry";

const panel="rounded-lg border border-border bg-background/70 p-3";
const input="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs";
const label="grid gap-1 text-xs text-muted-foreground";
function localDateTime(value:string|null){return value?new Date(value).toISOString().slice(0,16):"";}
function dateTimeValue(value:string){return value?new Date(value).toISOString():null;}
async function send(path:string,method:string,body?:unknown){return fetch(path,{method,headers:{"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});}

export function SystemsRegistryReviewPanel({record,onChanged}:{record:SystemRegistryRecord;onChanged:()=>void}){
  const [status,setStatus]=useState(record.verificationStatus);
  const [subject,setSubject]=useState(record.verificationSubject??"");
  const [method,setMethod]=useState<SystemRegistryRecord["verificationMethod"]>(record.verificationMethod??"provider_console");
  const [reference,setReference]=useState(record.verificationReference??"");
  const [observedAt,setObservedAt]=useState(localDateTime(record.verificationObservedAt));
  const [reviewDue,setReviewDue]=useState(record.verificationReviewDue??"");
  const [outcome,setOutcome]=useState(record.monitoringOutcome);
  const [monitoringMethod,setMonitoringMethod]=useState<SystemRegistryRecord["monitoringMethod"]>(record.monitoringMethod??"provider_console");
  const [monitoringReference,setMonitoringReference]=useState(record.monitoringReference??"");
  const [monitoringObservedAt,setMonitoringObservedAt]=useState(localDateTime(record.monitoringObservedAt));
  const [monitoringReviewDue,setMonitoringReviewDue]=useState(record.monitoringReviewDue??"");
  const [summary,setSummary]=useState(record.monitoringSummary);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function submitVerification(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage("");try{
    const unknown=status==="unknown";
    const response=await send("/api/systems-registry/verification","POST",{id:record.id,expectedRevision:record.revision,evidence:{status,subject:unknown?null:subject,method:unknown?null:method,reference:unknown?null:(reference.trim()||null),observedAt:unknown?null:dateTimeValue(observedAt),reviewDue:unknown?null:(reviewDue||null)}});
    const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not record verification");setMessage("Verification evidence saved and audited.");onChanged();
  }catch(error){setMessage(error instanceof Error?error.message:"Could not record verification");}finally{setBusy(false);}}
  async function submitMonitoring(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage("");try{
    const unknown=outcome==="unknown";
    const response=await send("/api/systems-registry/monitoring","POST",{id:record.id,expectedRevision:record.revision,evidence:{outcome,method:unknown?null:monitoringMethod,reference:unknown?null:(monitoringReference.trim()||null),observedAt:unknown?null:dateTimeValue(monitoringObservedAt),reviewDue:unknown?null:(monitoringReviewDue||null),summary:unknown?"":summary}});
    const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not record monitoring observation");setMessage("Monitoring observation saved and audited.");onChanged();
  }catch(error){setMessage(error instanceof Error?error.message:"Could not record observation");}finally{setBusy(false);}}
  return <section className="mt-3 grid gap-3 xl:grid-cols-2" aria-label={`Evidence and monitoring for ${record.name}`}>
    <form onSubmit={submitVerification} className={panel}>
      <h3 className="font-semibold text-xs">Evidence-backed verification</h3>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">“Verified” means you reviewed the cited source for this subject. It is not an automated check or independent attestation.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={label}>Status<select aria-label={`Verification status for ${record.name}`} className={input} value={status} onChange={event=>setStatus(event.target.value as typeof status)}>{registryEvidenceStatuses.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className={label}>Subject<input className={input} maxLength={240} disabled={status==="unknown"} value={subject} onChange={event=>setSubject(event.target.value)} placeholder="What does the evidence support?"/></label>
        <label className={label}>Review method<select className={input} disabled={status==="unknown"} value={method??"provider_console"} onChange={event=>setMethod(event.target.value as typeof method)}>{registryVerificationMethods.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label>
        <label className={label}>Source observation<input className={input} type="datetime-local" disabled={status==="unknown"} value={observedAt} onChange={event=>setObservedAt(event.target.value)}/></label>
        <label className={`${label} sm:col-span-2`}>Safe evidence reference<input className={input} maxLength={512} disabled={status==="unknown"} value={reference} onChange={event=>setReference(event.target.value)} placeholder="Document reference or safe URL"/></label>
        <label className={label}>Next review due<input className={input} type="date" disabled={status==="unknown"} value={reviewDue} onChange={event=>setReviewDue(event.target.value)}/></label>
      </div>
      <button disabled={busy||record.archivedAt!==null} className="mt-3 h-8 rounded-md border border-border px-3 text-xs">Record verification</button>
    </form>
    <form onSubmit={submitMonitoring} className={panel}>
      <h3 className="font-semibold text-xs">Monitoring status</h3>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Configuration: <strong>{record.monitoringConfiguration.replaceAll("_"," ")}</strong>. Configured monitoring does not mean a successful observation. This workflow records owner-entered observations only.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={label}>Observation outcome<select aria-label={`Monitoring outcome for ${record.name}`} className={input} value={outcome} onChange={event=>setOutcome(event.target.value as typeof outcome)}>{registryMonitoringOutcomes.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className={label}>Method<select className={input} disabled={outcome==="unknown"} value={monitoringMethod??"provider_console"} onChange={event=>setMonitoringMethod(event.target.value as typeof monitoringMethod)}>{registryMonitoringMethods.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label>
        <label className={label}>Source observation<input className={input} type="datetime-local" disabled={outcome==="unknown"} value={monitoringObservedAt} onChange={event=>setMonitoringObservedAt(event.target.value)}/></label>
        <label className={label}>Next review due<input className={input} type="date" disabled={outcome==="unknown"} value={monitoringReviewDue} onChange={event=>setMonitoringReviewDue(event.target.value)}/></label>
        <label className={`${label} sm:col-span-2`}>Safe evidence reference<input className={input} maxLength={512} disabled={outcome==="unknown"} value={monitoringReference} onChange={event=>setMonitoringReference(event.target.value)} placeholder="Optional status page or owner note reference"/></label>
        <label className={`${label} sm:col-span-2`}>Observation note<textarea className="min-h-16 rounded-md border border-border bg-background p-2.5 text-xs" maxLength={1000} disabled={outcome==="unknown"} value={summary} onChange={event=>setSummary(event.target.value)}/></label>
      </div>
      <button disabled={busy||record.archivedAt!==null} className="mt-3 h-8 rounded-md border border-border px-3 text-xs">Record observation</button>
    </form>
    {message&&<p role="status" className="xl:col-span-2 text-xs text-muted-foreground">{message}</p>}
  </section>;
}

type RegistryItem=SystemRegistryRecord;
type BillingItem={id:string;revision:number;providerAccountId:string|null;providerAccountName:string|null;sourceKind:string;reference:string;observedAt:string;periodStart:string|null;periodEnd:string|null;amountBasis:string;amount:number|null;currency:string|null;payerLabel:string|null;status:string;reviewDue:string|null;reviewedAt:string;allocations:Array<{id:string;revision:number;subscriptionId:string;subscriptionName:string;amount:number|null}>};
type BillingRollup={amountBasis:string;evidenceStatus:string;currency:string|null;periodStart:string|null;periodEnd:string|null;sourceCount:number;amountTotal:string|null;unallocatedAmount:string|null;unallocatedSourceCount:number;partiallyUnapportionedSourceCount:number};
type BillingAuditItem={id:string;revision:number;action:string;actor:string;at:string;allocationId:string|null;changedFields:string[]};
const blankBilling=()=>({providerAccountId:"",sourceKind:"invoice",reference:"",observedAt:"",periodStart:"",periodEnd:"",amountBasis:"actual",amount:"",currency:"USD",payerLabel:"",status:"unverified",reviewDue:""});

export function SystemsRegistryBilling({entries,onChanged}:{entries:RegistryItem[];onChanged:()=>void}){
  const [evidence,setEvidence]=useState<BillingItem[]>([]);const [rollup,setRollup]=useState<BillingRollup[]>([]);const [form,setForm]=useState(blankBilling());const [allocation,setAllocation]=useState<Record<string,{subscriptionId:string;amount:string}>>({});const [audit,setAudit]=useState<Record<string,BillingAuditItem[]|null>>({});const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  async function load(){setLoading(true);try{const response=await fetch("/api/systems-registry/billing",{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error??"Billing evidence is unavailable");setEvidence(body.evidence);setRollup(body.rollup);}catch(reason){setError(reason instanceof Error?reason.message:"Billing evidence is unavailable");}finally{setLoading(false);}}
  useEffect(()=>{let active=true;fetch("/api/systems-registry/billing",{cache:"no-store"}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error??"Billing evidence is unavailable");if(active){setEvidence(body.evidence);setRollup(body.rollup);}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Billing evidence is unavailable");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  function setField<K extends keyof ReturnType<typeof blankBilling>>(key:K,value:ReturnType<typeof blankBilling>[K]){setForm(current=>({...current,[key]:value}));}
  async function createSource(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{const parsed=form.amountBasis==="unknown"?{ok:true as const,amount:null}:parseSystemAmountInput(form.amount);if(!parsed.ok)throw new Error("Enter a nonnegative amount with up to two decimal places, or select unknown.");const body={type:"evidence",evidence:{providerAccountId:form.providerAccountId||null,sourceKind:form.sourceKind,reference:form.reference,observedAt:dateTimeValue(form.observedAt),periodStart:form.periodStart||null,periodEnd:form.periodEnd||null,amountBasis:form.amountBasis,amount:parsed.amount,currency:form.amountBasis==="unknown"?(form.currency||null):form.currency,payerLabel:form.payerLabel.trim()||null,status:form.status,reviewDue:form.reviewDue||null}};const response=await send("/api/systems-registry/billing","POST",body);const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not record billing source");setForm(blankBilling());await load();onChanged();}catch(reason){setError(reason instanceof Error?reason.message:"Could not record billing source");}finally{setBusy(false);}}
  async function action(body:unknown){setBusy(true);setError("");try{const response=await send("/api/systems-registry/billing","PATCH",body);const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not update billing evidence");await load();onChanged();}catch(reason){setError(reason instanceof Error?reason.message:"Could not update billing evidence");}finally{setBusy(false);}}
  async function toggleAudit(id:string){if(audit[id]!==undefined){setAudit(current=>{const next={...current};delete next[id];return next;});return;}try{const response=await fetch(`/api/systems-registry/billing?audit=${encodeURIComponent(id)}`,{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not load billing audit");setAudit(current=>({...current,[id]:result.audit}));}catch(reason){setError(reason instanceof Error?reason.message:"Could not load billing audit");}}
  async function allocate(event:React.FormEvent,evidenceId:string){event.preventDefault();const draft=allocation[evidenceId];if(!draft?.subscriptionId){setError("Choose a subscription before allocating this source.");return;}const amount=draft.amount.trim()?parseSystemAmountInput(draft.amount):{ok:true as const,amount:null};if(!amount.ok){setError("Enter a valid allocation amount or leave it unallocated.");return;}setBusy(true);setError("");try{const response=await send("/api/systems-registry/billing","POST",{type:"allocation",allocation:{evidenceId,subscriptionId:draft.subscriptionId,amount:amount.amount}});const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not allocate billing source");setAllocation(current=>({...current,[evidenceId]:{subscriptionId:"",amount:""}}));await load();}catch(reason){setError(reason instanceof Error?reason.message:"Could not allocate billing source");}finally{setBusy(false);}}
  const accounts=entries.filter(entry=>entry.entityClass==="provider_account"&&!entry.archivedAt);const subscriptions=entries.filter(entry=>entry.entityClass==="subscription"&&!entry.archivedAt);
  return <section className="mt-6 rounded-xl border border-border bg-card p-4" aria-labelledby="billing-evidence-heading">
    <div><h2 id="billing-evidence-heading" className="text-lg font-semibold">Subscription and billing evidence</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">Record each invoice or price source once, then allocate it to subscriptions. Shared source rows are counted once in totals. Unknown amounts stay blank; totals never combine currencies or billing periods. “Verified” means you reviewed the cited source; no status is inferred from provider presence or amount.</p></div>
    {error&&<p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">{error}</p>}
    <form onSubmit={createSource} className="mt-4 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className={label}>Provider account<select className={input} value={form.providerAccountId} onChange={event=>setField("providerAccountId",event.target.value)}><option value="">Account not linked</option>{accounts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className={label}>Source type<select className={input} value={form.sourceKind} onChange={event=>setField("sourceKind",event.target.value)}>{registryBillingSourceKinds.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label>
      <label className={label}>Source observed at<input className={input} type="datetime-local" required value={form.observedAt} onChange={event=>setField("observedAt",event.target.value)}/></label>
      <label className={label}>Billing evidence status<select className={input} value={form.status} onChange={event=>setField("status",event.target.value)}>{registryEvidenceStatuses.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label className={`${label} sm:col-span-2`}>Safe source reference<input required className={input} maxLength={512} value={form.reference} onChange={event=>setField("reference",event.target.value)} placeholder="Invoice, contract or provider export reference"/></label>
      <label className={label}>Period start<input className={input} type="date" value={form.periodStart} onChange={event=>setField("periodStart",event.target.value)}/></label>
      <label className={label}>Period end<input className={input} type="date" value={form.periodEnd} onChange={event=>setField("periodEnd",event.target.value)}/></label>
      <label className={label}>Amount basis<select className={input} value={form.amountBasis} onChange={event=>setField("amountBasis",event.target.value)}>{registryBillingAmountBases.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label className={label}>Amount<input className={input} inputMode="decimal" disabled={form.amountBasis==="unknown"} required={form.amountBasis!=="unknown"} value={form.amount} onChange={event=>setField("amount",event.target.value)} placeholder="Unknown is blank"/></label>
      <label className={label}>Currency<input className={input} maxLength={3} disabled={form.amountBasis==="unknown"} required={form.amountBasis!=="unknown"} value={form.currency} onChange={event=>setField("currency",event.target.value.toUpperCase())}/></label>
      <label className={label}>Payer label<input className={input} maxLength={160} value={form.payerLabel} onChange={event=>setField("payerLabel",event.target.value)}/></label>
      <label className={label}>Next review due<input className={input} type="date" value={form.reviewDue} onChange={event=>setField("reviewDue",event.target.value)}/></label>
      <button disabled={busy} className="h-9 self-end rounded-md bg-primary px-3 text-xs text-primary-foreground">Record billing source</button>
    </form>
    <div className="mt-5"><h3 className="text-sm font-semibold">Source-level roll-up</h3><p className="mt-1 text-[11px] text-muted-foreground">Each active source contributes at most once, regardless of allocation count. Unknown amounts and unverified sources remain visible and are not represented as confirmed spend.</p>
      {rollup.length?<div className="mt-2 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="text-muted-foreground"><tr><th className="py-2">Period</th><th>Basis / evidence</th><th>Currency</th><th>Source total</th><th>Unallocated</th><th>Sources</th></tr></thead><tbody>{rollup.map((row,index)=><tr className="border-t border-border" key={`${row.periodStart}-${row.periodEnd}-${row.currency}-${row.amountBasis}-${row.evidenceStatus}-${index}`}><td className="py-2">{row.periodStart&&row.periodEnd?`${row.periodStart} – ${row.periodEnd}`:"Period unknown"}</td><td>{row.amountBasis} · {row.evidenceStatus}</td><td>{row.currency??"Unknown"}</td><td>{row.amountTotal===null?`Unknown amount · ${row.sourceCount} source(s) excluded`:row.amountTotal}</td><td>{row.unallocatedAmount??"Unknown"}{row.unallocatedSourceCount>0?` · ${row.unallocatedSourceCount} source(s)`:""}</td><td>{row.sourceCount}{row.partiallyUnapportionedSourceCount>0?` · ${row.partiallyUnapportionedSourceCount} partially allocated`:""}</td></tr>)}</tbody></table></div>:<p className="mt-2 text-xs text-muted-foreground">No billing evidence recorded. Unknown subscription charges are not $0.</p>}
    </div>
    <div className="mt-4 grid gap-2">{loading?<p role="status" className="text-xs text-muted-foreground">Loading billing evidence…</p>:evidence.map(item=><article key={item.id} className="rounded-lg border border-border p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{item.sourceKind.replaceAll("_"," ")} · {item.status}</strong><p className="mt-1 text-muted-foreground">{item.providerAccountName??"Account not linked"} · {item.reference} · {item.periodStart&&item.periodEnd?`${item.periodStart} – ${item.periodEnd}`:"Period unknown"}</p><p className="mt-1">{item.amount===null?"Unknown amount, excluded from numeric totals":`${item.currency} ${item.amount.toFixed(2)} · ${item.amountBasis}`} · observed {new Date(item.observedAt).toLocaleDateString()}</p><p className="mt-1 text-muted-foreground">Payer: {item.payerLabel??"unknown"} · reviewed {new Date(item.reviewedAt).toLocaleDateString()} · next review {item.reviewDue??"not scheduled"}</p></div><div className="flex flex-wrap gap-2"><select aria-label={`Billing evidence status ${item.reference}`} className="h-8 rounded-md border border-border bg-background px-2" value={item.status} onChange={event=>void action({type:"evidence-status",id:item.id,expectedRevision:item.revision,status:event.target.value,reviewDue:item.reviewDue})}>{registryEvidenceStatuses.map(value=><option key={value} value={value}>{value}</option>)}</select><button onClick={()=>void toggleAudit(item.id)} className="rounded-md border border-border px-2">{audit[item.id]===undefined?"Audit":"Hide audit"}</button><button disabled={busy||item.allocations.length>0} onClick={()=>void action({type:"archive-evidence",id:item.id,expectedRevision:item.revision})} className="rounded-md border border-border px-2">Archive source</button></div></div>
        {audit[item.id]&&<div className="mt-2 border-t border-border pt-2"><strong>Billing source audit</strong>{audit[item.id]!.map(event=><p key={event.id} className="mt-1 text-muted-foreground">Revision {event.revision} · {event.action} · {event.actor} · {new Date(event.at).toLocaleString()}{event.changedFields.length?` · ${event.changedFields.join(", ")}`:""}</p>)}</div>}
        {item.allocations.map(value=><div key={value.id} className="mt-2 flex items-center justify-between border-t border-border pt-2"><span>Allocated to {value.subscriptionName}: {value.amount===null?"amount not apportioned":`${item.currency} ${value.amount.toFixed(2)}`}</span><button disabled={busy} onClick={()=>void action({type:"archive-allocation",id:value.id,expectedRevision:value.revision})} className="text-muted-foreground">Remove allocation</button></div>)}
        {subscriptions.length>0&&<form onSubmit={event=>void allocate(event,item.id)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto]"><label className={label}>Allocate to subscription<select className={input} value={allocation[item.id]?.subscriptionId??""} onChange={event=>setAllocation(current=>({...current,[item.id]:{subscriptionId:event.target.value,amount:current[item.id]?.amount??""}}))}><option value="">Choose subscription…</option>{subscriptions.map(sub=><option key={sub.id} value={sub.id}>{sub.name}</option>)}</select></label><label className={label}>Allocated amount<input className={input} inputMode="decimal" value={allocation[item.id]?.amount??""} onChange={event=>setAllocation(current=>({...current,[item.id]:{subscriptionId:current[item.id]?.subscriptionId??"",amount:event.target.value}}))} placeholder="Blank = not apportioned"/></label><button disabled={busy} className="h-9 self-end rounded-md border border-border px-3">Add allocation</button></form>}
      </article>)}</div>
  </section>;
}
