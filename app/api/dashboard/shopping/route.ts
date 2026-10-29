import { headers } from 'next/headers';
import { getOwnerSession } from '@/lib/owner-session';
import { AutomationHubShoppingCommand } from '@/lib/automation-hub-shopping-schema';
import { postAutomationHubShoppingCommand } from '@/lib/automation-hub-shopping';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
async function readBounded(request:Request){
  if(Number(request.headers.get('content-length')||0)>8192||!request.body)throw new Error('invalid');
  const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel().catch(()=>undefined);throw new Error('invalid');}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function POST(request:Request){
  if(!(await getOwnerSession(await headers())))return Response.json({error:'unauthorized'},{status:401,headers:privateHeaders});
  if(process.env.YORKSTEAD_SHOPPING_ACTIONS_ENABLED!=='true')return Response.json({error:'actions_disabled'},{status:503,headers:privateHeaders});
  const requestHeaders=await headers();
  const origin=requestHeaders.get('origin'),host=requestHeaders.get('x-forwarded-host')||requestHeaders.get('host');
  const protocol=requestHeaders.get('x-forwarded-proto')||new URL(request.url).protocol.replace(':','');
  if(requestHeaders.get('sec-fetch-site')==='cross-site'||!origin||!host||origin!==`${protocol}://${host}`)
    return Response.json({error:'invalid_request'},{status:403,headers:privateHeaders});
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
    return Response.json({error:'invalid_request'},{status:415,headers:privateHeaders});
  let input;try{input=AutomationHubShoppingCommand.parse(await readBounded(request));}
  catch{return Response.json({error:'invalid_request'},{status:400,headers:privateHeaders});}
  const outcome=await postAutomationHubShoppingCommand(input);
  if(!outcome.result)return Response.json({error:'hub_unavailable',retrySafe:false},{status:503,headers:privateHeaders});
  const status=outcome.httpStatus===202?202:outcome.httpStatus>=400?outcome.httpStatus:200;
  return Response.json(outcome.result,{status,headers:privateHeaders});
}
