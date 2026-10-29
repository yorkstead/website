import type {ContactInquiry} from '@/lib/contact-inquiries';
import {contactDatabase} from '@/lib/contact-inquiries';
type Prospect={company_id:string;company:string;opportunity_id:string;title:string;stage:string;next_action:string|null;follow_up_date:string|null;estimated_value_cents:number|null;contact_name:string|null;contact_email:string|null};
const normalized=(v:string|null|undefined)=>(v||'').toLowerCase().replace(/[^a-z0-9]/g,'').trim();
export async function AutomationLeads({websiteLeads}:{websiteLeads:ContactInquiry[]}){
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return <p className="text-xs text-muted-foreground">Automation Hub connection is not configured.</p>;
 let prospects:Prospect[];
 let matchKeys:{email:string|null;company:string|null}[]=[];
 try{
  const res=await fetch('https://cal.yorkstead.com/api/integrations/website-summary',{headers:{Authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('unavailable');
  prospects=((await res.json()).opportunities||[]) as Prospect[];
  try{const sql=await contactDatabase();const rows=await sql`SELECT email,company FROM contact_inquiries WHERE status != 'archived' AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id) ORDER BY id DESC LIMIT 5000`;matchKeys=rows.map(row=>({email:String(row.email||''),company:String(row.company||'')}));}catch{matchKeys=websiteLeads.map(lead=>({email:lead.email,company:lead.company}));}
 }catch{return <p className="text-xs text-muted-foreground">Automation Hub prospects are temporarily unavailable. Website inquiries remain accessible below.</p>;}
 return <section className="mb-6 rounded-xl bg-card/80 p-5" aria-label="Voice captured approved prospects">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Unified lead sources</p><h2 className="mt-2 text-lg font-semibold">Website + approved CRM opportunities</h2><p className="mt-1 text-xs text-muted-foreground">One lead workspace, two connected sources. Records remain in their original systems.</p></div><div className="flex flex-wrap gap-3 text-xs"><a className="text-primary" href="https://cal.yorkstead.com/crm/review">Review pending captures →</a><a className="text-primary" href="https://cal.yorkstead.com/crm/pipeline">Manage opportunities →</a></div></div>
  <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-secondary px-3 py-2">{websiteLeads.length} website inquiries on this page</span><span className="rounded-md bg-secondary px-3 py-2">{prospects.length} active CRM opportunities</span></div>
  {prospects.length===0?<p className="mt-4 text-sm text-muted-foreground">No approved Automation Hub prospects yet. Pending voice captures remain in their separate approval queue.</p>:<div className="mt-4 grid gap-2">{prospects.map(p=>{
   const matches=matchKeys.filter(lead=>(p.contact_email&&lead.email&&lead.email.toLowerCase()===p.contact_email.toLowerCase())||(p.company&&lead.company&&normalized(lead.company)===normalized(p.company)));
   return <article key={p.opportunity_id} className="rounded-lg bg-secondary/50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[9px] uppercase text-primary">AI capture · approved</span><strong className="text-sm">{p.company}</strong><span className="text-xs text-muted-foreground">{p.stage}</span>{matches.length>0&&<span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">Possible website match · review manually</span>}</div><p className="mt-2 text-sm">{p.title}</p><p className="mt-1 text-xs text-muted-foreground">{p.contact_name?('Contact: '+p.contact_name+' · '):''}{p.next_action||'No next action'}{p.follow_up_date?' · Follow up '+String(p.follow_up_date).slice(0,10):''}</p></article>;
  })}</div>}
  <p className="mt-3 text-[11px] text-muted-foreground">Possible matches compare company names and emails against up to 5,000 recent nonarchived website inquiries, not just the current page. They are warnings, not automatic merges.</p>
 </section>;
}
