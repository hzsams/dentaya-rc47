'use strict';
const assert=require('node:assert/strict');
const {createAyaAcceptanceRunner,AYA_ACCEPTANCE_STEP_COUNT}=require('../electron/aya/acceptance.cjs');
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let calls=[],mode='valid',code='',memory;
 const transport=async input=>{
  calls.push(structuredClone(input));assert.deepEqual(input.history,[]);assert.deepEqual(input.knowledge,[]);assert.equal(input.useMemory,false);assert.equal(input.options.useKnowledge,false);assert.equal(input.options.useNote,false);assert.equal(input.options.note,'');
  assert.equal(typeof input.requestId,'string');assert.ok(input.requestId.length<120);
  if(input.prompt.includes('Deneme işimizin adı')){code=input.prompt.match(/AYA-[a-f0-9]{8}/i)[0];memory={goal:code+' 46 kontrolü',decisions:['Dış kontur korunacak','Teslim salı'],openQuestions:[]};}
  if(mode==='private-error')throw Error('PRIVATE C:/patients/scan.stl https://private.invalid');
  if(input.task==='memory')return {ok:true,output:'Memory updated',workingMemory:input.prompt.includes('Çalışma hedefini')?{...memory,goal:mode==='bad-memory'?memory.goal:''}:memory,proposals:[]};
  if(input.cadContext){const context=input.cadContext;return {ok:true,output:context.saveFailed?'Kayıt başarısız; antagonist yok.':'Antagonist yok; kesin kapanış değerlendirmesi yapılamaz.',proposals:[{tool:'inspect',reason:'Güncel kontrol',scope:mode==='bad-scope'?'wrong':context.scope,snapshot:context.snapshot}]};}
  if(input.requestId.endsWith(':identity'))return {ok:true,output:mode==='empty'?'  ':'Adım AYA, çalışma asistanıyım.'};
  if(input.requestId.endsWith(':novel-story'))return {ok:true,output:mode==='off-topic'?'Diş hekimliği hakkında konuşacağım.':'Yağmur sesimi uyandırdı. Rüzgâr beni salladı. Damlalarla şarkı söylüyorum.'};
  return {ok:true,output:code+' 46 dış kontur korunacak.',metrics:{milliseconds:2,tokens:12}};
 };
 const runner=createAyaAcceptanceRunner({chat:transport});
 const progress=[];let report=await runner.run({model:'fixture-local',locale:'tr',provenance:'mock',onProgress:event=>progress.push(event)});
 assert.equal(report.status,'completed');assert.equal(report.steps.length,AYA_ACCEPTANCE_STEP_COUNT);assert.equal(calls.length,9);assert.equal(report.nativeInferenceVerified,false);assert.equal(report.semanticReviewRequired,true);assert.equal(report.provenance,'mock');assert.ok(report.steps.flatMap(s=>s.checks).every(c=>c.pass));assert.equal(progress.length,18);assert.deepEqual(progress.map(p=>p.step),[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9]);assert.equal(runner.isRunning(),false);
 assert.equal(calls.filter(c=>c.agent===false).length,5);assert.equal(calls.filter(c=>c.task==='memory').length,2);assert.equal(calls.filter(c=>c.cadContext).length,2);
 assert.equal(calls[4].history.length,0,'Recall is genuinely memory-only');assert.equal(calls[4].workingMemory.goal,memory.goal);
 assert.ok(calls[7].cadContext.scope.includes(report.runId));assert.equal(calls[8].cadContext.saveFailed,true);assert.equal(calls[8].cadContext.recentActions[1].ok,false);assert.ok(!Object.hasOwn(calls[7],'onRun'),'The runner has no CAD command dispatcher');
 const originalCode=code;calls=[];await runner.run({model:'fixture-local'});assert.notEqual(code,originalCode,'Synthetic novel facts differ between runs');
 for(const failure of ['off-topic','bad-memory','bad-scope']){mode=failure;calls=[];report=await runner.run({model:'fixture-local',locale:'tr'});assert.equal(report.status,'completed');assert.equal(calls.length,9,'A failed limited signal must not hide later CAD evidence');assert.ok(report.steps.flatMap(s=>s.checks).some(c=>!c.pass));assert.equal(report.semanticReviewRequired,true);assert.equal(report.nativeInferenceVerified,false);}
 mode='private-error';report=await runner.run({model:'fixture-local'});assert.equal(report.status,'failed');assert.equal(report.error,'LOCAL_ACCEPTANCE_FAILED');assert.doesNotMatch(JSON.stringify(report),/PRIVATE|patients|private\.invalid/);
 mode='empty';report=await runner.run({model:'fixture-local'});assert.equal(report.error,'LOCAL_EMPTY_RESPONSE');assert.equal(report.status,'failed');
 const beforeMissing=calls.length;report=await runner.run({model:''});assert.equal(report.error,'MODEL_MISSING');assert.equal(calls.length,beforeMissing);
 let cancellations=0;const neverStarted=createAyaAcceptanceRunner({chat:()=>{throw Error('Must not run');},cancel:()=>{cancellations++;}}),aborted=new AbortController();aborted.abort();report=await neverStarted.run({model:'fixture-local',signal:aborted.signal});assert.equal(report.status,'cancelled');await neverStarted.whenIdle();assert.equal(cancellations,0,'A pre-cancelled test cannot cancel somebody else’s native work');
 for(const acknowledgeFirst of [true,false]){
  const reply=deferred(),ack=deferred();let nativeCalls=0;const events=[];
  const delayed=createAyaAcceptanceRunner({chat:()=>{nativeCalls++;return reply.promise;},cancel:()=>{cancellations++;return ack.promise;}});
  const pending=delayed.run({model:'fixture-local',onProgress:e=>events.push(e)});await tick();assert.equal(nativeCalls,1);delayed.cancel();delayed.cancel();
  const cancelled=await pending,snapshot=JSON.stringify(cancelled);assert.equal(cancelled.status,'cancelled');assert.equal(delayed.isRunning(),true,'Cancellation retains engine ownership until both old operations settle');assert.equal((await delayed.run({model:'fixture-local'})).error,'LOCAL_BUSY');
  if(acknowledgeFirst)ack.resolve({ok:true});else reply.resolve({ok:true,output:'Late text must not become a reply'});
  await tick();assert.equal(delayed.isRunning(),true,'One acknowledgement is insufficient to release engine ownership');
  if(acknowledgeFirst)reply.resolve({ok:true,output:'Late text must not become a reply'});else ack.resolve({ok:true});
  await delayed.whenIdle();assert.equal(delayed.isRunning(),false);assert.equal(JSON.stringify(cancelled),snapshot);assert.equal(events.filter(e=>e.status==='finished').length,0,'Late output cannot publish a completed step');assert.equal(nativeCalls,1);
 }
 assert.equal(cancellations,2,'Exactly one native cancellation per running test');
 console.log('PASS:9isolated local acceptance calls, fresh novel facts, explicit limited signals notsemanticapproval, no realdata/CADdispatcher, static errors, per-step progress, zero-call precancel and cancellation ownership until both native reply+IPC settle. Mock transport; nativeInferenceVerified:false.');
})().catch(error=>{console.error(error);process.exitCode=1;});
