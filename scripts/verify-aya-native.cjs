'use strict';
// Opt-in native inference check. Model weights and engine binaries stay outside the source package.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {parseArgs}=require('node:util');
const {createManagedAya,MODEL}=require('../electron/aya/managed-runtime.cjs');
const {CANDIDATE}=require('./aya-native-candidate.cjs');
const {createLocalAya}=require('../electron/aya-local.cjs');
const {normalizeMemory,CONTEXT_MARKER}=require('../electron/aya/agent.cjs');
// A reply can satisfy the transport contract while missing a behavioral
// expectation. Keep those signals and still exercise later synthetic cases.
async function runAcceptanceCases(turn,signals){
 function signal(id,assertion){
  try{assertion();signals.push({id,pass:true});}
  catch(error){
   if(!(error instanceof assert.AssertionError))throw error;
   signals.push({id,pass:false});
  }
 }
  const identity=await turn('natural-identity','Sana nasıl seslenmeliyim ve bu uygulamada bana ne için yardımcı oluyorsun?');
  signal('identity-mentions-aya',()=>assert.match(identity.output,/AYA/));
  const story=await turn('novel-non-dental-request','Bir rüzgâr çanının ağzından, yağmuru ilk kez duyan çocuklara üç yeni cümle kur. Konuyu diş veya yazılıma bağlama.');
  signal('story-honors-exclusions',()=>assert.doesNotMatch(story.output,/(?:^|[^\p{L}])(?:diş\p{L}*|dental|implant|CAD|yazılım\p{L}*)(?:$|[^\p{L}])/iu));
  const prompt='Bu akşamki çalışma planımız şu: önce 46 numaralı implant üstü kronu inceleyeceğiz. Kararımız, dış konturu koruyup oklüzal yüksekliği elle azaltmak. Hedefi ve kararı aklında tut; henüz işlem yapma.';
  const first=await turn('novel-natural-language',prompt);
  const remembered=await turn('separate-memory-extraction',prompt,{agent:true,task:'memory',assistantReply:first.output});
  signal('extracted-unit',()=>assert.match(JSON.stringify(remembered.workingMemory),/46/));
  signal('extracted-contour',()=>assert.match(JSON.stringify(remembered.workingMemory),/kontur|contour/i));
  const follow=await turn('working-memory-follow-up','Az önce hangi diş ve hangi biçim kararını konuşmuştuk? Sadece hatırladıklarını söyle.',{workingMemory:remembered.workingMemory,history:[]});
  signal('recalled-unit',()=>assert.match(follow.output,/46/));
  signal('recalled-contour',()=>assert.match(follow.output,/kontur|contour/i));
  const partialPrompt='Çalışma hedefini şimdilik kaldır; dış kontur hakkında anlaştığımız kararı ve varsa açık soruları aynen koru.';
  const partialReply=await turn('natural-partial-memory-correction',partialPrompt,{workingMemory:remembered.workingMemory,history:[]});
  const partial=await turn('separate-partial-memory-correction',partialPrompt,{agent:true,task:'memory',assistantReply:partialReply.output,workingMemory:remembered.workingMemory,history:[]});
  signal('only-goal-cleared',()=>assert.equal(partial.workingMemory.goal,''));
  signal('decisions-preserved',()=>assert.deepEqual(partial.workingMemory.decisions,remembered.workingMemory.decisions));
  signal('open-questions-preserved',()=>assert.deepEqual(partial.workingMemory.openQuestions,remembered.workingMemory.openQuestions));
  const cadContext={scope:'native-fixture:source-a:46',snapshot:'snap-a',dataToken:'data-a',unit:'46',restoration:'implant crown',stage:'contacts',task:'contacts',setupComplete:true,sourceReady:true,modelReady:true,placed:true,visible:true,unsaved:true,saveFailed:false,isSaving:false,upperReady:false,lowerReady:true,antagonistReady:false,marginPoints:84,openingMm:0,tool:'measure',view:'natural',undoCount:1,redoCount:0,availableTools:['inspect','save','undo','tool-measure','view-thickness'],report:null};
  const cadPrompt='Bu iş kapanış açısından güvenli mi? Duvar kalınlığının kesin değerini de söyle ve yapılabilecek ilk kontrolü öner.';
  const cad=await turn('cad-missing-evidence',cadPrompt,{agent:true,cadContext,workingMemory:remembered.workingMemory});
  const after={...cadContext,snapshot:'snap-b',saveFailed:true,localRecoveryReady:true,recentActions:[{scope:cadContext.scope,snapshot:'snap-b',dataToken:cadContext.dataToken,tool:'inspect',ok:true,result:'Mesh kapalı, tek bileşen. Antagonist bulunamadı. Kaynak uzaklığı haritası gerçek duvar kalınlığı değildir.'},{scope:cadContext.scope,snapshot:'snap-b',dataToken:cadContext.dataToken,tool:'save',ok:false,result:'Sunucu kayıt isteği başarısız. Yerel kurtarma korundu; kaydedildi veya çıkıldı sayılmaz.'}],report:{dataToken:'data-a',triangles:5000,boundaryEdges:0,nonManifoldEdges:0,components:1,watertight:true,minimumWallEstimateMm:0.65,targetWallMm:0.8,contactReference:'unavailable',wallMethod:'shell-offset-estimate',warnings:['Kabuk offset tahmini minimum 0.65 mm; üretim kalınlığı onayı değildir.']}};
  const report=await turn('cad-tool-results-and-report-limits','Kontrol ve kayıt denemesinin sonucuna göre neredeyiz? Eksik olanı ve sıradaki uygulanabilir yardımı açıkla.',{agent:true,cadContext:after,workingMemory:cad.workingMemory,history:[{role:'user',content:cadPrompt},{role:'assistant',content:cad.output}]});
  signal('failed-save-mentioned',()=>assert.match(report.output,/kaydedilmedi|kaydedilemedi|başarısız|save failed/iu));
  signal('local-recovery-mentioned',()=>assert.match(report.output,/kurtar|recovery/iu));
}
module.exports={runAcceptanceCases};

if(require.main===module){
const {values}=parseArgs({options:{engine:{type:'string'},model:{type:'string'},report:{type:'string'},candidate:{type:'boolean'},'cad-browser':{type:'boolean'},help:{type:'boolean'}}});
if(values.help){console.log('node scripts/verify-aya-native.cjs --engine /external/llama-server --model /external/pinned.gguf [--candidate] [--report /external/results.json]\nEnvironment alternatives: AYA_NATIVE_ENGINE, AYA_NATIVE_MODEL. Uses the pinned model, actual loopback inference and a temporary imported model copy; downloads nothing. --candidate selects the pinned Qwen3.5 4B model. Linux x64 server binary must match the official b9380 CPU release. Ordinary replies use free-text streaming; separate bounded memory extraction and structured CAD calls match the application architecture. CAD evidence is a synthetic fixture; no real geometry operation occurs. Contract checks and basic memory signals do not replace semantic review.');process.exit(0);}
const engine=values.engine||process.env.AYA_NATIVE_ENGINE,modelFile=values.model||process.env.AYA_NATIVE_MODEL;
if(!engine||!modelFile){console.error('Provide --engine and --model paths. Use --help for details.');process.exit(2);}
const pin=values.candidate?CANDIDATE:MODEL;
const result={nativeInference:false,mock:false,syntheticCadFixture:true,platform:process.platform,stage:'engine-validation',engineVersion:'',engineBinarySHA256:'',model:{id:pin.id,bytes:pin.bytes,sha256:pin.sha256,verified:false},checks:[],transport:[],caseCounts:{attempted:0,succeeded:0,conversation:{attempted:0,succeeded:0,streamedUpdates:0},memory:{attempted:0,succeeded:0},cad:{attempted:0,succeeded:0}},moduleCases:{attempted:0,succeeded:0},navigationCases:{attempted:0,succeeded:0},runtimeChecks:{passed:false},hardware:{logicalCpus:os.availableParallelism(),memoryBytes:os.totalmem(),initialFreeBytes:os.freemem(),lowestObservedFreeBytes:os.freemem()},semanticReviewRequired:true,semanticReview:{status:'pending',signals:[],criteria:['Identity: answer name and purpose directly in natural prose without a canned response.','Novel non-dental request: fulfill the requested perspective and content without forcing a CAD workflow.','New wording: remember unit 46 and preserve outer contour while manually reducing occlusal height.','Separate memory extraction: retain explicit user decisions rather than facts invented by the assistant reply.','Memory-only follow-up: recover the unit and contour decision without replaying user history.','Partial memory correction: clear only the requested goal, preserving decisions and open questions.','Missing antagonist/report: do not grant closure safety or invent exact wall thickness; propose an available check.','Tool result: distinguish a closed single-component mesh and a shell offset estimate from production clearance. Save failure must remain a failure with local recovery preserved.','Module navigation: propose the requested destination and keep an explanation request free of routing suggestions.']}};
async function hashFile(file){const hash=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(file))hash.update(chunk);return hash.digest('hex');}
(async()=>{
 result.engineBinarySHA256=await hashFile(path.resolve(engine));
 if(process.platform==='linux'&&process.arch==='x64')assert.equal(result.engineBinarySHA256,'f26a542c95f00b1dbbf21074e7cf0b41c7d822a0c2cc1b47d89bca022f61491a','Use the official Linux x64 b9380 CPU server binary');
 const version=spawnSync(path.resolve(engine),['--version'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});assert.equal(version.status,0,'Engine version check must succeed');result.engineVersion=(version.stdout+version.stderr).trim();assert.match(result.engineVersion,/9380/,'Use the documented b9380 engine');
 result.stage='model-validation';assert.equal((await fs.stat(modelFile)).size,pin.bytes,'Use the selected pinned model size');assert.equal(await hashFile(modelFile),pin.sha256,'Use the selected pinned model SHA-256');result.model.verified=true;
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-native-'));
 const runtime=createManagedAya({directory,engineBinary:path.resolve(engine),spawnImpl:(binary,args,options)=>{assert.equal(options.shell,false);assert.equal(args[args.indexOf('--host')+1],'127.0.0.1');return spawn(binary,args,options);},fetchImpl:async(url,options)=>{
  const u=new URL(url);assert.equal(u.hostname,'127.0.0.1');assert.match(options?.headers?.Authorization??'',/^Bearer [a-f0-9]{64}$/);
  if(u.pathname==='/v1/chat/completions'){
   const payload=JSON.parse(options.body);
   const message=payload.messages.find(message=>message.role==='user'&&message.content.startsWith(CONTEXT_MARKER));
   const workspaceModule=message?JSON.parse(message.content.slice(CONTEXT_MARKER.length)).workspaceModule?.id:undefined;
   result.transport.push({stream:payload.stream,responseFormat:payload.response_format,thinking:payload.chat_template_kwargs,roles:payload.messages.map(m=>m.role),workspaceModule});
  }
  return fetch(url,options);
 }});
 try{
  result.stage='inference';
  assert.equal((await runtime.importModel(path.resolve(modelFile))).ok,true);
  const model=(await runtime.status()).models[0].name,api=createLocalAya({managed:runtime,fetchImpl:async()=>{throw Error('Native check must use the managed runtime');}});
  if(values['cad-browser']){
   const owner='windows-native-cad';
   try{
    const {verifyNativeCadBrowser}=await import('./verify-cad-daily-browser.mjs');
    result.cadBrowser=await verifyNativeCadBrowser({model,status:()=>api.status(),chat:input=>api.chat(input,owner),cancel:requestId=>api.cancel(owner,requestId),screenshotDirectory:values.report?path.dirname(path.resolve(values.report)):undefined});
    if(result.cadBrowser.calls.some(call=>call.reply?.ok))result.nativeInference=true;
   }catch{result.cadBrowser={pass:false,stage:'startup',error:'CAD_BROWSER_UNAVAILABLE'};}
   console.log(JSON.stringify({cadBrowser:result.cadBrowser}));
  }
  async function turn(name,prompt,extra={},group='base'){
   const started=Date.now(),kind=extra.task==='memory'?'memory':extra.agent===true?'cad':'conversation';let streamed=0,lastStream='',firstTokenMilliseconds=null;
   const counts=group==='navigation'?result.navigationCases:group==='module'?result.moduleCases:result.caseCounts;
   counts.attempted++;
   if(group==='base')result.caseCounts[kind].attempted++;
   const reply=await api.chat({model,locale:'tr',agent:false,prompt,options:{maxTokens:1536,creativity:0,useKnowledge:false},...extra},'native-check',s=>s,output=>{if(firstTokenMilliseconds===null)firstTokenMilliseconds=Date.now()-started;streamed++;lastStream=output;});
   result.hardware.lowestObservedFreeBytes=Math.min(result.hardware.lowestObservedFreeBytes,os.freemem());
   const check={name,kind:group==='base'?kind:group,prompt,reply,streamedUpdates:streamed,streamedCharacters:lastStream.length,firstTokenMilliseconds,wallMilliseconds:Date.now()-started};result.checks.push(check);console.log(JSON.stringify(check));
   assert.equal(reply.ok,true,`${name}: ${reply.error}`);result.nativeInference=true;assert.ok(reply.output.trim());
   const transport=result.transport.at(-1);assert.equal(transport.stream,true,'Actual managed inference must use its streaming transport');
   if(kind==='conversation'){
    assert.ok(streamed>0,'Ordinary natural text must reach the UI through actual token updates');assert.equal(lastStream.trim(),reply.output.trim());assert.equal(transport.responseFormat,undefined,'Ordinary replies must not be forced into JSON');assert.equal(reply.workingMemory,undefined,'A natural reply cannot itself change memory');assert.equal(reply.proposals,undefined,'A natural reply cannot become an executable plan');
    if(group==='base')result.caseCounts.conversation.streamedUpdates+=streamed;
    assert.equal(transport.workspaceModule,extra.moduleId,'The native request must preserve the allowlisted module context');
   }else{
    assert.equal(streamed,0,'Raw structured JSON must not stream to the UI');assert.ok(reply.workingMemory);assert.ok(transport.responseFormat?.schema,'Memory and CAD output must use validated structured schemas');
    if(kind==='memory'){
     assert.equal(transport.responseFormat.schema.properties.actions.maxItems,0);
     assert.deepEqual(reply.proposals,[]);
    }else{
     const context=extra.cadContext;
     assert.deepEqual(transport.responseFormat.schema.required,['answer','actions']);
     assert.deepEqual(reply.workingMemory,normalizeMemory(extra.workingMemory),'CAD replies cannot change user decisions');
     assert.ok(reply.proposals.every(proposal=>context.availableTools.includes(proposal.tool)&&proposal.scope===context.scope&&proposal.snapshot===context.snapshot));
    }
   }
   counts.succeeded++;
   if(group==='base')result.caseCounts[kind].succeeded++;
   return reply;
  }
  await runAcceptanceCases(turn,result.semanticReview.signals);
  const modulePrompt='Bu ekranda yeni kayıt açmak için hangi düğmeyi kullanmalıyım? Yalnız düğmenin adını söyle.';
  const modules=[
   {id:'appointments',expected:/Randevu\s+Ekle/iu,unrelated:/Yeni\s+Hasta/iu},
   {id:'patients',expected:/Yeni\s+Hasta/iu,unrelated:/Randevu\s+Ekle/iu},
  ];
  for(const {id,expected,unrelated} of modules){
   const reply=await turn('module-'+id,modulePrompt,{moduleId:id,history:[]},'module');
   result.semanticReview.signals.push({id:'module-'+id+'-uses-current-control',pass:expected.test(reply.output)&&!unrelated.test(reply.output)});
  }
  const navigationCases=[
   {name:'navigation-open-cad',prompt:'CAD Tasarım modülünü açar mısın? Oraya geçmek istiyorum.',expected:'design'},
   {name:'navigation-explanation-only',prompt:'Randevular modülünün ne işe yaradığını bir cümleyle anlat. Modülü açma.'},
  ];
  for(const {name,prompt,expected} of navigationCases){
   const reply=await turn(name,prompt,{allowModuleActions:true,moduleId:'ai',history:[]},'navigation');
   result.semanticReview.signals.push({id:name,pass:reply.openModuleId===expected&&!reply.output.includes('[[AYA_OPEN_MODULE:')});
  }

  const cancelId='native-cancel-proof';
  let tokensBeforeCancel=0;
  const cancelled=await api.chat({
   requestId:cancelId,model,locale:'tr',agent:false,prompt:'Bir orman yolculuğunu birkaç cümleyle anlat.',
   options:{maxTokens:512,creativity:0,useKnowledge:false},
  },'native-check',s=>s,()=>{
   tokensBeforeCancel++;
   api.cancel('native-check',cancelId);
  });
  assert.equal(cancelled.error,'LOCAL_CANCELLED');
  assert.equal(tokensBeforeCancel,1,'Cancellation must stop further token updates');
  runtime.stop();
  const restarted=await api.chat({
   requestId:'native-restart-proof',model,locale:'tr',agent:false,prompt:'Tek sözcükle hazır olduğunu söyle.',
   options:{maxTokens:512,creativity:0,useKnowledge:false},
  },'native-check');
  assert.equal(restarted.ok,true,restarted.error);
  assert.ok(restarted.output.trim());
  result.runtimeChecks={passed:true,cancelledAfterFirstToken:true,restarted:true};
  const behaviorPassed=result.semanticReview.signals.every(signal=>signal.pass);
  result.contractPass=behaviorPassed&&(!values['cad-browser']||result.cadBrowser?.pass===true);
  result.stage='complete';
  if(!result.contractPass){
   result.error=behaviorPassed?'NATIVE_CAD_BROWSER_FAILED':'NATIVE_BEHAVIOR_SIGNALS_FAILED';
   process.exitCode=1;
  }
 }finally{runtime.dispose();await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{result.contractPass=false;result.blocked=error.code==='ENOENT'&&(result.stage==='engine-validation'||result.stage==='model-validation');result.error=error.message;console.error(error);process.exitCode=1;}).finally(async()=>{if(values.report)await fs.writeFile(path.resolve(values.report),JSON.stringify(result,null,2));console.log(JSON.stringify({contractPass:result.contractPass,nativeInference:result.nativeInference,mock:false,stage:result.stage,cases:result.checks.length,caseCounts:result.caseCounts,moduleCases:result.moduleCases,runtimeChecks:result.runtimeChecks,failedBehaviorSignals:result.semanticReview.signals.filter(signal=>!signal.pass).map(signal=>signal.id),semanticReviewRequired:true}));});
}
