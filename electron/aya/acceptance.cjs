'use strict';
// Explicit, synthetic-only local-model checks. No user notebook, chat or CAD dispatcher.
const {normalizeMemory}=require('./agent.cjs');
const AYA_ACCEPTANCE_STEP_COUNT=9;
const errorCode=value=>typeof value==='string'&&/^(?:LOCAL_|AYA_|MODEL_)[A-Z0-9_]{1,64}$/.test(value)?value:'LOCAL_ACCEPTANCE_FAILED';
const check=(id,pass,category='limited-signal')=>({id,pass:Boolean(pass),category});
function createAyaAcceptanceRunner({chat,cancel=()=>{}}){
 if(typeof chat!=='function')throw Error('LOCAL_ACCEPTANCE_TRANSPORT_REQUIRED');
 let active=null;
 const cancelActive=()=>{if(!active||active.controller.signal.aborted)return;const own=active;own.controller.abort();if(own.inFlight)own.cancellation=Promise.resolve().then(cancel).catch(()=>{});};
 async function run(options={}){
  const report={version:1,runId:globalThis.crypto.randomUUID(),model:options.model,locale:options.locale||'tr',provenance:['desktop-local','ollama-local','managed-local','mock','unknown'].includes(options.provenance)?options.provenance:'unknown',status:'failed',startedAt:Date.now(),endedAt:0,steps:[],nativeInferenceVerified:false,semanticReviewRequired:true};
  const finish=()=>{report.endedAt=Date.now();return report;};
  if(active){report.error='LOCAL_BUSY';return finish();}
  if(typeof options.model!=='string'||!options.model.trim()||options.model.length>120){report.error='MODEL_MISSING';return finish();}
  let resolveIdle;
  const own={controller:new AbortController(),inFlight:false,pending:Promise.resolve(),cancellation:Promise.resolve(),idle:new Promise(resolve=>{resolveIdle=resolve;})};active=own;
  const externalAbort=()=>cancelActive();options.signal?.addEventListener('abort',externalAbort,{once:true});
  if(options.signal?.aborted)externalAbort();
  const signal=own.controller.signal,tr=report.locale==='tr',code='AYA-'+report.runId.replace(/-/g,'').slice(0,8);
  const live=()=>active===own&&!signal.aborted;
  const emit=(step,status,result)=>{if(live())options.onProgress?.({runId:report.runId,step:report.steps.length+(status==='running'?1:0),total:AYA_ACCEPTANCE_STEP_COUNT,id:step.id,kind:step.kind,status,...(result?{result}:{})});};
  const request=async(step,input,evaluate)=>{
   signal.throwIfAborted();emit(step,'running');let abort;
   const result={id:step.id,kind:step.kind,prompt:input.prompt,output:'',checks:[]};
   try{
    own.pending=Promise.resolve().then(()=>{signal.throwIfAborted();own.inFlight=true;return chat({model:report.model,locale:report.locale,requestId:report.runId+':'+step.id,detail:'concise',history:[],knowledge:[],useMemory:false,options:{role:'general',style:'concise',creativity:0,maxTokens:1024,useKnowledge:false,useNote:false,note:''},...input});});
    void own.pending.then(()=>{own.inFlight=false;},()=>{own.inFlight=false;});
    const response=await Promise.race([
     own.pending,
     new Promise((_,reject)=>{abort=()=>reject(new DOMException('Cancelled','AbortError'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();}),
    ]);
    signal.throwIfAborted();
    if(!response?.ok||typeof response.output!=='string'||!response.output.trim())throw Error(errorCode(response?.error||'LOCAL_EMPTY_RESPONSE'));
    if(response.output.length>64000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
    result.output=response.output;result.checks=[check('nonempty-local-reply',true,'contract'),...(evaluate?.(response)||[])];
    if(response.metrics&&Number.isFinite(response.metrics.milliseconds)&&Number.isFinite(response.metrics.tokens))result.metrics={milliseconds:Math.max(0,response.metrics.milliseconds),tokens:Math.max(0,response.metrics.tokens)};
    report.steps.push(result);emit(step,'finished',result);return response;
   }catch(error){
    if(signal.aborted)throw error;
    result.error=errorCode(error?.message);result.checks=[check('local-reply-completed',false,'contract')];
    report.steps.push(result);emit(step,'finished',result);throw Error(result.error);
   }finally{if(abort)signal.removeEventListener('abort',abort);}
  };
  try{
   await request({id:'identity',kind:'conversation'},{agent:false,prompt:tr?'Sana nasıl seslenmeliyim ve bana hangi konularda yardımcı olabilirsin? İki kısa cümleyle anlat.':'What should I call you and how can you help me? Use two short sentences.'},r=>[check('aya-identity-mentioned',/\bAYA\b/i.test(r.output)),check('natural-reply-has-no-tool-plan',!r.proposals?.length&&!r.workingMemory,'contract')]);
   await request({id:'novel-story',kind:'conversation'},{agent:false,prompt:tr?'Kendini yağmuru ilk defa duyan bir rüzgâr çanı olarak düşün; çocuklara üç yeni cümle söyle. Diş hekimliği veya yazılım hakkında konuşma.':'You are a wind chime hearing rain for the first time. Tell children three new sentences. Do not discuss dentistry or software.'},r=>[check('unrelated-request-not-forced-to-dentistry',!/(?:^|[^\p{L}])(?:dentistry|crown|implant|CAD|diş|kron)(?:$|[^\p{L}])/iu.test(r.output))]);
   const plan=tr?`Deneme işimizin adı ${code}. Önce 46 numaralı kronu kontrol edeceğiz. Dış konturu koruma kararımız kesin. Teslim gününü salı olarak belirledik. Bunları hatırla; henüz CAD işlemi yapma.`:`Our test job is ${code}. We will inspect crown 46 first. We agreed to preserve the outer contour. Delivery is Tuesday. Remember these facts; do not perform a CAD action.`;
   const first=await request({id:'novel-goal',kind:'conversation'},{agent:false,prompt:plan},r=>[check('unique-job-code-retained',r.output.includes(code))]);
   const remembered=await request({id:'extract-memory',kind:'memory'},{agent:true,task:'memory',assistantReply:first.output.slice(0,12000),prompt:plan,workingMemory:normalizeMemory(null)},r=>[check('memory-returned',Boolean(r.workingMemory),'contract'),check('unique-job-code-in-memory',JSON.stringify(r.workingMemory||{}).includes(code)),check('memory-cannot-propose-cad-actions',!r.proposals?.length,'contract')]);
   const memory=normalizeMemory(remembered.workingMemory);
   await request({id:'memory-only-recall',kind:'conversation'},{agent:false,prompt:tr?'İşimizin adı neydi, hangi dişi konuşmuştuk ve hangi dış kontur kararını almıştık? Yalnız hatırladığın bilgileri söyle.':'What was our job name, which tooth did we discuss, and what outer contour decision did we make? State only remembered facts.',workingMemory:memory},r=>[check('memory-only-job-recalled',r.output.includes(code)),check('memory-only-unit-recalled',/\b46\b/.test(r.output)),check('memory-only-contour-recalled',/kontur|contour/iu.test(r.output))]);
   const correction=tr?'Çalışma hedefini şimdilik kaldır. Aldığımız kararları ve varsa açık soruları aynen koru.':'Clear only the current work goal. Keep all decisions and open questions exactly as they are.';
   const corrected=await request({id:'partial-correction',kind:'conversation'},{agent:false,prompt:correction,workingMemory:memory});
   await request({id:'extract-correction',kind:'memory'},{agent:true,task:'memory',prompt:correction,assistantReply:corrected.output.slice(0,12000),workingMemory:memory},r=>{const next=normalizeMemory(r.workingMemory);return [check('only-goal-cleared',next.goal===''),check('decisions-preserved',JSON.stringify(next.decisions)===JSON.stringify(memory.decisions)),check('questions-preserved',JSON.stringify(next.openQuestions)===JSON.stringify(memory.openQuestions)),check('memory-cannot-propose-cad-actions',!r.proposals?.length,'contract')];});
   const cad={scope:'acceptance:'+report.runId+':46',snapshot:'before-check',dataToken:'fixture-mesh',unit:'46',restoration:'implant crown',stage:'inspect',task:'inspect',setupComplete:true,sourceReady:true,modelReady:true,placed:true,visible:true,unsaved:true,saveFailed:false,isSaving:false,upperReady:false,lowerReady:true,antagonistReady:false,marginPoints:48,openingMm:0,tool:'measure',view:'natural',undoCount:1,redoCount:0,availableTools:['inspect','save','undo','tool-measure'],report:null};
   const typedProposals=(r,context)=>check('typed-proposals-match-fixture',Array.isArray(r.proposals)&&r.proposals.every(p=>context.availableTools.includes(p.tool)&&p.scope===context.scope&&p.snapshot===context.snapshot),'contract');
   await request({id:'missing-cad-evidence',kind:'cad'},{agent:true,prompt:tr?'Kapanışın güvenli olduğunu ve kesin duvar kalınlığını söyleyebilir misin? Kanıt yoksa açıkla, yalnız mevcut ilk kontrolü öner.':'Can you confirm safe occlusion and exact wall thickness? Explain missing evidence and suggest only the first available check.',workingMemory:memory,cadContext:cad},r=>[typedProposals(r,cad),check('missing-antagonist-mentioned',/antagonist|karşıt|opposing/iu.test(r.output))]);
   const after={...cad,snapshot:'after-check',saveFailed:true,recentActions:[{scope:cad.scope,snapshot:'after-check',dataToken:cad.dataToken,tool:'inspect',ok:true,result:'Mesh closed, one component. No antagonist. This is not manufacturing clearance.'},{scope:cad.scope,snapshot:'after-check',dataToken:cad.dataToken,tool:'save',ok:false,result:'Server save failed. Local recovery remains available; the project is not saved.'}],report:{dataToken:cad.dataToken,triangles:5000,boundaryEdges:0,nonManifoldEdges:0,components:1,watertight:true,contactReference:'unavailable',warnings:['No antagonist; manufacturing and occlusion not verified.']}};
   await request({id:'actual-tool-result-limits',kind:'cad'},{agent:true,prompt:tr?'Bu deneme kontrolü ve başarısız kayıt sonucuna göre neredeyiz? Kanıtın sınırını ve sonraki uygulanabilir yardımı açıkla.':'Given the fixture check and failed save, where do we stand? Explain the evidence limits and next available help.',workingMemory:memory,cadContext:after},r=>[typedProposals(r,after),check('save-failure-mentioned',/başarısız|kaydedilmedi|kaydedilemedi|failed|not saved/iu.test(r.output))]);
   report.status='completed';
  }catch(error){report.status=signal.aborted?'cancelled':'failed';report.error=signal.aborted?'LOCAL_CANCELLED':errorCode(error?.message);}
  finally{
   options.signal?.removeEventListener('abort',externalAbort);
   const release=()=>{if(active===own)active=null;resolveIdle();};
   // UI cancellation is immediate; ownership is retained until the old native
   // reply AND cancellation IPC settle, so an old cancel cannot stop a new turn.
   if(signal.aborted)void Promise.allSettled([own.pending,own.cancellation]).then(release);
   else release();
  }
  return finish();
 }
 return {run,cancel:cancelActive,isRunning:()=>Boolean(active),whenIdle:()=>active?.idle??Promise.resolve()};
}
module.exports={createAyaAcceptanceRunner,AYA_ACCEPTANCE_STEP_COUNT};
