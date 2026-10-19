type Brief={date:string;priority:{label:string;why:string}|null;agenda:{today:string[];tomorrow:string[]};openTasks:{today:string[];tomorrow:string[];overdue:string[]};news:{title:string;source:string;link:string}[]};
const items=(values:string[],empty:string)=><>{values.length?<ul className="mt-3 space-y-2 text-sm">{values.slice(0,5).map((v,i)=><li key={i} className="rounded-lg bg-secondary/60 px-3 py-2">{v}</li>)}</ul>:<p className="mt-3 text-sm text-muted-foreground">{empty}</p>}</>;
export async function DashboardOperationsBriefing(){
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return null;
 let data:Brief;
 try{
  const r=await fetch('https://cal.yorkstead.com/api/briefing',{headers:{Authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(22000)});
  if(!r.ok)throw Error('HTTP '+r.status);
  data=await r.json() as Brief;
  if(!data.agenda||!data.openTasks)throw Error('incomplete');
 }catch{
  return <section className="rounded-xl bg-card/80 p-5"><h2 className="text-base font-semibold">Daily Google operations</h2><p className="mt-2 text-sm text-muted-foreground">Live schedule and tasks are temporarily unavailable. Your website projects and lead management remain available.</p><a className="mt-3 inline-block text-sm text-primary" href="https://cal.yorkstead.com/command">Open daily operations →</a></section>;
 }
 return <section aria-label="Google-connected daily operations" className="rounded-xl bg-card/80 p-5">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Google-connected operations</p><h2 className="mt-2 text-xl font-semibold">Your day at a glance</h2></div><a className="text-sm text-primary" href="https://cal.yorkstead.com/command">Manage tasks and capture →</a></div>
  <div className="mt-4 rounded-lg bg-primary/5 p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Revenue priority</p><p className="mt-2 text-lg font-medium">{data.priority?.label||'Follow up with a qualified prospect'}</p><p className="mt-1 text-xs text-muted-foreground">{data.priority?.why||'No revenue-specific action is scheduled.'}</p></div>
  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
   <div className="rounded-lg bg-secondary/30 p-4"><h3 className="text-sm font-semibold">Today · Calendar</h3>{items(data.agenda.today,'No appointments today.')}</div>
   <div className="rounded-lg bg-secondary/30 p-4"><h3 className="text-sm font-semibold">Tasks due today</h3>{items(data.openTasks.today,'No tasks due today.')}</div>
   <div className="rounded-lg bg-secondary/30 p-4"><h3 className="text-sm font-semibold">Overdue tasks</h3>{items(data.openTasks.overdue,'Nothing overdue.')}</div>
   <div className="rounded-lg bg-secondary/30 p-4"><h3 className="text-sm font-semibold">Tomorrow · Calendar</h3>{items(data.agenda.tomorrow,'No appointments tomorrow.')}</div>
   <div className="rounded-lg bg-secondary/30 p-4"><h3 className="text-sm font-semibold">Tomorrow · Tasks</h3>{items(data.openTasks.tomorrow,'No tasks due tomorrow.')}</div>
   <div className="rounded-lg bg-secondary/30 p-4"><h3 className="text-sm font-semibold">Industry intelligence</h3>{data.news?.length?<ul className="mt-3 space-y-2 text-sm">{data.news.slice(0,3).map((n,i)=><li key={i}><a className="text-primary hover:underline" href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a><p className="text-xs text-muted-foreground">{n.source}</p></li>)}</ul>:<p className="mt-3 text-sm text-muted-foreground">No recent headlines available.</p>}</div>
  </div>
  <p className="mt-4 text-xs text-muted-foreground">Google Tasks are displayed here read-only. Complete or edit them in Daily Operations. Website workspace tasks remain a separate list during migration.</p>
 </section>;
}
