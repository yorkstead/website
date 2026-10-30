import { Pool } from "pg";
import { getAuth } from "../../lib/auth";

export const cc023Owner={email:"cc023-owner@example.test",password:"Fictional-cc023-owner-32958741"};
function database(){
 const value=process.env.TEST_DATABASE_URL;
 if(!value||value!==process.env.DATABASE_URL||process.env.NODE_ENV==="production")throw new Error("CC-023 browser tests require identical disposable database URLs");
 const url=new URL(value);
 if(!["postgres:","postgresql:"].includes(url.protocol)||!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||!/(^|[_-])(test|disposable)([_-]|$)/i.test(url.pathname))throw new Error("CC-023 browser tests require loopback test/disposable PostgreSQL");
 return value;
}
export async function setupCc023Owner(){
 const pool=new Pool({connectionString:database()});
 try{
  const hash=await (await getAuth().$context).password.hash(cc023Owner.password);
  await pool.query(`INSERT INTO public."user"(id,name,email,"emailVerified") VALUES('cc023-browser-owner','Fictional CC-023 owner',$1,true) ON CONFLICT(id) DO UPDATE SET email=excluded.email,"emailVerified"=true`,[cc023Owner.email]);
  await pool.query(`INSERT INTO public."account"(id,"userId","accountId","providerId",password,"updatedAt") VALUES('cc023-browser-owner','cc023-browser-owner','cc023-browser-owner','credential',$1,now()) ON CONFLICT(id) DO UPDATE SET password=excluded.password,"updatedAt"=now()`,[hash]);
 }finally{await pool.end();}
}
export async function disposeCc023Owner(){
 const pool=new Pool({connectionString:database()});
 try{await pool.query(`DELETE FROM public."session" WHERE "userId"='cc023-browser-owner'`);await pool.query(`DELETE FROM public."account" WHERE "userId"='cc023-browser-owner'`);await pool.query(`DELETE FROM public."user" WHERE id='cc023-browser-owner'`);}finally{await pool.end();}
}
