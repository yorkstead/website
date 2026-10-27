import {readFileSync} from 'node:fs';
const url=process.env.RETIREMENT_TEST_DATABASE_URL;
try {
 const u=new URL(url);
 if(process.env.RETIREMENT_TEST_CONFIRM!=='YES'||!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||!u.port||u.search||u.hash||!/^\/[a-z0-9_]+_test$/.test(u.pathname)||url===process.env.DATABASE_URL)throw Error();
} catch {throw Error('Disposable loopback confirmation required');}
const website=JSON.parse(readFileSync('package.json','utf8')).name==='yorkstead-website';
function processSQL(sql,label='retirement-test'){
 const safeEnv={...process.env};
 for(const name of ['PGHOSTADDR','PGSERVICE','PGSERVICEFILE'])delete safeEnv[name];
 return Bun.spawn(['psql',url,'-X','-Atq','-v','ON_ERROR_STOP=1','-c',sql],{stdout:'pipe',stderr:'pipe',env:{...safeEnv,PGAPPNAME:label,PGOPTIONS:'-c statement_timeout=10000 -c lock_timeout=5000'}});
}
async function finish(proc,expectSuccess=true){
 const [out,,code]=await Promise.all([new Response(proc.stdout).text(),new Response(proc.stderr).text(),proc.exited]);
 if((code===0)!==expectSuccess)throw Error('Disposable SQL outcome mismatch');
 return out.trim();
}
async function sql(statement){return finish(processSQL(statement));}
async function waiting(label){
 for(let i=0;i<30;i++){
  const n=await sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name='${label}' AND wait_event='PgSleep'`);
  if(Number(n)>0)return;
  await Bun.sleep(100);
 }
 throw Error('Concurrent fixture did not reach lock hold');
}
async function fixture(suffix){
 if(website){
  const id=await sql(`INSERT INTO contact_inquiries(name,email,message,company,ip_hash,status) VALUES('Synthetic Concurrent','concurrent-${suffix}@example.test','Synthetic','Synthetic ${suffix}',repeat('a',64),'won') RETURNING id`);
  if(!/^\d+$/.test(id))throw Error('Invalid synthetic inquiry');
  return id;
 }
 const id=await sql(`INSERT INTO crm_companies(name,stage) VALUES('Synthetic Concurrent ${suffix}','client') RETURNING id`);
 if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Invalid synthetic company');
 return id;
}
function digestSQL(id){return website?`SELECT inquiry_retirement_digest(${id})`:`SELECT crm_retirement_digest('${id}')`;}
function retireSQL(id,digest){const operation=crypto.randomUUID();return website?`SELECT retire_inquiry(${id},'${digest}','${operation}','synthetic:owner')`:`SELECT retire_crm_engagement('${id}','${digest}','${operation}','synthetic:owner')`;}
function writeSQL(id){return website?`UPDATE contact_inquiries SET notes='Synthetic concurrent edit' WHERE id=${id}`:`UPDATE crm_companies SET notes='Synthetic concurrent edit' WHERE id='${id}'`;}
function lockSQL(id){return website?`SELECT id FROM contact_inquiries WHERE id=${id} FOR UPDATE`:`SELECT id FROM crm_companies WHERE id='${id}' FOR UPDATE`;}
const first=await fixture(crypto.randomUUID());
let firstWrite=writeSQL(first);
if(!website){
 const project=await sql(`INSERT INTO crm_projects(company_id,name) VALUES('${first}','Synthetic Concurrent Project') RETURNING id`);
 const record=await sql(`INSERT INTO crm_project_records(project_id,record_type,title,amount_cents) VALUES('${project}','payment','Synthetic Concurrent Record',123) RETURNING id`);
 if(!/^[0-9a-f-]{36}$/.test(record))throw Error('Invalid synthetic record');
 firstWrite=`UPDATE crm_project_records SET amount_cents=124 WHERE id='${record}'`;
}
const firstDigest=await sql(digestSQL(first));
const writer=processSQL(`BEGIN; ${firstWrite}; SELECT pg_sleep(0.8); COMMIT;`,'retirement-concurrent-writer');
await waiting('retirement-concurrent-writer');
await finish(processSQL(retireSQL(first,firstDigest)),false);
await finish(writer);
const still=await sql(website?`SELECT count(*) FROM inquiry_retirements WHERE inquiry_id=${first}`:`SELECT count(*) FROM crm_engagement_retirements WHERE company_id='${first}'`);
if(still!=='0')throw Error('Stale operation created tombstone');
const second=await fixture(crypto.randomUUID());const secondDigest=await sql(digestSQL(second));
await finish(processSQL(`BEGIN ISOLATION LEVEL REPEATABLE READ; ${retireSQL(second,secondDigest)}; COMMIT;`),false);
const retired=processSQL(`BEGIN; ${lockSQL(second)}; ${retireSQL(second,secondDigest)}; SELECT pg_sleep(0.8); COMMIT;`,'retirement-concurrent-retire');
await waiting('retirement-concurrent-retire');
await finish(processSQL(writeSQL(second)),false);
await finish(retired);
const done=await sql(website?`SELECT count(*) FROM inquiry_retirement_audit WHERE inquiry_id=${second}`:`SELECT count(*) FROM crm_retirement_audit WHERE company_id='${second}'`);
if(done!=='1')throw Error('Concurrent retirement audit missing');
console.log('Concurrent stale-write and post-retirement denial: PASS (synthetic disposable database)');
