import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {getOwnerSession} from "@/lib/owner-session";
import {contactDatabase} from "@/lib/contact-inquiries";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 const noStore={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
 if(!await getOwnerSession(await headers()))return NextResponse.json({error:"unauthorized"},{status:401,headers:noStore});
 try{
  const sql=await contactDatabase();
  const rows=await sql`SELECT id,name,company,status,created_at,converted_project_id
   FROM contact_inquiries ORDER BY id ASC LIMIT 100`;
  const records=rows.map(row=>({
   id:Number(row.id),name:String(row.name||""),company:row.company?String(row.company):null,
   status:String(row.status||""),createdAt:String(row.created_at||""),
   hasConvertedProject:Boolean(row.converted_project_id),
   adornedMatch:/adorned/i.test(String(row.name||"")+" "+String(row.company||"")),
  }));
  return NextResponse.json({
   mode:"read_only",total:records.length,
   adornedMatches:records.filter(row=>row.adornedMatch).length,
   records,
   note:"No lead records are changed by this endpoint. Review exact IDs before a separate backup and cleanup.",
  },{headers:noStore});
 }catch{return NextResponse.json({error:"lead_inventory_unavailable"},{status:503,headers:noStore});}
}
