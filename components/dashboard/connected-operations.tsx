import Link from 'next/link';
type Deal={company:string,title:string,stage:string,next_action:string|null,follow_up_date:string|null,estimated_value_cents:number|null};
export async function ConnectedOperations(){
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return <section className="rounded-xl bg-card/80 p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Connected operations</p><h2 className="mt-2 text-lg font-semibold">Automation Hub connection pending</h2><p className="mt-2 text-sm text-muted-foreground">Add the same YORKSTEAD_DASHBOARD_BRIDGE_SECRET to both Vercel projects to enable live CRM data here.</p><Link className="mt-3 inline-block text-sm text-primary" href="/dashboard/leads">Website leads remain available →</Link></section>;
 try{
  const response=await fetch('https://cal.yorkstead.com/api/integrations/website-summary',{headers:{Authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('Bridge HTTP '+response.status);
  const data=await response.json() as {opportunities:Deal[]};
  const deals=(data.opportunities||[]).slice(0,50);
  const sum=deals.reduce((n,d)=>n+Number(d.estimated_value_cents||0),0)/100;
  return <section className="rounded-xl bg-card/80 p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Connected operations</p><h2 className="mt-2 text-xl font-semibold">Automation Hub pipeline</h2></div><a href="https://cal.yorkstead.com/command" className="text-sm text-primary">Open daily operations →</a></div>
   <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Open opportunities</p><p className="mt-1 text-2xl font-semibold">{deals.length}</p></div><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Estimated value</p><p className="mt-1 text-2xl font-semibold">{sum.toLocaleString('en-US',{style:'currency',currency:'USD'})}</p></div><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Data source</p><p className="mt-2 text-sm font-medium">Automation Hub CRM</p></div></div>
   {deals.length>0?<div className="mt-4 space-y-2">{deals.slice(0,5).map((d,i)=><div key={i} className="flex flex-wrap justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm"><div><strong>{d.company}</strong><span className="ml-2 text-muted-foreground">{d.next_action||d.title}</span></div><span className="text-xs text-muted-foreground">{d.follow_up_date?String(d.follow_up_date).slice(0,10):d.stage}</span></div>)}</div>:<p className="mt-4 text-sm text-muted-foreground">No approved opportunities yet. Website inquiries are tracked separately until we establish a safe lead-matching process.</p>}
  </section>;
 }catch(error){const detail=error instanceof Error?error.message:'Connection failed';const diagnosis=/^Bridge HTTP \d{3}$/.test(detail)?detail:detail.includes('Timeout')||detail.includes('timed out')?'Connection timed out':'Could not connect to Automation Hub';return <section className="rounded-xl bg-card/80 p-5"><h2 className="font-semibold">Connected operations temporarily unavailable</h2><p className="mt-2 text-sm text-muted-foreground">Your existing dashboard and leads are unaffected.</p><p className="mt-2 font-mono text-xs text-primary">Integration diagnostic: {diagnosis}</p></section>;}
}
