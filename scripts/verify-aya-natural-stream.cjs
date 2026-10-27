'use strict';
const assert=require('node:assert/strict');
const {createLocalAya}=require('../electron/aya-local.cjs');
const {CONTEXT_MARKER}=require('../electron/aya/agent.cjs');

// Real bridge and context preparation; only the loopback Ollama transport is synthetic.
const encoder=new TextEncoder(),model={name:'qwen3:4b',size:2500000000,details:{format:'gguf'}};
const line=value=>JSON.stringify(value)+'\r\n';
const memory={goal:'Cuma günkü teslimi birlikte hazırla',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati kaç?']};
const prompt='Bir rüzgâr çanının ağzından, yağmuru ilk kez duyan çocuklara üç yeni cümle kur.';
const first='Kış bahçesinde çınlıyorum.',second=' Yağmur her damlada yeni bir ritim buluyor. 🌧️';
function chunksResponse(chunks,{onCancel=()=>{},close=true}={}){
 let index=0;
 return new Response(new ReadableStream({pull(controller){if(index<chunks.length)controller.enqueue(chunks[index++]);else if(close)controller.close();},cancel:onCancel}),{headers:{'Content-Type':'application/x-ndjson'}});
}
function byteFragments(text){const bytes=encoder.encode(text),parts=[];for(let i=0;i<bytes.length;i+=7)parts.push(bytes.subarray(i,Math.min(bytes.length,i+7)));return parts;}
const immediate=()=>new Promise(resolve=>setImmediate(resolve));
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Cancellation did not settle')),1500);})]);}finally{clearTimeout(timer);}}

(async()=>{
 let mode='fragmented',payload,chatCalls=0,cancelledStreams=0,held;
 const api=createLocalAya({fetchImpl:async(url,options)=>{
  assert.ok(url.startsWith('http://127.0.0.1:11434/api/'));assert.equal(options.redirect,'error');assert.equal(options.headers?.Authorization,undefined);
  if(url.endsWith('/tags'))return Response.json({models:[model]});
  if(url.endsWith('/show'))return Response.json({capabilities:['completion']});
  assert.ok(url.endsWith('/chat'));chatCalls++;payload=JSON.parse(options.body);
  if(mode==='cad')return Response.json({done:true,message:{content:JSON.stringify({answer:'Önce güncel kernel kontrolünü Uygula ile başlatabiliriz.',goal:'46 kontrolü',decisions:[],openQuestions:[],actions:[{tool:'inspect',reason:'Güncel geometriyi kontrol et'}]})}});
  if(mode==='complete-open')return chunksResponse([encoder.encode(line({done:true,message:{content:'A completed reply without a closed socket.'}}))],{close:false,onCancel:()=>{cancelledStreams++;}});
  if(mode==='status-error')return new Response('missing',{status:404});
  if(mode==='partial')return chunksResponse([encoder.encode(line({done:false,message:{content:'Yanıtın yalnız ilk bölümü.'}}))]);
  if(mode==='error')return chunksResponse([encoder.encode(line({error:'PRIVATE C:\\patient\\model.gguf https://private.invalid'}))]);
  if(mode==='malformed')return chunksResponse([encoder.encode('{not valid JSON}\n')]);
  if(mode==='oversized-output')return chunksResponse([encoder.encode(line({done:false,message:{content:'x'.repeat(64001)}}))]);
  if(mode==='oversized-line')return chunksResponse(Array.from({length:130},()=>encoder.encode('x'.repeat(1000))));
  if(mode==='oversized-transfer')return chunksResponse(Array.from({length:3000},()=>encoder.encode(line({done:false,message:{thinking:'t'.repeat(1050)}}))),{onCancel:()=>{cancelledStreams++;}});
  if(mode==='hold')return new Response(new ReadableStream({start(controller){held=controller;controller.enqueue(encoder.encode(line({done:false,message:{content:'İlk gerçek parça'}})));},cancel(){cancelledStreams++;}}),{headers:{'Content-Type':'application/x-ndjson'}});
  return chunksResponse(byteFragments(
   line({done:false,message:{thinking:'PRIVATE_INTERNAL_REASONING'}})+
   line({done:false,message:{content:first}})+
   line({done:false,message:{content:second}})+
   line({done:true,eval_count:17,total_duration:12000000,message:{content:''}})
  ));
 }});
 const seen=[],input={agent:false,prompt,model:model.name,locale:'tr',workingMemory:memory,options:{useKnowledge:false,useNote:false},history:[{role:'user',content:'İlk hedefimizi hatırla.'},{role:'assistant',content:'Teslim planını birlikte ilerleteceğiz.'}]};
 const untouched=JSON.stringify(input),reply=await api.chat(input,31,s=>s,value=>seen.push(value));
 assert.equal(reply.ok,true,reply.error);assert.equal(payload.stream,true,'Natural conversation must request a real stream');assert.equal(payload.think,false);assert.equal(Object.hasOwn(payload,'format'),false,'Natural replies are not forced into the CAD/memory JSON schema');
 assert.equal(payload.messages.at(-1).content,prompt,'A new free-form request must reach the selected model unchanged');
 const prepared=JSON.parse(payload.messages.find(message=>message.role==='user'&&message.content.startsWith(CONTEXT_MARKER)).content.slice(CONTEXT_MARKER.length));
 assert.deepEqual(prepared.workingMemory,memory,'Plain conversation retains the actual goal, decisions and open questions');
 assert.ok(payload.messages.some(message=>message.content==='Teslim planını birlikte ilerleteceğiz.'));
 assert.equal(reply.output,first+second);assert.deepEqual(seen,[first,first+second],'The UI receives cumulative natural text, with fragmented UTF-8/NDJSON decoded correctly');
 assert.equal(reply.metrics.tokens,17);assert.equal(JSON.stringify(input),untouched);assert.ok(!seen.some(value=>value.includes('PRIVATE_INTERNAL_REASONING')),'Hidden thinking is never displayed as a reply');
 assert.equal(reply.workingMemory,undefined,'A natural answer cannot itself overwrite working memory');assert.equal(reply.proposals,undefined,'A natural answer does not become an executable CAD plan');
 mode='complete-open';const cancelledBefore=cancelledStreams;assert.equal((await bounded(api.chat(input,31))).output,'A completed reply without a closed socket.');assert.ok(cancelledStreams>cancelledBefore,'A valid completion releases the stream without waiting for a stalled server EOF');
 const normalCalls=chatCalls;
 for(const failure of ['partial','error','malformed','oversized-output','oversized-line','oversized-transfer','status-error']){
  mode=failure;const tokens=[];const failed=await api.chat({...input,prompt:'Continue the same task.'},31,s=>s,value=>tokens.push(value));
  assert.equal(failed.ok,false,'Malformed, incomplete or oversized '+failure+' is never a successful answer');
  if(failure.startsWith('oversized'))assert.equal(failed.error,'LOCAL_RESPONSE_TOO_LARGE',failure);
  else if(failure==='status-error')assert.equal(failed.error,'MODEL_MISSING');
  else if(failure==='partial')assert.ok(['LOCAL_EMPTY_RESPONSE','LOCAL_INCOMPLETE_RESPONSE'].includes(failed.error),failed.error);
  else assert.ok(['LOCAL_REQUEST_FAILED','LOCAL_INVALID_RESPONSE'].includes(failed.error),failed.error);
  assert.doesNotMatch(JSON.stringify(failed),/PRIVATE|patient|private\.invalid/,'Raw runtime details do not escape through a stream error');
  assert.ok(tokens.every(value=>value.length<=64000),'Oversized output is rejected before it is published to the UI');
 }
 assert.equal(chatCalls,normalCalls+7);assert.ok(cancelledStreams>0,'A size-limited transfer releases its stream');
 mode='hold';let started;const firstToken=new Promise(resolve=>{started=resolve;}),oldTokens=[];
 const pending=api.chat({...input,prompt:'Bu yanıtı ben durduracağım.'},41,s=>s,value=>{oldTokens.push(value);started();});
 await bounded(firstToken);api.cancel(99);assert.equal(api.isBusy(),true,'A different window cannot cancel the active conversation');
 api.cancel(41);assert.equal((await bounded(pending)).error,'LOCAL_CANCELLED');assert.equal(api.isBusy(),false);
 const beforeLate=oldTokens.length;mode='fragmented';assert.equal((await api.chat(input,41)).ok,true,'Cancellation releases the bridge for a fresh question');
 try{held.enqueue(encoder.encode(line({done:true,message:{content:'THIS_LATE_REPLY_MUST_NOT_APPEAR'}})));held.close();}catch(error){assert.equal(error.name,'TypeError');}
 await immediate();await immediate();assert.equal(oldTokens.length,beforeLate,'An uncooperative old stream cannot publish tokens after cancellation');
 mode='cad';const cadTokens=[];
 const cad=await api.chat({...input,agent:true,prompt:'Güncel çalışma için kontrol öner.',cadContext:{scope:'case-a:scan-a:46',snapshot:'snapshot-a',dataToken:'mesh-a',unit:'46',restoration:'İmplant üstü kron',stage:'inspect',task:'inspect',setupComplete:true,sourceReady:true,modelReady:true,marginPoints:32,placed:true,visible:true,unsaved:true,saveFailed:false,availableTools:['inspect']}},31,s=>s,value=>cadTokens.push(value));
 assert.equal(cad.ok,true,cad.error);assert.equal(payload.stream,false);assert.equal(payload.format.properties.actions.maxItems,4);assert.deepEqual(payload.format.properties.actions.items.properties.tool.enum,['inspect']);assert.equal(cad.proposals[0].tool,'inspect');assert.equal(cad.proposals[0].scope,'case-a:scan-a:46');assert.deepEqual(cadTokens,[],'Structured CAD JSON is validated before anything is displayed');
 console.log(JSON.stringify({pass:true,realBridge:true,naturalStream:true,workingMemoryContext:true,novelPromptUnchanged:true,fragmentedUtf8AndNdjson:true,cumulativeContentOnly:true,thoughtTokensHidden:true,completionRequired:true,outputAndLineAndTransferBounds:true,streamErrorsPrivate:true,cancellationOwnerIsolation:true,noLateTokens:true,cadRemainsStructured:true,modelInference:'mock transport only'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
