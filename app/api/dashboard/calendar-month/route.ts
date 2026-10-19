import {headers} from 'next/headers';
import {getOwnerSession} from '@/lib/owner-session';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 if(!await getOwnerSession(await headers()))return Response.json({error:'unauthorized'},{status:401});
 const month=new URL(req.url).searchParams.get('month')||'';
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:'invalid_month'},{status:400});
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)return Response.json({error:'bridge_not_configured'},{status:503});
 try{
  const r=await fetch('https://cal.yorkstead.com/api/integrations/calendar-month?month='+month,{headers:{Authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(18000)});
  if(!r.ok)return Response.json({error:'calendar_unavailable'},{status:503});
  const data=await r.json();return Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'calendar_unavailable'},{status:503});}
}
