import assert from 'node:assert/strict';
import {POST} from '../src/app/api/ai-assistant/route';
const original=globalThis.fetch;let calls=0,instructions='';
process.env.DENTAYA_AI_CLOUD_ENABLED='true';process.env.OPENAI_API_KEY='test-only';process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
globalThis.fetch=async(input,init)=>{if(String(input).endsWith('/auth/v1/user'))return Response.json({id:'rc27-body-test'});calls++;instructions=JSON.parse(String(init?.body)).instructions;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Test'}]}]});};
const request=(body:string,headers:Record<string,string>={})=>new Request('http://localhost/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test',...headers},body});
try{
 assert.equal((await POST(request('{}',{'Content-Length':'128001'}))).status,413);
 const streamed=await POST(request(JSON.stringify({prompt:'x'.repeat(128001)})));assert.equal(streamed.status,413);assert.equal((await streamed.json()).error,'REQUEST_TOO_LARGE');assert.equal(calls,0);
 assert.equal((await POST(request('{broken'))).status,400);assert.equal(calls,0);
 assert.equal((await POST(request(JSON.stringify({prompt:'hello',locale:'ar'})))).status,200);assert.match(instructions,/العربية/);
 assert.equal((await POST(request(JSON.stringify({prompt:'hello',locale:'EVIL_LOCALE_OVERRIDE'})))).status,200);assert.equal(instructions.includes('EVIL_LOCALE_OVERRIDE'),false);
 assert.equal((await POST(request(JSON.stringify({prompt:'test',action:'diagnostic',locale:'ar'})))).status,200);assert.equal(instructions,'Bağlantı testi. Yalnızca TAMAM yaz.');
 console.log('PASS AYA request: declared and streamed body limits, malformed JSON, allowlisted language, unchanged diagnostic. Provider/auth mocked.');
}finally{globalThis.fetch=original;}
