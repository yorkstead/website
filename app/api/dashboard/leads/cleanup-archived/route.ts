import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {contactDatabase} from "@/lib/contact-inquiries";
import {getOwnerSession} from "@/lib/owner-session";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const responseHeaders={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const targetIds=[1,2,3,4,5,6,7,9,10];

export async function POST(request:Request){
 if(!await getOwnerSession(await headers()))return NextResponse.json({error:"unauthorized"},{status:401,headers:responseHeaders});
 const body=await request.json().catch(()=>null);
 if(body?.confirmation!=="DELETE NINE ARCHIVED TEST LEADS KEEP ADORNED 8")
  return NextResponse.json({error:"confirmation_required"},{status:400,headers:responseHeaders});
 try{
  const sql=await contactDatabase();
  const before=await sql`SELECT id,name,company,status,converted_project_id FROM contact_inquiries ORDER BY id`;
  const retained=before.find(x=>Number(x.id)===8);
  const others=before.filter(x=>Number(x.id)!==8);
  if(before.length!==10||!retained||!/adorned/i.test(String(retained.name)+" "+String(retained.company))||
     retained.status!=="won"||others.length!==9||
     others.some(x=>!targetIds.includes(Number(x.id))||x.status!=="archived"||x.converted_project_id))
   return NextResponse.json({error:"inventory_changed_no_deletion",count:before.length},{status:409,headers:responseHeaders});
  await sql`CREATE TABLE IF NOT EXISTS contact_inquiries_cleanup_backup_20261020 (
   original_id bigint PRIMARY KEY, original_record jsonb NOT NULL, backed_up_at timestamptz NOT NULL DEFAULT now()
  )`;
  // Single PostgreSQL statement: deletion and backup insert are atomic.
  const archived=await sql`
   WITH guarded AS (
    SELECT (SELECT COUNT(*) FROM contact_inquiries)=10
     AND (SELECT COUNT(*) FROM contact_inquiries WHERE id=8 AND status='won'
           AND (name ILIKE '%adorned%' OR company ILIKE '%adorned%'))=1
     AND (SELECT COUNT(*) FROM contact_inquiries
          WHERE id IN (1,2,3,4,5,6,7,9,10) AND status='archived'
          AND converted_project_id IS NULL)=9 AS allowed
   ), removed AS (
    DELETE FROM contact_inquiries c
    WHERE c.id IN (1,2,3,4,5,6,7,9,10) AND c.status='archived'
      AND c.converted_project_id IS NULL AND (SELECT allowed FROM guarded)
    RETURNING c.*
   ), saved AS (
    INSERT INTO contact_inquiries_cleanup_backup_20261020(original_id,original_record)
    SELECT id,to_jsonb(removed) FROM removed
    RETURNING original_id
   )
   SELECT COUNT(*)::int AS backed_up FROM saved`;
  const backedUp=Number(archived[0]?.backed_up||0);
  const remaining=await sql`SELECT id,name,company,status FROM contact_inquiries ORDER BY id`;
  return NextResponse.json({backedUp,remaining:remaining.map(x=>({id:Number(x.id),name:x.name,company:x.company,status:x.status})),status:backedUp===9&&remaining.length===1&&Number(remaining[0].id)===8?"complete":"verify_required"},
   {headers:responseHeaders});
 }catch{return NextResponse.json({error:"cleanup_failed_check_records_before_retry"},{status:503,headers:responseHeaders});}
}
