export type GoogleActionTask={id:string;listId:string;title:string;due:string};
export type GoogleOperations={actionableTasks:GoogleActionTask[];priority:{label:string;why:string}|null;agenda:{today:string[];tomorrow:string[]};openTasks:{today:string[];tomorrow:string[];overdue:string[]}};
export async function getGoogleOperations():Promise<GoogleOperations|null>{
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return null;
 try{
  const r=await fetch('https://cal.yorkstead.com/api/briefing',{headers:{Authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!r.ok)return null;
  const v=await r.json() as GoogleOperations;
  if(!v?.agenda?.today||!v?.openTasks?.today)return null;
  return {actionableTasks:(v.actionableTasks||[]).slice(0,100),priority:v.priority||null,agenda:{today:v.agenda.today.slice(0,20),tomorrow:(v.agenda.tomorrow||[]).slice(0,20)},openTasks:{today:v.openTasks.today.slice(0,30),tomorrow:(v.openTasks.tomorrow||[]).slice(0,30),overdue:(v.openTasks.overdue||[]).slice(0,30)}};
 }catch{return null;}
}
