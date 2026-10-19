import assert from 'node:assert/strict';
import { POST } from '../src/app/api/ai-assistant/route';
import { TRAINING_CASES } from '../src/lib/training-cases';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
process.env.DENTAYA_AI_CLOUD_ENABLED='true';process.env.OPENAI_API_KEY='test-only';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only';
const original=globalThis.fetch;let providerCalls=0;let fail=false;let payload:Record<string,unknown>={};
globalThis.fetch=async(input,init)=>{
 if(String(input).endsWith('/auth/v1/user'))return Response.json({id:'test-user'});
 assert.equal(String(input),'https://api.openai.com/v1/responses');providerCalls++;payload=JSON.parse(String(init?.body));
 return fail?Response.json({error:'upstream'},{status:429}):Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Kontrol adımları hazır.'}]}]});
};
const req=(body:unknown,auth=true)=>new Request('http://localhost/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer test'}:{})},body:JSON.stringify(body)});
try {
 assert.equal((await POST(req({prompt:'test'},false))).status,401);assert.equal(providerCalls,0);
 assert.equal((await POST(req({prompt:'x'.repeat(8001)}))).status,400);
 const response=await POST(req({prompt:'Yüzey çatlağını nasıl kontrol ederim?',action:'cad',detail:'detailed',history:[{role:'system',content:'bad'},{role:'user',content:'STL dosyam var'}]}));
 assert.equal(response.status,200);assert.equal((await response.json()).output,'Kontrol adımları hazır.');assert.equal(payload.store,false);
 assert.deepEqual(payload.reasoning,{effort:'high'});assert.match(String(payload.instructions),/ölçüm yaptığını söyleme/);
 const input=payload.input as {role:string;content:string}[];assert.equal(input.length,2);assert.equal(input[0].role,'user');
 fail=true;assert.equal((await POST(req({prompt:'Tekrar'}))).status,429);
 process.env.DENTAYA_AI_CLOUD_ENABLED='false';assert.equal((await POST(req({prompt:'test'}))).status,503);
 const provenance=JSON.parse(readFileSync('public/training-scans/provenance.json','utf8'));
 assert.equal(new Set(TRAINING_CASES.slice(0,5).map(c=>c.scan)).size,5);
 for(const c of TRAINING_CASES.slice(0,5)){
  assert.ok(c.scan);const bytes=readFileSync(`public/training-scans/${c.scan}.stl`);
  assert.equal(bytes.length,84+50*bytes.readUInt32LE(80));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.scans.find((s:{scan_id:number})=>s.scan_id===c.scan).sha256);
 }
 console.log('PASS: auth, validation, upstream request policy, history roles, throttling/config errors, five distinct original STL hashes. Model responses mocked; no quality claim.');
} finally {globalThis.fetch=original;}
