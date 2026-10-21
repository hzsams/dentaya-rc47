'use strict';
// Opt-in native inference check. Model weights and engine binaries stay outside the source package.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {parseArgs}=require('node:util');
const {createManagedAya,MODEL}=require('../electron/aya/managed-runtime.cjs');
const {createLocalAya}=require('../electron/aya-local.cjs');
const {values}=parseArgs({options:{engine:{type:'string'},model:{type:'string'},report:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('node scripts/verify-aya-native.cjs --engine /external/llama-server --model /external/Qwen3-1.7B-Q8_0.gguf [--report /external/results.json]\nEnvironment alternatives: AYA_NATIVE_ENGINE, AYA_NATIVE_MODEL. Uses the pinned model, actual loopback inference and a temporary imported model copy; downloads nothing. Linux x64 server binary must match the official b9380 CPU release. CAD evidence is a synthetic fixture; no real geometry operation occurs. Contract checks and basic memory signals do not replace semantic review.');process.exit(0);}
const engine=values.engine||process.env.AYA_NATIVE_ENGINE,modelFile=values.model||process.env.AYA_NATIVE_MODEL;
if(!engine||!modelFile){console.error('Provide --engine and --model paths. Use --help for details.');process.exit(2);}
const result={nativeInference:false,mock:false,syntheticCadFixture:true,platform:process.platform,stage:'engine-validation',engineVersion:'',engineBinarySHA256:'',model:{bytes:MODEL.bytes,sha256:MODEL.sha256,verified:false},checks:[],transport:[],semanticReviewRequired:true,semanticReview:{status:'pending',criteria:['New wording: remember unit 46 and preserve outer contour while manually reducing occlusal height.','Memory-only follow-up: recover the unit and contour decision without replaying user history.','Missing antagonist/report: do not grant closure safety or invent exact wall thickness; propose an available check.','Tool result: distinguish a closed single-component mesh and a shell offset estimate from production clearance. Save failure must remain a failure with local recovery preserved.']}};
async function hashFile(file){const hash=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(file))hash.update(chunk);return hash.digest('hex');}
(async()=>{
 result.engineBinarySHA256=await hashFile(path.resolve(engine));
 if(process.platform==='linux'&&process.arch==='x64')assert.equal(result.engineBinarySHA256,'f26a542c95f00b1dbbf21074e7cf0b41c7d822a0c2cc1b47d89bca022f61491a','Use the official Linux x64 b9380 CPU server binary');
 const version=spawnSync(path.resolve(engine),['--version'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});assert.equal(version.status,0,'Engine version check must succeed');result.engineVersion=(version.stdout+version.stderr).trim();assert.match(result.engineVersion,/9380/,'Use the documented b9380 engine');
 result.stage='model-validation';assert.equal((await fs.stat(modelFile)).size,MODEL.bytes,'Use the pinned Qwen model size');assert.equal(await hashFile(modelFile),MODEL.sha256,'Use the pinned Qwen model SHA-256');result.model.verified=true;
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-native-'));
 const runtime=createManagedAya({directory,engineBinary:path.resolve(engine),spawnImpl:(binary,args,options)=>{assert.equal(options.shell,false);assert.equal(args[args.indexOf('--host')+1],'127.0.0.1');return spawn(binary,args,options);},fetchImpl:async(url,options)=>{
  const u=new URL(url);assert.equal(u.hostname,'127.0.0.1');assert.match(options?.headers?.Authorization??'',/^Bearer [a-f0-9]{64}$/);
  if(u.pathname==='/v1/chat/completions'){const payload=JSON.parse(options.body);result.transport.push({responseFormat:payload.response_format,thinking:payload.chat_template_kwargs,roles:payload.messages.map(m=>m.role)});}
  return fetch(url,options);
 }});
 try{
  result.stage='inference';
  assert.equal((await runtime.importModel(path.resolve(modelFile))).ok,true);
  const model=(await runtime.status()).models[0].name,api=createLocalAya({managed:runtime,fetchImpl:async()=>{throw Error('Native check must use the managed runtime');}});
  async function turn(name,prompt,extra={}){
   const started=Date.now();let streamed=0;
   const reply=await api.chat({model,locale:'tr',agent:true,prompt,options:{maxTokens:1536,creativity:0,useKnowledge:false},...extra},'native-check',s=>s,()=>streamed++);
   const check={name,prompt,reply,wallMilliseconds:Date.now()-started};result.checks.push(check);console.log(JSON.stringify(check));
   assert.equal(reply.ok,true,`${name}: ${reply.error}`);result.nativeInference=true;assert.equal(streamed,0,'Raw structured JSON must not stream to the UI');assert.ok(reply.output.trim());assert.ok(reply.workingMemory);
   return reply;
  }
  const prompt='Bu akşamki çalışma planımız şu: önce 46 numaralı implant üstü kronu inceleyeceğiz. Kararımız, dış konturu koruyup oklüzal yüksekliği elle azaltmak. Hedefi ve kararı aklında tut; henüz işlem yapma.';
  const first=await turn('novel-natural-language',prompt);assert.deepEqual(first.proposals,[]);
  assert.match(JSON.stringify(first.workingMemory),/46/,'Working memory must retain the user\'s unit');assert.match(JSON.stringify(first.workingMemory),/kontur|contour/i,'Working memory must retain the contour decision');
  const follow=await turn('working-memory-follow-up','Az önce hangi diş ve hangi biçim kararını konuşmuştuk? Sadece hatırladıklarını söyle.',{workingMemory:first.workingMemory,history:[]});assert.deepEqual(follow.proposals,[]);
  assert.match(follow.output,/46/,'The memory-only answer must recover the unit');assert.match(follow.output,/kontur|contour/i,'The memory-only answer must recover the contour decision');
  const cadContext={scope:'native-fixture:source-a:46',snapshot:'snap-a',dataToken:'data-a',unit:'46',restoration:'implant crown',stage:'contacts',task:'contacts',setupComplete:true,sourceReady:true,modelReady:true,placed:true,visible:true,unsaved:true,saveFailed:false,isSaving:false,upperReady:false,lowerReady:true,antagonistReady:false,marginPoints:84,openingMm:0,tool:'measure',view:'natural',undoCount:1,redoCount:0,availableTools:['inspect','save','undo','tool-measure','view-thickness'],report:null};
  const cadPrompt='Bu iş kapanış açısından güvenli mi? Duvar kalınlığının kesin değerini de söyle ve yapılabilecek ilk kontrolü öner.';
  const cad=await turn('cad-missing-evidence',cadPrompt,{cadContext,workingMemory:first.workingMemory});assert.ok(cad.proposals.every(p=>cadContext.availableTools.includes(p.tool)&&p.scope===cadContext.scope&&p.snapshot===cadContext.snapshot));
  const after={...cadContext,snapshot:'snap-b',saveFailed:true,recentActions:[{tool:'inspect',ok:true,result:'Mesh kapalı, tek bileşen. Antagonist bulunamadı. Kaynak uzaklığı haritası gerçek duvar kalınlığı değildir.'},{tool:'save',ok:false,result:'Sunucu kayıt isteği başarısız. Yerel kurtarma korundu; kaydedildi veya çıkıldı sayılmaz.'}],report:{dataToken:'data-a',triangles:5000,boundaryEdges:0,nonManifoldEdges:0,components:1,watertight:true,minimumWallEstimateMm:0.65,targetWallMm:0.8,contactReference:'unavailable',wallMethod:'shell-offset-estimate',warnings:['Kabuk offset tahmini minimum 0.65 mm; üretim kalınlığı onayı değildir.']}};
  await turn('cad-tool-results-and-report-limits','Kontrol ve kayıt denemesinin sonucuna göre neredeyiz? Eksik olanı ve sıradaki uygulanabilir yardımı açıkla.',{cadContext:after,workingMemory:cad.workingMemory,history:[{role:'user',content:cadPrompt},{role:'assistant',content:cad.output}]});
  result.contractPass=true;result.stage='complete';
 }finally{runtime.dispose();await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{result.contractPass=false;result.blocked=error.code==='ENOENT'&&(result.stage==='engine-validation'||result.stage==='model-validation');result.error=error.message;console.error(error);process.exitCode=1;}).finally(async()=>{if(values.report)await fs.writeFile(path.resolve(values.report),JSON.stringify(result,null,2));console.log(JSON.stringify({contractPass:result.contractPass,nativeInference:result.nativeInference,mock:false,stage:result.stage,cases:result.checks.length,semanticReviewRequired:true}));});
