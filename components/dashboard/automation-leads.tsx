import type {ContactInquiry} from '@/lib/contact-inquiries';
type Prospect={company_id:string;company:string;opportunity_id:string;title:string;stage:string;next_action:string|null;follow_up_date:string|null;estimated_value_cents:number|null;contact_name:string|null;contact_email:string|null};
const normalized=(v:string|null|undefined)=>(v||'').toLowerCase().replace(/[^a-z0-9]/g,'').trim();
export async function AutomationLeads({websiteLeads}:{websiteLeads:ContactInquiry[]}){
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return <p className="text-xs text-muted-foreground">Automation Hub connection is not configured.</p>;
 let prospects:Prospect[];
 try{
  const res=await fetch('https://cal.yorkstead.com/api/integrations/website-summary',{headers:{Authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('unavailable');
  prospects=((await res.json()).opportunities||[]) as Prospect[];
 }catch{return <p className="text-xs text-muted-foreground">Automation Hub prospects are temporarily unavailable. Website inquiries remain accessible below.</p>;}
 return <section className="mb-6 rounded-xl bg-card/80 p-5" aria-label="Voice captured approved prospects">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Unified lead sources</p><h2 className="mt-2 text-lg font-semibold">Approved AI-captured prospects</h2><p className="mt-1 text-xs text-muted-foreground">Website inquiries below · Automation Hub opportunities here. No records are copied.</p></div><div className="flex flex-wrap gap-3 text-xs"><a className="text-primary" href="https://cal.yorkstead.com/crm/review">Review pending captures →</a><a className="text-primary" href="https://cal.yorkstead.com/crm/pipeline">Manage opportunities →</a></div></div>
  {prospects.length===0?<p className="mt-4 text-sm text-muted-foreground">No approved Automation Hub prospects yet. Pending voice captures remain in their separate approval queue.</p>:<div className="mt-4 grid gap-2">{prospects.map(p=>{
   const matches=websiteLeads.filter(lead=>(p.contact_email&&lead.email.toLowerCase()===p.contact_email.toLowerCase())||(p.company&&lead.company&&normalized(lead.company)===normalized(p.company)));
   return <article key={p.opportunity_id} className="rounded-lg bg-secondary/50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[9px] uppercase text-primary">AI capture · approved</span><strong className="text-sm">{p.company}</strong><span className="text-xs text-muted-foreground">{p.stage}</span>{matches.length>0&&<span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">Possible website match · review manually</span>}</div><p className="mt-2 text-sm">{p.title}</p><p className="mt-1 text-xs text-muted-foreground">{p.contact_name?('Contact: '+p.contact_name+' · '):''}{p.next_action||'No next action'}{p.follow_up_date?' · Follow up '+String(p.follow_up_date).slice(0,10):''}</p></article>;
  })}</div>}
  <p className="mt-3 text-[11px] text-muted-foreground">Possible matches compare company names and email addresses against website inquiries on this page. They are warnings, not automatic merges.</p>
 </section>;
}
