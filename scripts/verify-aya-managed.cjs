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
 // Cancellation keeps only a partial payload, which still needs the full checksum on resume.
 await fs.rm(dest);const downloadAbort=new AbortController();
 await assert.rejects(verifiedDownload(spec,dest,{signal:downloadAbort.signal,onProgress:()=>downloadAbort.abort(),fetchImpl:async()=>new Response(new ReadableStream({start(controller){controller.enqueue(content.subarray(0,8));}}))}),/abort/i);
 assert.equal((await fs.stat(dest+'.part')).size,8);await assert.rejects(fs.stat(dest));
 await verifiedDownload(spec,dest,{fetchImpl:async(_url,options)=>{assert.equal(options.headers.Range,'bytes=8-');return new Response(content.subarray(8),{status:206,headers:{'content-range':`bytes 8-${content.length-1}/${content.length}`}});}});
 assert.deepEqual(await fs.readFile(dest),content);
 await fs.rm(dest);await assert.rejects(verifiedDownload({...spec,sha256:'a'.repeat(64)},dest,{fetchImpl:async()=>new Response(content)}),/CHECKSUM/);await assert.rejects(fs.stat(dest+'.part'));
 let calls=0;await assert.rejects(trustedResponse(spec.url,{},async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});}),/DOWNLOAD_HOST/);assert.equal(calls,1);
 const archive=path.join(dir,'engine.zip');await fs.writeFile(archive,zipSync({'bin/llama-server.exe':new Uint8Array([77,90]),'bin/ggml.dll':new Uint8Array([1,2]),'bin/unused.exe':new Uint8Array([4])}));await extractEngine(archive,path.join(dir,'engine'));
 assert.deepEqual((await fs.readdir(path.join(dir,'engine'))).sort(),['ggml.dll','llama-server.exe']);
 await fs.writeFile(archive,zipSync({'../llama-server.exe':new Uint8Array([1])}));await assert.rejects(extractEngine(archive,path.join(dir,'evil')),/ARCHIVE/);
 const gguf=Buffer.alloc(2048);gguf.write('GGUF');gguf.writeUInt32LE(3,4);const modelFile=path.join(dir,'test.gguf');await fs.writeFile(modelFile,gguf);
 let spawned=0,killed=0,payload,templatePayload,allRequests=[],chunks=0,mode='normal';
 const plan={answer:'Önce güncel raporu alalım.',goal:'46 kron kontrolü',decisions:['Kole korunacak'],openQuestions:[],actions:[]};
 runtime=createManagedAya({directory:dir,engineBinary:path.join(dir,'engine/llama-server.exe'),spawnImpl:(binary,args,opts)=>{spawned++;assert.equal(opts.shell,false);assert.equal(args[args.indexOf('--host')+1],'127.0.0.1');assert.ok(args.includes('--no-webui'));assert.ok(args.includes('--no-context-shift'));assert.ok(args.includes('--api-key'));const p=new EventEmitter();p.stderr=new EventEmitter();p.kill=()=>{killed++;p.emit('exit',0);};return p;},fetchImpl:async(url,options)=>{
  const u=new URL(url);assert.equal(u.hostname,'127.0.0.1');assert.match(options.headers.Authorization,/^Bearer [a-f0-9]{64}$/);allRequests.push(u.pathname);
  if(u.pathname==='/v1/models')return Response.json({data:[{id:'aya-local'}]});
  if(u.pathname==='/apply-template'){templatePayload=JSON.parse(options.body);return Response.json({prompt:templatePayload.messages.map(m=>m.content).join('\n')});}
  if(u.pathname==='/tokenize'){const request=JSON.parse(options.body);assert.equal(request.add_special,true);assert.equal(request.parse_special,true);const context=JSON.parse(templatePayload.messages[1].content.slice(CONTEXT_MARKER.length));return Response.json({tokens:Array.from({length:mode==='trim-documents'&&context.documents.length?9000:Math.ceil(request.content.length/2)},()=>1)});}
  payload=JSON.parse(options.body);
  if(mode==='structured'||mode==='truncated')return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify(plan)}}]})+'\n\ndata: '+JSON.stringify({choices:[{finish_reason:mode==='truncated'?'length':'stop'}],usage:{completion_tokens:77}})+'\n\ndata: [DONE]\n\n');
  if(mode==='unconfirmed-plan')return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify(plan)}}]})+'\n\ndata: [DONE]\n\n');
  if(mode==='incomplete')return new Response('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n');
  return new Response('data: {"choices":[{"delta":{"content":"Mer"}}]}\n\ndata: {"choices":[{"delta":{"content":"haba"}}]}\n\ndata: {"choices":[{"finish_reason":"stop"}],"usage":{"completion_tokens":11}}\n\ndata: [DONE]\n\n');
 }});
 assert.equal((await runtime.importModel(modelFile)).ok,true);const s=await runtime.status();assert.equal(s.models.length,1);const api=createLocalAya({managed:runtime,fetchImpl:async()=>{throw Error('Ollama must not be used');}});
 assert.equal((await api.status()).models[0].name,s.models[0].name);
 const result=await api.chat({model:s.models[0].name,locale:'tr',prompt:'Kurye saatimiz kaç?',knowledge:[{id:'kurye',title:'Kurye',content:'Kurye saatimiz 16:40.',kind:'memory'}],history:Array.from({length:8},()=>({role:'user',content:'z'.repeat(2000)}))},7,s=>s,()=>chunks++);
 assert.equal(result.output,'Merhaba');assert.ok(chunks===2);assert.equal(result.metrics.tokens,11,'Reported tokens come from engine usage, not SSE chunk count');assert.equal(spawned,1);assert.ok(payload.messages.length<10,'Actual tokenizer removes history that exceeds the context window');assert.match(payload.messages[2].content,/^z/,'First task survives actual-token trimming');assert.match(payload.messages[1].content,/16:40/);assert.ok(result.references.some(r=>r.id==='knowledge-kurye'));
 mode='trim-documents';const trimmed=await api.chat({model:s.models[0].name,prompt:'Kurye saatimiz kaç?',knowledge:[{id:'kurye',title:'Kurye',content:'Kurye saatimiz 16:40.',kind:'memory'}]},7);
 assert.equal(trimmed.ok,true);assert.equal(JSON.parse(payload.messages[1].content.slice(CONTEXT_MARKER.length)).documents.length,0);assert.ok(!trimmed.references.some(r=>r.id==='appointments'),'A source removed by token budgeting is absent from answer references');assert.ok(trimmed.references.some(r=>r.id==='knowledge-kurye'),'Retained personal evidence keeps its source');
 mode='structured';const structured=await api.chat({agent:true,model:s.models[0].name,prompt:'Yeni ifadelerle kron kontrol hedefini sürdür',workingMemory:plan},7,s=>s,()=>chunks++);
 assert.equal(structured.ok,true);assert.equal(structured.output,plan.answer);assert.equal(structured.metrics.tokens,77);assert.equal(chunks,2,'Structured JSON is withheld from token UI until validated');assert.equal(payload.response_format.type,'json_object');assert.equal(payload.response_format.schema.properties.actions.maxItems,0);assert.deepEqual(payload.stream_options,{include_usage:true});assert.match(payload.messages[1].content,/Kole korunacak/);
 assert.deepEqual(templatePayload.response_format,payload.response_format,'The counted template includes the same schema as inference');assert.deepEqual(templatePayload.chat_template_kwargs,payload.chat_template_kwargs);
 mode='truncated';assert.equal((await api.chat({agent:true,model:s.models[0].name,prompt:'Kontrol'},7)).error,'LOCAL_INVALID_PLAN','Length-limited structured replies never become completed plans');
 mode='unconfirmed-plan';assert.equal((await api.chat({agent:true,model:s.models[0].name,prompt:'Kontrol'},7)).error,'LOCAL_INVALID_PLAN','A DONE marker without a normal model stop cannot confirm a plan');
 mode='incomplete';assert.equal((await api.chat({model:s.models[0].name,prompt:'Kontrol'},7)).error,'LOCAL_EMPTY_RESPONSE');
 runtime.stop();assert.equal(killed,1);assert.equal((await runtime.status()).running,false);
 assert.equal((await runtime.importModel(path.join(dir,'missing.gguf'))).ok,false);
 assert.equal(answerOwned('hesapla (12,5 + 2,5) * 4').output,'hesapla (12,5 + 2,5) * 4 = 60'.replace('hesapla ',''));
 assert.equal(calculate('1/0'),null,'Invalid arithmetic never produces a numeric result');
 const invalidMath=answerOwned('1/0');assert.equal(invalidMath.engine,'core');assert.match(invalidMath.output,/sıfıra bölme/);assert.doesNotMatch(invalidMath.output,/Infinity|NaN|1\/0\s*=/,'The conversational error must not present an invalid result');
 assert.match(answerOwned('Temel model sıfırdan eğitildi mi?').output,/sıfırdan eğitilmedi/);
 const cad=normalizeCad({unit:'46',upperReady:true,lowerReady:true,openingMm:99,positions:[1],patientName:'PRIVATE'});assert.equal(cad.openingMm,12);assert.ok(!JSON.stringify(cad).includes('PRIVATE'));assert.ok(!('positions' in cad));
 const note={id:'test',kind:'document',title:'Dökümhane',content:'Başlangıç bilgisi.\n'.repeat(300)+'Kalibrasyon kodu Z8T4.'};assert.match(ownedContext({prompt:'Kalibrasyon kodu',knowledge:[note]}).personalKnowledge[0].content,/Z8T4/);assert.equal(ownedContext({prompt:'Kalibrasyon kodu',knowledge:[note],useMemory:false}).references.length,0);
 console.log(JSON.stringify({pass:true,checksumAndResume:true,redirectRejection:true,archiveTraversalRejection:true,ggufImport:true,tokenBudget:true,loopbackStreaming:true,explicitMemory:true,cadMetadataWhitelist:true,foundationTrainingClaim:false,nativeInference:'mocked in this check; separate native log'},null,2));
 }finally{runtime?.dispose();await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
