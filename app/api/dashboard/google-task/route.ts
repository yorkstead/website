import {headers} from 'next/headers';
import {getOwnerSession} from '@/lib/owner-session';
import {z} from 'zod';
const Body=z.object({listId:z.string().min(1).max(250),taskId:z.string().min(1).max(250),title:z.string().min(1).max(1024)}).strict();
export async function POST(req:Request){
 const session=await getOwnerSession(await headers());
 if(!session)return Response.json({error:'unauthorized'},{status:401});
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'forbidden'},{status:403});
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:'invalid_task'},{status:400});
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return Response.json({error:'bridge_not_configured'},{status:503});
 try{
  const r=await fetch('https://cal.yorkstead.com/api/command/task-complete',{method:'POST',headers:{Authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify(parsed.data),cache:'no-store',signal:AbortSignal.timeout(18000)});
  const v=await r.json().catch(()=>({error:'upstream_unavailable'}));
  return Response.json({status:v.status,error:v.error},{status:r.status,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'completion_unconfirmed_check_google_tasks'},{status:503});}
}
