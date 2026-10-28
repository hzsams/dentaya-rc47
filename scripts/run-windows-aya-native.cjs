'use strict';
// CI-only native acceptance. Model weights never enter the repository or installer.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {parseArgs}=require('node:util');
const {createManagedAya,ENGINE,MODEL}=require('../electron/aya/managed-runtime.cjs');

const safeCode=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{0,95}$/.test(value)?value:'NATIVE_ACCEPTANCE_FAILED';
async function digest(file){const hash=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function verifyInstalledAssets(directory){
 const model=path.join(directory,'aya-local','models',MODEL.name),engine=path.join(directory,'aya-local','engine','llama-server.exe');
 if((await fs.stat(model)).size!==MODEL.bytes||await digest(model)!==MODEL.sha256)throw Error('MODEL_INTEGRITY_FAILED');
 const handle=await fs.open(engine,'r'),magic=Buffer.alloc(2);
 try{await handle.read(magic,0,2,0);}finally{await handle.close();}
 if(magic.toString('ascii')!=='MZ')throw Error('ENGINE_NOT_WINDOWS_EXECUTABLE');
 return {engine,model,engineBinarySHA256:await digest(engine),engineArchiveSHA256:ENGINE.sha256,modelSHA256:MODEL.sha256,modelBytes:MODEL.bytes};
}
function runNative({engine,model,report,timeoutMs}){
 return new Promise(resolve=>{
  let output='',timedOut=false,settled=false;
  const child=spawn(process.execPath,[path.join(__dirname,'verify-aya-native.cjs'),'--engine',engine,'--model',model,'--report',report],{cwd:path.join(__dirname,'..'),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const append=chunk=>{output=(output+String(chunk)).slice(-240000);};
  child.stdout?.on('data',append);child.stderr?.on('data',append);
  const timer=setTimeout(()=>{
   timedOut=true;
   // Kill only this checker and its own inference process tree on Windows.
   if(Number.isInteger(child.pid)&&child.pid>0){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());}
   else child.kill();
  },timeoutMs);
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve({...value,output,timedOut});};
  child.once('error',()=>finish({exitCode:1,error:'NATIVE_CHECKER_START_FAILED'}));
  child.once('close',code=>finish({exitCode:code??1,...(timedOut?{error:'NATIVE_ACCEPTANCE_TIMEOUT'}:{})}));
 });
}
function checkNativeReport(report,exitCode){
 const counts=report?.caseCounts;
 return exitCode===0&&report?.contractPass===true&&report?.nativeInference===true&&report?.mock===false&&report?.model?.verified===true&&report.model.bytes===MODEL.bytes&&report.model.sha256===MODEL.sha256&&report?.semanticReviewRequired===true&&counts?.attempted===9&&counts?.succeeded===9&&counts.conversation?.succeeded===5&&counts.memory?.succeeded===2&&counts.cad?.succeeded===2&&Number.isSafeInteger(counts.conversation.streamedUpdates)&&counts.conversation.streamedUpdates>0;
}
async function runWindowsAcceptance(input={},deps={}){
 const platform=deps.platform??process.platform,output=path.resolve(input.output||path.join('ci-artifacts','native'));
 const now=deps.now??Date.now,sleep=deps.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 const makeRuntime=deps.makeRuntime??createManagedAya,verifyAssets=deps.verifyAssets??verifyInstalledAssets,check=deps.runNative??runNative;
 const trusted=!deps.makeRuntime&&!deps.verifyAssets&&!deps.runNative;
 const started=now(),timeoutMs=input.timeoutMs??20*60*1000;
 if(!Number.isFinite(timeoutMs)||timeoutMs<1000||timeoutMs>30*60*1000)throw Error('INVALID_ACCEPTANCE_TIMEOUT');
 await fs.mkdir(output,{recursive:true});
 const nativeFile=path.join(output,'native-inference-report.json'),resultFile=path.join(output,'windows-native-result.json');
 const result={release:require('../package.json').version,platform,provenance:trusted?'controlled-windows-native':'test-fixture',status:'blocked',nativeInferenceObserved:false,semanticReviewRequired:true,semanticAcceptance:'pending-human-review',model:{bytes:MODEL.bytes,sha256:MODEL.sha256,verified:false},engine:{version:ENGINE.version,archiveSHA256:ENGINE.sha256},casesAttempted:0,casesSucceeded:0,weightsIncludedInInstaller:false,report:'native-inference-report.json'};
 let directory,runtime;
 const cacheDirectory=input.assetCache?path.resolve(input.assetCache):null;
 // Never allow an earlier successful run to survive as evidence of this one.
 await Promise.all([nativeFile,resultFile,path.join(output,'native-acceptance.txt')].map(file=>fs.rm(file,{force:true})));
 try{
  if(platform!=='win32')throw Error('WINDOWS_REQUIRED');
  directory=cacheDirectory??await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-native-ci-'));
  if(cacheDirectory)await fs.mkdir(directory,{recursive:true});
  runtime=makeRuntime({directory});
  const accepted=await runtime.installAll('windows-native-ci');
  if(!accepted.ok)throw Error(safeCode(accepted.error));
  let last='';
  while(true){
   if(now()-started>=timeoutMs)throw Error('NATIVE_ACCEPTANCE_TIMEOUT');
   const status=await runtime.status(),progress=status.progress;
   const marker=progress.status+':'+Math.floor(20*progress.completed/Math.max(1,progress.total));
   if(marker!==last){last=marker;input.onProgress?.({stage:progress.status,completed:progress.completed,total:progress.total});}
   if(!progress.running){
    if(progress.status!=='ready'||!status.installed||!status.models.some(model=>model.name===MODEL.id))throw Error(safeCode(status.error||'MODEL_INSTALL_NOT_READY'));
    break;
   }
   await sleep(500);
  }
  const assets=await verifyAssets(directory);
  result.model.verified=true;result.engine.binarySHA256=assets.engineBinarySHA256;
  const remaining=timeoutMs-(now()-started);if(remaining<1000)throw Error('NATIVE_ACCEPTANCE_TIMEOUT');
  const processResult=await check({...assets,report:nativeFile,timeoutMs:remaining});
  // The checker uses synthetic prompts only; no application/user data enters this file.
  await fs.writeFile(path.join(output,'native-acceptance.txt'),String(processResult.output||'').slice(-240000));
  let native;try{native=JSON.parse(await fs.readFile(nativeFile,'utf8'));}catch{}
  result.checkerExitCode=processResult.exitCode;
  result.casesAttempted=native?.caseCounts?.attempted??0;result.casesSucceeded=native?.caseCounts?.succeeded??0;
  result.nativeInferenceObserved=trusted&&native?.nativeInference===true;
  if(!checkNativeReport(native,processResult.exitCode))throw Error(processResult.timedOut?'NATIVE_ACCEPTANCE_TIMEOUT':processResult.error||'NATIVE_CONTRACT_FAILED');
  result.status='passed';
 }catch(error){result.error=safeCode(error?.message);result.status=['WINDOWS_REQUIRED','AYA_DOWNLOAD_FAILED','AYA_DOWNLOAD_TIMEOUT','AYA_DOWNLOAD_HOST','AYA_DOWNLOAD_REDIRECT'].includes(result.error)?'blocked':'failed';}
 finally{
  runtime?.cancelInstall('windows-native-ci');runtime?.dispose();
  if(directory&&!cacheDirectory)try{await fs.rm(directory,{recursive:true,force:true,maxRetries:4,retryDelay:500});}catch{result.cleanupError='TEMPORARY_MODEL_CLEANUP_FAILED';}
  if(cacheDirectory)result.assetCachePolicy='pinned-assets-retained-outside-source-and-installer; size and SHA-256 reverified on every restore';
  // Failed installation has a fresh explicit report as well, never a stale PASS.
  try{await fs.access(nativeFile);}catch{await fs.writeFile(nativeFile,JSON.stringify({nativeInference:false,mock:false,stage:'installation',contractPass:false,blocked:true,error:result.error,checks:[],caseCounts:{attempted:0,succeeded:0},semanticReviewRequired:true},null,2)+'\n');}
  result.milliseconds=Math.max(0,now()-started);
  await fs.writeFile(resultFile,JSON.stringify(result,null,2)+'\n');
 }
 return result;
}
module.exports={runWindowsAcceptance,checkNativeReport};
if(require.main===module){
 const {values}=parseArgs({options:{output:{type:'string'},help:{type:'boolean'}}});
 if(values.help){console.log('node scripts/run-windows-aya-native.cjs --output ci-artifacts/native\nWindows CI only: downloads the existing pinned/hash-verified engine+model into a temporary folder, runs 9 real conversation/memory/CAD fixture calls, and removes weights. Reports never claim completed semantic or clinical acceptance.');}
 else runWindowsAcceptance({output:values.output,assetCache:process.env.AYA_NATIVE_ASSET_CACHE,onProgress:p=>console.log(JSON.stringify({stage:p.stage,completed:p.completed,total:p.total}))}).then(result=>{console.log(JSON.stringify(result,null,2));if(result.status!=='passed')process.exitCode=1;}).catch(()=>{console.error('NATIVE_ACCEPTANCE_FAILED');process.exitCode=1;});
}
