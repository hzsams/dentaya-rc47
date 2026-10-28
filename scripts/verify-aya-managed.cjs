'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{EventEmitter}=require('node:events');
const {zipSync}=require('fflate');
const {createManagedAya,verifiedDownload,trustedResponse,extractEngine}=require('../electron/aya/managed-runtime.cjs');
const {createLocalAya}=require('../electron/aya-local.cjs');
const {answerOwned,normalizeCad,ownedContext,calculate}=require('../electron/aya/assistant.cjs');
const {CONTEXT_MARKER}=require('../electron/aya/agent.cjs');
(async()=>{
 const busyApi=createLocalAya({managed:{isBusy:()=>true}});assert.equal((await busyApi.chat({model:'aya-local:test',prompt:'test'},1)).error,'LOCAL_BUSY');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-managed-test-'));let runtime;
 try{
 const content=Buffer.from('verified local payload'),sha256=crypto.createHash('sha256').update(content).digest('hex'),spec={url:'https://github.com/dentaya/test',bytes:content.length,sha256},dest=path.join(dir,'download');
 await fs.writeFile(dest+'.part',content.subarray(0,8));let request;
 await verifiedDownload(spec,dest,{fetchImpl:async(url,options)=>{request=options;return new Response(content.subarray(8),{status:206,headers:{'content-range':`bytes 8-${content.length-1}/${content.length}`}});}});
 assert.equal(request.headers.Range,'bytes=8-');assert.equal((await fs.readFile(dest)).toString(),content.toString());
 // Even a fully cached file remains a cancellable operation; cancellation must
 // not turn into a successful installation after asynchronous hash verification.
 const cachedAbort=new AbortController();cachedAbort.abort();let cachedFetches=0;
 await assert.rejects(verifiedDownload(spec,dest,{signal:cachedAbort.signal,fetchImpl:async()=>{cachedFetches++;throw Error('Cached verification must not fetch');}}),error=>error.name==='AbortError');assert.equal(cachedFetches,0);assert.deepEqual(await fs.readFile(dest),content);
 const verificationAbort=new AbortController(),readStream=require('node:fs').createReadStream;
 try{
  require('node:fs').createReadStream=(...args)=>{const stream=readStream(...args);if(args[0]===dest)stream.once('end',()=>verificationAbort.abort());return stream;};
  await assert.rejects(verifiedDownload(spec,dest,{signal:verificationAbort.signal}),error=>error.name==='AbortError');
 }finally{require('node:fs').createReadStream=readStream;}
 assert.deepEqual(await fs.readFile(dest),content,'Cancelled checksum verification leaves the existing verified file intact');
 // Cancellation keeps only a partial payload, which still needs the full checksum on resume.
 await fs.rm(dest);const downloadAbort=new AbortController();
 await assert.rejects(verifiedDownload(spec,dest,{signal:downloadAbort.signal,onProgress:()=>downloadAbort.abort(),fetchImpl:async()=>new Response(new ReadableStream({start(controller){controller.enqueue(content.subarray(0,8));}}))}),/abort/i);
 assert.equal((await fs.stat(dest+'.part')).size,8);await assert.rejects(fs.stat(dest));
 await verifiedDownload(spec,dest,{fetchImpl:async(_url,options)=>{assert.equal(options.headers.Range,'bytes=8-');return new Response(content.subarray(8),{status:206,headers:{'content-range':`bytes 8-${content.length-1}/${content.length}`}});}});
 assert.deepEqual(await fs.readFile(dest),content);
 await fs.rm(dest);await assert.rejects(verifiedDownload({...spec,sha256:'a'.repeat(64)},dest,{fetchImpl:async()=>new Response(content)}),/CHECKSUM/);await assert.rejects(fs.stat(dest+'.part'));
 // An idle network transfer must settle, retain a resumable verified prefix,
 // and leave explicit user cancellation distinct from a stalled connection.
 for(const phase of ['headers','body']){
  const idleDest=path.join(dir,'idle-'+phase),userAbort=new AbortController();let watchdog,transfer;
  try{
   transfer=verifiedDownload(spec,idleDest,{signal:userAbort.signal,idleTimeoutMs:100,fetchImpl:async(_url,{signal})=>{
    if(phase==='headers')return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
    return new Response(new ReadableStream({start(controller){controller.enqueue(content.subarray(0,8));signal.addEventListener('abort',()=>controller.error(signal.reason),{once:true});}}));
   }});
   const result=await Promise.race([transfer.then(()=> 'READY',error=>error.message),new Promise(resolve=>{watchdog=setTimeout(()=>resolve('TEST_WATCHDOG'),1000);})]);
   assert.equal(result,'AYA_DOWNLOAD_TIMEOUT','An idle '+phase+' transfer must fail with a safe retryable timeout');
  }finally{clearTimeout(watchdog);userAbort.abort();await transfer?.catch(()=>{});}
  if(phase==='body'){
   assert.equal((await fs.stat(idleDest+'.part')).size,8,'Timed-out transfer retains only the received prefix');
   await verifiedDownload(spec,idleDest,{fetchImpl:async(_url,options)=>{assert.equal(options.headers.Range,'bytes=8-');return new Response(content.subarray(8),{status:206,headers:{'content-range':`bytes 8-${content.length-1}/${content.length}`}});}});
   assert.deepEqual(await fs.readFile(idleDest),content,'Retry verifies the full hash after resuming the timed-out transfer');
  }
 }
 let progressiveBytes=0;
 await verifiedDownload(spec,path.join(dir,'progressing'),{idleTimeoutMs:120,fetchImpl:async()=>new Response(new ReadableStream({async pull(controller){await new Promise(resolve=>setTimeout(resolve,30));const end=Math.min(content.length,progressiveBytes+5);controller.enqueue(content.subarray(progressiveBytes,end));progressiveBytes=end;if(end===content.length)controller.close();}}))});
 assert.equal(progressiveBytes,content.length,'Regular progress resets inactivity; total transfer time may exceed the idle deadline');
 const manualAbort=new AbortController(),manualTransfer=verifiedDownload(spec,path.join(dir,'manual-abort'),{signal:manualAbort.signal,idleTimeoutMs:100,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});setImmediate(()=>manualAbort.abort());})});
 await assert.rejects(manualTransfer,error=>error.name==='AbortError','User cancellation retains its cancellation result instead of becoming a network timeout');
 let calls=0;await assert.rejects(trustedResponse(spec.url,{},async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});}),/DOWNLOAD_HOST/);assert.equal(calls,1);
 const archive=path.join(dir,'engine.zip');await fs.writeFile(archive,zipSync({'bin/llama-server.exe':new Uint8Array([77,90]),'bin/ggml.dll':new Uint8Array([1,2]),'bin/unused.exe':new Uint8Array([4])}));await extractEngine(archive,path.join(dir,'engine'));
 assert.deepEqual((await fs.readdir(path.join(dir,'engine'))).sort(),['ggml.dll','llama-server.exe']);
 await fs.writeFile(archive,zipSync({'../llama-server.exe':new Uint8Array([1])}));await assert.rejects(extractEngine(archive,path.join(dir,'evil')),/ARCHIVE/);
 // A second app window cannot claim that it cancelled another window's
 // installation. The real owner can still stop the same pending transfer.
 let downloading,transferSignal;
 const transferStarted=new Promise(resolve=>{downloading=resolve;});
 const ownedInstall=createManagedAya({directory:path.join(dir,'owned-install'),platform:'win32',fetchImpl:async(_url,options)=>new Promise((_resolve,reject)=>{
  transferSignal=options.signal;options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});downloading();
 })});
 try{
  assert.equal((await ownedInstall.installAll(71)).ok,true);await transferStarted;
  assert.deepEqual(ownedInstall.cancelInstall(72),{ok:false,error:'LOCAL_BUSY'},'A foreign window receives an honest busy response, never a false cancellation acknowledgement');
  assert.equal(transferSignal.aborted,false);assert.equal((await ownedInstall.status()).progress.running,true);
  assert.deepEqual(ownedInstall.cancelInstall(71),{ok:true});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(transferSignal.aborted,true);assert.equal(ownedInstall.isBusy(),false);assert.equal((await ownedInstall.status()).progress.status,'cancelled');
  assert.deepEqual(ownedInstall.cancelInstall(71),{ok:true},'Stopping an already settled installation remains idempotent');
 }finally{ownedInstall.dispose();await new Promise(resolve=>setImmediate(resolve));}
 const gguf=Buffer.alloc(2048);gguf.write('GGUF');gguf.writeUInt32LE(3,4);const modelFile=path.join(dir,'test.gguf');await fs.writeFile(modelFile,gguf);
 let spawned=0,killed=0,payload,templatePayload,allRequests=[],chunks=0,mode='normal',bootFailure=null;
 const plan={answer:'Önce güncel raporu alalım.',goal:'46 kron kontrolü',decisions:['Kole korunacak'],openQuestions:[],actions:[]};
 runtime=createManagedAya({directory:dir,engineBinary:path.join(dir,'engine/llama-server.exe'),spawnImpl:(binary,args,opts)=>{spawned++;assert.equal(opts.shell,false);assert.equal(args[args.indexOf('--host')+1],'127.0.0.1');assert.ok(args.includes('--no-webui'));assert.ok(args.includes('--no-context-shift'));assert.ok(args.includes('--api-key'));if(bootFailure?.sync)throw Object.assign(Error('PRIVATE spawn detail'),{code:bootFailure.spawnCode});const p=new EventEmitter();p.stderr=new EventEmitter();p.kill=()=>{killed++;p.emit('exit',0);};if(bootFailure)setImmediate(()=>{p.stderr.emit('data',Buffer.from((bootFailure.stderr||'')+'\nPRIVATE C:\\patient\\model.gguf Bearer '+args[args.indexOf('--api-key')+1]));if(bootFailure.spawnCode)p.emit('error',Object.assign(Error('PRIVATE spawn detail'),{code:bootFailure.spawnCode}));else p.emit('exit',1);});return p;},fetchImpl:async(url,options)=>{
  const u=new URL(url);assert.equal(u.hostname,'127.0.0.1');assert.match(options.headers.Authorization,/^Bearer [a-f0-9]{64}$/);allRequests.push(u.pathname);
  if(u.pathname==='/v1/models'){if(bootFailure?.readyAfterExit)return new Promise(resolve=>setImmediate(()=>resolve(Response.json({data:[{id:'aya-local'}]}))));if(bootFailure)throw Error('Not ready');return Response.json({data:[{id:'aya-local'}]});}
  if(u.pathname==='/apply-template'){templatePayload=JSON.parse(options.body);return Response.json({prompt:templatePayload.messages.map(m=>m.content).join('\n')});}
  if(u.pathname==='/tokenize'){const request=JSON.parse(options.body);assert.equal(request.add_special,true);assert.equal(request.parse_special,true);const context=JSON.parse(templatePayload.messages[1].content.slice(CONTEXT_MARKER.length));return Response.json({tokens:Array.from({length:mode==='trim-documents'&&context.documents.length?9000:Math.ceil(request.content.length/2)},()=>1)});}
  payload=JSON.parse(options.body);
  if(mode==='structured'||mode==='truncated')return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify(plan)}}]})+'\n\ndata: '+JSON.stringify({choices:[{finish_reason:mode==='truncated'?'length':'stop'}],usage:{completion_tokens:77}})+'\n\ndata: [DONE]\n\n');
  if(mode==='unconfirmed-plan')return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify(plan)}}]})+'\n\ndata: [DONE]\n\n');
  if(mode==='incomplete')return new Response('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n');
  return new Response('data: {"choices":[{"delta":{"content":"Mer"}}]}\n\ndata: {"choices":[{"delta":{"content":"haba"}}]}\n\ndata: {"choices":[{"finish_reason":"stop"}],"usage":{"completion_tokens":11}}\n\ndata: [DONE]\n\n');
 }});
 assert.equal((await runtime.importModel(modelFile)).ok,true);const s=await runtime.status();assert.equal(s.models.length,1);const api=createLocalAya({managed:runtime,fetchImpl:async url=>{assert.equal(url,'http://127.0.0.1:11434/api/tags','Only read-only Ollama discovery is permitted; managed inference cannot fall through');throw Error('Ollama is not running in this fixture');}});
 assert.equal((await api.status()).models[0].name,s.models[0].name);
 const result=await api.chat({model:s.models[0].name,locale:'tr',options:{creativity:0},prompt:'Kurye saatimiz kaç?',knowledge:[{id:'kurye',title:'Kurye',content:'Kurye saatimiz 16:40.',kind:'memory'}],history:Array.from({length:8},()=>({role:'user',content:'z'.repeat(2000)}))},7,s=>s,()=>chunks++);
 assert.equal(result.ok,true,result.error);assert.equal(result.output,'Merhaba');assert.equal(payload.temperature,.7,'Qwen3 non-thinking must not use greedy decoding');assert.equal(payload.top_p,.8);assert.equal(payload.top_k,20);assert.equal(payload.min_p,0);assert.ok(chunks===2);assert.equal(result.metrics.tokens,11,'Reported tokens come from engine usage, not SSE chunk count');assert.equal(spawned,1);assert.ok(payload.messages.length<10,'Actual tokenizer removes history that exceeds the context window');assert.match(payload.messages[2].content,/^z/,'First task survives actual-token trimming');assert.match(payload.messages[1].content,/16:40/);assert.ok(result.references.some(r=>r.id==='knowledge-kurye'));
 mode='trim-documents';const trimmed=await api.chat({model:s.models[0].name,prompt:'Kurye saatimiz kaç?',knowledge:[{id:'kurye',title:'Kurye',content:'Kurye saatimiz 16:40.',kind:'memory'}]},7);
 assert.equal(trimmed.ok,true);assert.equal(JSON.parse(payload.messages[1].content.slice(CONTEXT_MARKER.length)).documents.length,0);assert.ok(!trimmed.references.some(r=>r.id==='appointments'),'A source removed by token budgeting is absent from answer references');assert.ok(trimmed.references.some(r=>r.id==='knowledge-kurye'),'Retained personal evidence keeps its source');
 mode='structured';const structured=await api.chat({agent:true,model:s.models[0].name,options:{creativity:0},prompt:'Yeni ifadelerle kron kontrol hedefini sürdür',workingMemory:plan},7,s=>s,()=>chunks++);
 assert.equal(structured.ok,true);assert.equal(structured.output,plan.answer);assert.equal(payload.temperature,.7,'Structured generation also avoids greedy Qwen3 decoding');assert.equal(structured.metrics.tokens,77);assert.equal(chunks,2,'Structured JSON is withheld from token UI until validated');assert.equal(payload.response_format.type,'json_object');assert.equal(payload.response_format.schema.properties.actions.maxItems,0);assert.deepEqual(payload.stream_options,{include_usage:true});assert.match(payload.messages[1].content,/Kole korunacak/);
 assert.deepEqual(templatePayload.response_format,payload.response_format,'The counted template includes the same schema as inference');assert.deepEqual(templatePayload.chat_template_kwargs,payload.chat_template_kwargs);
 mode='truncated';assert.equal((await api.chat({agent:true,model:s.models[0].name,prompt:'Kontrol'},7)).error,'LOCAL_INVALID_PLAN','Length-limited structured replies never become completed plans');
 mode='unconfirmed-plan';assert.equal((await api.chat({agent:true,model:s.models[0].name,prompt:'Kontrol'},7)).error,'LOCAL_INVALID_PLAN','A DONE marker without a normal model stop cannot confirm a plan');
 mode='incomplete';assert.equal((await api.chat({model:s.models[0].name,prompt:'Kontrol'},7)).error,'LOCAL_EMPTY_RESPONSE');
 runtime.stop();assert.equal(killed,1);assert.equal((await runtime.status()).running,false);
 // Failed native startup reports a bounded, fixed diagnosis and remains retryable.
 // These process/transport fixtures are not native model inference.
 for(const failure of [
  {stderr:'ggml: failed to allocate buffer: out of memory',error:'AYA_ENGINE_MEMORY'},
  {stderr:'llama_model_load: error loading model: invalid magic',error:'AYA_ENGINE_MODEL_LOAD'},
  {stderr:'invalid magic',readyAfterExit:true,error:'AYA_ENGINE_MODEL_LOAD'},
  {stderr:'error while loading shared libraries: libggml.so: cannot open shared object file',error:'AYA_ENGINE_LIBRARY'},
  {stderr:'Permission denied',error:'AYA_ENGINE_PERMISSION'},
  {stderr:'server: failed to bind: address already in use',error:'AYA_ENGINE_PORT'},
  {stderr:'unclassified native failure',error:'AYA_ENGINE_START_FAILED'},
  {stderr:'out of memory'+'x'.repeat(9000),error:'AYA_ENGINE_START_FAILED'},
  {spawnCode:'ENOENT',error:'AYA_ENGINE_LIBRARY'},
  {spawnCode:'EACCES',sync:true,error:'AYA_ENGINE_PERMISSION'},
 ]){
  bootFailure=failure;const failed=await api.chat({model:s.models[0].name,prompt:'Kontrol'},7);
  assert.equal(failed.error,failure.error);assert.equal((await runtime.status()).error,failure.error);assert.equal((await runtime.status()).running,false);assert.equal(runtime.isBusy(),false);
  assert.doesNotMatch(JSON.stringify({failed,status:await runtime.status()}),/PRIVATE|patient|Bearer|native detail/,'Native paths, process keys and raw output never leave runtime diagnostics');
 }
 bootFailure=null;mode='normal';assert.equal((await api.chat({model:s.models[0].name,prompt:'Tekrar dene'},7)).ok,true);assert.equal((await runtime.status()).error,'','Successful retry clears the prior startup diagnosis');runtime.stop();
 // Cancelling before or during asynchronous startup cannot resurrect the native
 // child after Stop, window cancellation or application shutdown.
 const managedInput={model:s.models[0].name,messages:[],options:{maxTokens:64,creativity:0}},spawnCount=spawned;
 const alreadyAborted=new AbortController();alreadyAborted.abort();
 await assert.rejects(runtime.chat({...managedInput,signal:alreadyAborted.signal}),error=>error.name==='AbortError');assert.equal(spawned,spawnCount,'An already cancelled request never spawns the engine');
 const pendingModelRead=runtime.chat(managedInput);runtime.stop();
 await assert.rejects(pendingModelRead,/LOCAL_CANCELLED/);assert.equal(spawned,spawnCount,'Stop while model metadata is loading prevents a later native child');assert.equal(runtime.isBusy(),false);assert.equal((await runtime.status()).error,'','Cancellation is not a startup failure');
 const net=require('node:net'),createServer=net.createServer;let releasePort,portWaiting;
 const portRequested=new Promise(resolve=>{portWaiting=resolve;});
 try{
  net.createServer=()=>({once(){return this;},listen(_port,_host,callback){releasePort=callback;portWaiting();},address:()=>({port:34567}),close(callback){callback();}});
  const pendingPort=runtime.chat(managedInput);await portRequested;runtime.stop();releasePort();
  await assert.rejects(pendingPort,/LOCAL_CANCELLED/);assert.equal(spawned,spawnCount,'Stop during loopback port allocation prevents a later native child');
 }finally{net.createServer=createServer;}
 assert.equal((await api.chat({model:s.models[0].name,prompt:'Stop sonrasında yeniden başla'},7)).ok,true,'Explicit Stop still permits a later fresh request');runtime.stop();
 let disposedSpawns=0;const disposedRuntime=createManagedAya({directory:dir,engineBinary:path.join(dir,'engine/llama-server.exe'),spawnImpl:()=>{disposedSpawns++;throw Error('A disposed runtime must not spawn');}});
 const pendingShutdown=disposedRuntime.chat(managedInput);disposedRuntime.dispose();
 await assert.rejects(pendingShutdown,/LOCAL_CANCELLED/);await assert.rejects(disposedRuntime.chat(managedInput),/LOCAL_CANCELLED/);assert.equal(disposedSpawns,0);assert.equal((await disposedRuntime.status()).running,false);assert.equal((await disposedRuntime.installAll(7)).error,'LOCAL_CANCELLED');assert.equal((await disposedRuntime.importModel(modelFile)).error,'LOCAL_CANCELLED');
 assert.equal((await runtime.importModel(path.join(dir,'missing.gguf'))).ok,false);
 assert.equal(answerOwned('hesapla (12,5 + 2,5) * 4').output,'hesapla (12,5 + 2,5) * 4 = 60'.replace('hesapla ',''));
 assert.equal(calculate('1/0'),null,'Invalid arithmetic never produces a numeric result');
 const invalidMath=answerOwned('1/0');assert.equal(invalidMath.engine,'core');assert.match(invalidMath.output,/sıfıra bölme/);assert.doesNotMatch(invalidMath.output,/Infinity|NaN|1\/0\s*=/,'The conversational error must not present an invalid result');
 assert.match(answerOwned('Temel model sıfırdan eğitildi mi?').output,/sıfırdan eğitilmedi/);
 const cad=normalizeCad({unit:'46',upperReady:true,lowerReady:true,openingMm:99,positions:[1],patientName:'PRIVATE'});assert.equal(cad.openingMm,12);assert.ok(!JSON.stringify(cad).includes('PRIVATE'));assert.ok(!('positions' in cad));
 const note={id:'test',kind:'document',title:'Dökümhane',content:'Başlangıç bilgisi.\n'.repeat(300)+'Kalibrasyon kodu Z8T4.'};assert.match(ownedContext({prompt:'Kalibrasyon kodu',knowledge:[note]}).personalKnowledge[0].content,/Z8T4/);assert.equal(ownedContext({prompt:'Kalibrasyon kodu',knowledge:[note],useMemory:false}).references.length,0);
 console.log(JSON.stringify({pass:true,checksumAndResume:true,cachedVerificationCancellation:true,downloadInactivity:{headers:true,body:true,resumablePrefix:true,progressResetsDeadline:true,explicitCancelDistinct:true},installCancellationOwnership:true,redirectRejection:true,archiveTraversalRejection:true,ggufImport:true,tokenBudget:true,loopbackStreaming:true,explicitMemory:true,cadMetadataWhitelist:true,startupDiagnosis:{bounded:true,rawDetailsExcluded:true,retry:true,lateHandshakeRejected:true,cases:10},startupCancellation:{preAborted:true,modelRead:true,portAllocation:true,stopRetry:true,disposeFinal:true},foundationTrainingClaim:false,nativeInference:'mocked in this check; separate native log'},null,2));
 }finally{runtime?.dispose();await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
