import assert from 'node:assert/strict';
import {GET,POST} from '../src/app/api/ai-assistant/route';
import {normalizeCadWorkspace} from '../src/lib/cad-workspace-preferences';
import {validateCustomization,INTERFACE_STYLES,DEFAULT_CUSTOMIZATION} from '../src/app/customization';
const original=globalThis.fetch;let providerCalls=0,status=200,code='',payload:Record<string,unknown>={};
process.env.DENTAYA_AI_CLOUD_ENABLED='true';process.env.OPENAI_API_KEY='test-only';process.env.DENTAYA_AI_MODEL='gpt-5.4';process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
globalThis.fetch=async(input,init)=>{if(String(input).endsWith('/auth/v1/user'))return Response.json({id:'rc26-test-user'});providerCalls++;payload=JSON.parse(String(init?.body));return Response.json(status===200?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'TAMAM'}]}]}:{error:{code}},{status});};
const req=(auth=true)=>new Request('http://localhost/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer test'}:{})},body:JSON.stringify({action:'diagnostic',prompt:'test',history:[{role:'user',content:'PRIVATE CASE DATA'}],context:{private:'PRIVATE CASE DATA'}})});
try{
 const health=await GET();assert.equal(health.headers.get('Cache-Control'),'no-store');const h=await health.json();assert.equal(h.enabled,true);assert.equal(h.authConfigured,true);assert.equal(JSON.stringify(h).includes('test-only'),false);
 assert.equal((await POST(req(false))).status,401);assert.equal(providerCalls,0);
 assert.equal((await POST(req())).status,200);assert.equal(payload.store,false);assert.equal(payload.max_output_tokens,2048);assert.equal(JSON.stringify(payload).includes('PRIVATE CASE DATA'),false);
 for(const entry of [[401,'','MODEL_AUTH_INVALID'],[403,'','MODEL_ACCESS_DENIED'],[404,'','MODEL_NOT_AVAILABLE'],[400,'','MODEL_REQUEST_INVALID'],[429,'insufficient_quota','MODEL_QUOTA_EXCEEDED'],[429,'','MODEL_RATE_LIMITED']] as const){[status,code]=entry;assert.equal((await (await POST(req())).json()).error,entry[2]);}
 process.env.DENTAYA_AI_CLOUD_ENABLED='false';assert.equal((await (await GET()).json()).reason,'cloud_disabled');assert.equal((await POST(req())).status,503);
 const p=normalizeCadWorkspace({rotateSpeed:100,zoomSpeed:NaN,panSpeed:-1,background:'bad',axes:true});assert.equal(p.rotateSpeed,2);assert.equal(p.zoomSpeed,1);assert.equal(p.panSpeed,.25);assert.equal(p.background,'theme');assert.equal(p.axes,true);
 assert.equal(validateCustomization({lineHeight:9}).lineHeight,1.9);assert.equal(validateCustomization({style:'missing'}).style,'custom');assert.equal(INTERFACE_STYLES.length,16);for(const style of INTERFACE_STYLES){const v=validateCustomization({...DEFAULT_CUSTOMIZATION,...style.patch,style:style.id});assert.equal(v.style,style.id);assert.equal(v.accent,style.colors[2]);}
 console.log('PASS RC26: diagnostic auth/no-cache/no case content, six provider errors, disabled mode, bounded CAD prefs, all sixteen styles and legacy defaults. Provider mocked.');
}finally{globalThis.fetch=original;}
