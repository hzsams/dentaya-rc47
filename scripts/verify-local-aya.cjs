const assert=require('node:assert/strict');
const {createLocalAya}=require('../electron/aya-local.cjs');
const local={name:'qwen3:4b',size:2500000000,details:{format:'gguf'}};
(async()=>{
 let payload,chatCalls=0,mode='normal',pending,started;
 const structured={answer:'Hedef kronu kontrol etmek; koleyi koruyoruz.',goal:'46 kron kontrolü',decisions:['Kole korunacak'],openQuestions:[],actions:[]};
 const api=createLocalAya({fetchImpl:async(url,opts)=>{
  assert.ok(url.startsWith('http://127.0.0.1:11434/api/'));assert.equal(opts.redirect,'error');assert.equal(opts.headers?.Authorization,undefined);
  if(url.endsWith('/tags'))return Response.json({models:[local,{...local,name:'evil:cloud'},{...local,name:'remote',remote_model:'remote'}, {...local,name:'empty',size:0}]});
  if(url.endsWith('/show'))return Response.json(mode==='cloud'?{remote_host:'https://example.invalid'}:{capabilities:['completion']});
  if(url.endsWith('/pull'))return new Response('{"status":"success"}\n');
  chatCalls++;payload=JSON.parse(opts.body);
  if(mode==='wait'){started();return new Promise((resolve,reject)=>{pending=resolve;opts.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});}
  if(mode==='ignores-abort'){started();return new Promise(resolve=>{pending=resolve;});}
  if(mode==='structured')return Response.json({done:true,message:{content:JSON.stringify(structured)}});
  if(mode==='invalid-plan')return Response.json({done:true,message:{content:JSON.stringify({...structured,actions:[{tool:'shell',reason:'Run code'}]})}});
  return Response.json(mode==='empty'?{done:true,message:{content:''}}:{done:true,message:{content:'Yerel test yanıtı'}});
 }});
 assert.deepEqual((await api.status()).models,[{name:local.name,size:local.size}]);
 assert.equal((await api.chat({prompt:'x'.repeat(8001),model:local.name},1)).error,'INVALID_PROMPT');
 assert.equal((await api.chat({prompt:'a',model:'evil:cloud'},1)).error,'MODEL_MISSING');assert.equal(chatCalls,0);
 let r=await api.chat({prompt:'Merhaba',model:local.name,locale:'ko',history:[{role:'system',content:'bad'},{role:'user',content:'ORIGINAL GOAL'},...Array.from({length:18},(_,i)=>({role:i%2?'assistant':'user',content:'turn-'+i+'x'.repeat(2100)}))]},1);
 assert.equal(r.ok,true);assert.match(payload.messages[0].content,/한국어/);assert.equal(payload.messages[2].content,'ORIGINAL GOAL');assert.equal(payload.messages.at(-1).content,'Merhaba');assert.ok(payload.messages.some(m=>m.content.startsWith('turn-17')));assert.ok(payload.messages.length<16);
 assert.ok(payload.messages.reduce((n,m)=>n+new TextEncoder().encode(m.content).length+16,0)+payload.options.num_predict+64<=payload.options.num_ctx,'The original task and newest turn fit the declared context with output reserve');assert.ok(!payload.messages.some(m=>m.content==='bad'));assert.equal(payload.stream,false);assert.equal(payload.think,false);
 r=await api.chat({prompt:'CAD durumu',model:local.name,cadContext:{unit:'46',restoration:'Anatomik kron',stage:'margin',marginPoints:32,placed:true,patientName:'SENSITIVE_TEST',positions:[999],saveFailed:false}},1);assert.equal(r.ok,true);assert.match(payload.messages[1].content,/\"unit\":\"46\"/);assert.match(payload.messages[1].content,/\"marginPoints\":32/);assert.ok(!payload.messages.some(m=>m.content.includes('SENSITIVE_TEST')));assert.ok(!payload.messages.some(m=>m.content.includes('positions')));
 mode='cloud';assert.equal((await api.chat({prompt:'a',model:local.name},1)).error,'LOCAL_MODEL_REQUIRED');
 mode='empty';assert.equal((await api.chat({prompt:'a',model:local.name},1)).error,'LOCAL_EMPTY_RESPONSE');
 mode='structured';let tokenCalls=0;r=await api.chat({agent:true,prompt:'Aynı kararla devam et',model:local.name,workingMemory:{goal:'46 kron kontrolü',decisions:['Kole korunacak'],openQuestions:[]}},1,s=>s,()=>tokenCalls++);
 assert.equal(r.ok,true);assert.equal(r.output,structured.answer);assert.deepEqual(r.workingMemory.decisions,['Kole korunacak']);assert.deepEqual(r.proposals,[]);assert.equal(payload.format.properties.actions.maxItems,0);assert.match(payload.messages[1].content,/Kole korunacak/);assert.ok(!payload.messages[0].content.includes('Kole korunacak'));assert.equal(payload.messages[1].role,'user');assert.equal(tokenCalls,0);
 mode='invalid-plan';assert.equal((await api.chat({agent:true,prompt:'Çalış',model:local.name},1)).error,'LOCAL_INVALID_PLAN');
 mode='wait';let startedPromise=new Promise(resolve=>started=resolve);const job=api.chat({prompt:'wait',model:local.name},7);await startedPromise;assert.equal((await api.chat({prompt:'a',model:local.name},9)).error,'LOCAL_BUSY');api.cancel(9);assert.equal(typeof pending,'function');api.cancel(7);assert.equal((await job).error,'LOCAL_CANCELLED');
 mode='ignores-abort';startedPromise=new Promise(resolve=>started=resolve);const stuck=api.chat({prompt:'wait',model:local.name},7);await startedPromise;api.cancel(7);assert.equal((await stuck).error,'LOCAL_CANCELLED');assert.equal(api.isBusy(),false,'Owner cancellation settles even if a runtime ignores AbortSignal');const late=pending;mode='normal';assert.equal((await api.chat({prompt:'Retry',model:local.name},7)).ok,true);late(Response.json({done:true,message:{content:'late result'}}));
 mode='normal';assert.equal(api.startDownload(1).ok,true);for(let i=0;i<20&&(await api.status()).progress.running;i++)await new Promise(r=>setImmediate(r));assert.equal((await api.status()).progress.running,false);assert.equal((await api.status()).progress.completed,1);
 const absent=createLocalAya({fetchImpl:async()=>{throw Error('offline')}});assert.equal((await absent.status()).error,'LOCAL_RUNTIME_MISSING');
 console.log('PASS local AYA: fixed loopback, no credentials, local-only filtering, remote rejection, language, original-goal and recent-turn budget, validated structured replies and session memory, invalid-plan rejection, empty response, owner cancellation including uncooperative transport, concurrency, download progress, missing runtime. Inference mocked.');
})().catch(e=>{console.error(e);process.exit(1)});
