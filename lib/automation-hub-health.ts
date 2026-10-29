export type AutomationHubHealth={
 state:"responding"|"degraded"|"unavailable";
 checkedAt:string;
};

export async function getAutomationHubHealth():Promise<AutomationHubHealth>{
 const checkedAt=new Date().toISOString();
 try{
  const response=await fetch("https://cal.yorkstead.com/api/health",{cache:"no-store",signal:AbortSignal.timeout(5000)});
  if(!response.ok)return {state:"degraded",checkedAt};
  const body=await response.json() as {status?:unknown;service?:unknown};
  return {state:body?.status==="ok"&&body?.service==="yorkstead-automation-hub"?"responding":"degraded",checkedAt};
 }catch{return {state:"unavailable",checkedAt};}
}
