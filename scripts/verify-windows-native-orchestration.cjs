'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {runWindowsAcceptance,checkNativeReport}=require('./run-windows-aya-native.cjs');
const {MODEL}=require('../electron/aya/managed-runtime.cjs');
const ready={installed:true,error:'',models:[{name:MODEL.id}],progress:{running:false,status:'ready',completed:MODEL.bytes,total:MODEL.bytes}};
const valid=()=>({contractPass:true,nativeInference:true,mock:false,model:{verified:true,bytes:MODEL.bytes,sha256:MODEL.sha256},semanticReviewRequired:true,caseCounts:{attempted:9,succeeded:9,conversation:{succeeded:5,streamedUpdates:12},memory:{succeeded:2},cad:{succeeded:2}}});
(async()=>{
 const output=await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-native-orchestration-test-'));
 try{
  let installs=0,stops=0,cancels=0,calls=0,verified=0,clock=0,mode='ready';
  const deps={platform:'win32',now:()=>clock,sleep:async ms=>{clock+=ms;},makeRuntime:()=>({installAll:async()=>{installs++;return {ok:true};},status:async()=>mode==='busy'?{...ready,progress:{running:true,status:'model',completed:1,total:MODEL.bytes}}:mode==='failed'?{...ready,error:'PRIVATE C:/patients/model.gguf',progress:{running:false,status:'failed',completed:1,total:MODEL.bytes}}:ready,cancelInstall:()=>{cancels++;},dispose:()=>{stops++;}}),verifyAssets:async()=>{verified++;if(mode==='integrity')throw Error('MODEL_INTEGRITY_FAILED');return {engine:'fixture-engine.exe',model:'fixture-model.gguf',engineBinarySHA256:'f'.repeat(64)};},runNative:async input=>{calls++;assert.equal(input.timeoutMs,20000);await fs.writeFile(input.report,JSON.stringify(mode==='partial'?{...valid(),caseCounts:{...valid().caseCounts,succeeded:8}}:valid()));return {exitCode:mode==='exit-failed'?1:0,output:'Synthetic native transcript only.'};}};
  assert.equal(checkNativeReport(valid(),0),true);
  for(const change of [{mock:true},{semanticReviewRequired:false},{model:{...valid().model,verified:false}},{model:{...valid().model,sha256:'0'.repeat(64)}},{caseCounts:{...valid().caseCounts,succeeded:8}}])assert.equal(checkNativeReport({...valid(),...change},0),false);
  assert.equal(checkNativeReport(valid(),1),false);
  let result=await runWindowsAcceptance({output,timeoutMs:20000},deps);
  assert.equal(result.status,'passed');assert.equal(result.provenance,'test-fixture');assert.equal(result.nativeInferenceObserved,false,'Injected transports never attest native inference');assert.equal(result.casesSucceeded,9);assert.equal(stops,1);assert.equal(cancels,1);assert.equal(installs,1);assert.equal(verified,1);
  mode='partial';result=await runWindowsAcceptance({output,timeoutMs:20000},deps);assert.equal(result.status,'failed');
  mode='exit-failed';result=await runWindowsAcceptance({output,timeoutMs:20000},deps);assert.equal(result.status,'failed','A success-looking JSON cannot override failed exit');
  mode='integrity';const before=calls;result=await runWindowsAcceptance({output,timeoutMs:20000},deps);assert.equal(result.error,'MODEL_INTEGRITY_FAILED');assert.equal(calls,before);assert.equal(JSON.parse(await fs.readFile(path.join(output,'native-inference-report.json'),'utf8')).nativeInference,false);assert.doesNotMatch(await fs.readFile(path.join(output,'native-acceptance.txt'),'utf8'),/Synthetic native transcript/,'Stale successful transcript is removed on a failed new run');
  mode='failed';result=await runWindowsAcceptance({output,timeoutMs:20000},deps);assert.doesNotMatch(JSON.stringify(result),/PRIVATE|patients|model\.gguf/);assert.equal(calls,before);
  mode='busy';clock=0;result=await runWindowsAcceptance({output,timeoutMs:1000},deps);assert.equal(result.error,'NATIVE_ACCEPTANCE_TIMEOUT');assert.equal(stops,6,'All acquired runtimes are disposed');
  const beforeInstall=installs;result=await runWindowsAcceptance({output,timeoutMs:1000},{...deps,platform:'linux'});assert.equal(result.status,'blocked');assert.equal(result.error,'WINDOWS_REQUIRED');assert.equal(installs,beforeInstall);
  for(const file of ['windows-native-result.json','native-inference-report.json','native-acceptance.txt'])assert.ok((await fs.stat(path.join(output,file))).size>0);
  await assert.rejects(()=>runWindowsAcceptance({output,timeoutMs:0},deps),/INVALID_ACCEPTANCE_TIMEOUT/);
  console.log('PASS: pinned asset gate,9case+exitstatus contract, stale evidence removal,3fresh reports on installation failure, bounded waiting, cleanup, private error exclusion and mock provenance. No native inference.');
 }finally{await fs.rm(output,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
