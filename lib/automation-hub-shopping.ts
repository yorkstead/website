import { z } from 'zod';
import { AutomationHubShoppingCommand, AutomationHubShoppingResult } from '@/lib/automation-hub-shopping-schema';

const ENDPOINT='https://cal.yorkstead.com/api/integrations/website-shopping';
export async function postAutomationHubShoppingCommand(input:z.infer<typeof AutomationHubShoppingCommand>) {
  const unavailable={result:null as null,httpStatus:503};
  if(process.env.YORKSTEAD_SHOPPING_ACTIONS_ENABLED!=='true')return unavailable;
  const secret=process.env.YORKSTEAD_SHOPPING_WRITE_SECRET;
  if(!secret||secret.length<32)return unavailable;
  try{
    const response=await fetch(ENDPOINT,{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify(input),cache:'no-store',signal:AbortSignal.timeout(12000)});
    const parsed=AutomationHubShoppingResult.safeParse(await response.json());
    if(!parsed.success)return unavailable;
    return {result:parsed.data,httpStatus:response.status};
  }catch{return unavailable;}
}
