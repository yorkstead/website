"use server";
import {headers} from "next/headers";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getOwnerSession} from "@/lib/owner-session";

const Update=z.object({
 opportunityId:z.uuid(),
 stage:z.enum(["prospect","qualified","demo","proposal","won","lost"]),
 nextAction:z.string().trim().max(500),
 followUpDate:z.union([z.iso.date(),z.literal("")]),
}).strict();

export async function updateCrmOpportunity(formData:FormData){
 if(!await getOwnerSession(await headers()))throw Error("Unauthorized");
 const parsed=Update.safeParse({
  opportunityId:formData.get("opportunityId"),
  stage:formData.get("stage"),
  nextAction:formData.get("nextAction"),
  followUpDate:formData.get("followUpDate"),
 });
 if(!parsed.success)throw Error("Invalid opportunity update");
 const secret=process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
 if(!secret||secret.length<32)throw Error("CRM connection unavailable");
 const response=await fetch("https://cal.yorkstead.com/api/integrations/website-opportunity",{
  method:"PATCH",cache:"no-store",
  headers:{Authorization:"Bearer "+secret,"content-type":"application/json"},
  body:JSON.stringify(parsed.data),signal:AbortSignal.timeout(12000),
 });
 if(!response.ok)throw Error("CRM update failed. Check the CRM before retrying.");
 revalidatePath("/dashboard/leads");
 revalidatePath("/dashboard");
}
