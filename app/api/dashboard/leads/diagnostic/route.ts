import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {contactDatabase} from "@/lib/contact-inquiries";
import {getOwnerSession} from "@/lib/owner-session";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 if(!await getOwnerSession(await headers()))return NextResponse.json({error:"unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
 const raw=process.env.DATABASE_URL;
 if(!raw)return NextResponse.json({error:"database_not_configured"},{status:503,headers:{"Cache-Control":"no-store"}});
 try{
  const database=new URL(raw);
  const sql=await contactDatabase();
  const rows=await sql`SELECT COUNT(*)::int total,
    COUNT(*) FILTER (WHERE status NOT IN ('won','lost','archived'))::int active
    FROM contact_inquiries`;
  const counts=rows[0]||{};
  return NextResponse.json({hostname:database.hostname,database:database.pathname.slice(1),total:Number(counts.total||0),active:Number(counts.active||0)},
   {headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"}});
 }catch{return NextResponse.json({error:"database_check_failed"},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
