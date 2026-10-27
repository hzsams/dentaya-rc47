import assert from 'node:assert/strict';
import {resolveAyaReply,type AyaReply,type AyaReplySuccess} from '../src/lib/aya-conversation';
import {DEFAULT_AYA_OPTIONS} from '../src/lib/aya-local-state';

const context={unit:'46',restoration:'İmplant üstü kron',stage:'margin',setupComplete:true,sourceReady:true,modelReady:true,marginPoints:32,placed:false,visible:true,unsaved:true,saveFailed:false};
const input=(prompt:string)=>({prompt});
function success(reply:AyaReply):AyaReplySuccess{assert.equal(reply.ok,true,JSON.stringify(reply));if(!reply.ok)throw Error(reply.error);return reply;}
function unavailable(reply:AyaReply,error:string,cancelled=false){
 assert.equal(reply.ok,false,JSON.stringify(reply));if(reply.ok)throw Error('Expected unavailable inference');
 assert.equal(reply.kind,'unavailable');assert.equal(reply.error,error);assert.equal(reply.cancelled,cancelled);assert.deepEqual(reply.references,[]);
 for(const key of ['output','engine','workingMemory','proposals','warning'])assert.equal(Object.hasOwn(reply,key),false,'Failed inference cannot fabricate '+key);
}
const guide=async(prompt:string,extra:Omit<Parameters<typeof resolveAyaReply>[0],'prompt'|'mode'>={})=>success(await resolveAyaReply({prompt,...extra,mode:'guide'}));
let modelCalls=0;
const callModel=async()=>{modelCalls++;return {ok:true,output:'Synthetic transport response',references:[]};};

// Every normal message reaches inference, including identity, catalogue matches,
// follow-ups and novel unrelated requests. Missing inference never invents a turn.
const ordinary=['Kanka selam','Adın ne?','Amacın ne?','Merhaba AYA, adın ne ve amacın ne?','What is your name?','Dentin nedir','Yeni bir klinik açan arkadaşıma sıcak ve kısa bir davet yaz','Bunu daha kısa anlatır mısın','Az önce seçtiğimiz hedefle sıradaki işi planlayalım','Bir rüzgâr çanının ağzından ilk yağmuru dinleyen çocuklara üç cümle yaz.','?','devam'];
for(const prompt of ordinary){
 unavailable(await resolveAyaReply(input(prompt)),'MODEL_MISSING');
 const reply=success(await resolveAyaReply(input(prompt),{callModel}));assert.equal(reply.kind,'model');assert.equal(reply.engine,'model');assert.equal(reply.output,'Synthetic transport response');
}
assert.equal(modelCalls,ordinary.length);
const noKnowledge=success(await resolveAyaReply({prompt:'Dentin nedir',options:{useKnowledge:false}},{callModel}));assert.equal(noKnowledge.kind,'model');
const forced=success(await resolveAyaReply({prompt:'Kısaca kendini tanıt',mode:'guide',forceModel:true},{callModel}));assert.equal(forced.kind,'model');
const manualMemory={goal:'Teslimi cuma hazırla',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati?']};
for(const prompt of ['Adın ne?','Dentin nedir','Hedefimiz neydi?','Modelin üstüne kron yapalım.','Bu kesitin gerçek alanını yorumla.']){
 for(const error of ['MODEL_MISSING','LOCAL_TIMEOUT','LOCAL_BUSY','LOCAL_EMPTY_RESPONSE','LOCAL_INVALID_PLAN','LOCAL_ERROR']){
  unavailable(await resolveAyaReply({prompt,cadContext:{...context,scope:'case-a/46',snapshot:'current'},workingMemory:manualMemory},{callModel:async()=>({ok:false,error})}),error);
 }
}
for(const error of ['LOCAL_CANCELLED','LOCAL_CONTEXT_CHANGED'])unavailable(await resolveAyaReply({prompt:'Adın ne?'},{callModel:async()=>({ok:false,error})}),error,true);
for(const error of [new DOMException('Aborted','AbortError'),new Error('LOCAL_CANCELLED')])unavailable(await resolveAyaReply({prompt:'Adın ne?'},{callModel:async()=>{throw error;}}),'LOCAL_CANCELLED',true);
for(const error of ['C:\\patients\\private-model.gguf','PRIVATE https://private.invalid/file','AYA_RAW: patient name','LOCAL_'+ 'X'.repeat(100)]){
 const failed=await resolveAyaReply({prompt:'Hikayeyi yeniden yaz'},{callModel:async()=>({ok:false,error})});unavailable(failed,'LOCAL_ERROR');assert.doesNotMatch(JSON.stringify(failed),/patients|private|PRIVATE|patient name/);
}
unavailable(await resolveAyaReply({prompt:'Bir çalışma notu yaz'},{callModel:async()=>{throw Error('network private details');}}),'LOCAL_ERROR');
unavailable(await resolveAyaReply({prompt:'Bir çalışma notu yaz'},{callModel:async()=>({ok:true,output:'  '})}),'LOCAL_EMPTY_RESPONSE');
unavailable(await resolveAyaReply({prompt:'Önceki kararımız neydi?',workingMemory:manualMemory}),'MODEL_MISSING');
const memory=success(await resolveAyaReply({prompt:'Sonraki adımı önceki hedefe göre düzenle'},{callModel:async()=>({ok:true,output:'Önce hedefimize uygun kayıt notunu tamamlayalım.',workingMemory:{goal:'Vakanın teslimini hazırla',decisions:['Teslim cuma günü'],openQuestions:['Hangi kurye?']}})}));assert.deepEqual(memory.workingMemory,{goal:'Vakanın teslimini hazırla',decisions:['Teslim cuma günü'],openQuestions:['Hangi kurye?']});
const noTools=success(await resolveAyaReply({prompt:'Bir metin yaz'},{callModel:async()=>({ok:true,output:'Bir metin',proposals:[{tool:'inspect',reason:'Not executable',scope:'other',snapshot:'other'}]})}));assert.deepEqual(noTools.proposals,[],'Ordinary conversation never promotes model actions to a CAD plan');

// The deterministic guide remains available only when explicitly selected.
const beforeGuide=modelCalls;
const explicitGuide=success(await resolveAyaReply({prompt:'Dentin nedir',mode:'guide'},{callModel}));assert.equal(modelCalls,beforeGuide,'An explicit guide must not call inference');assert.equal(explicitGuide.kind,'guide');assert.equal(explicitGuide.engine,'core');assert.ok(explicitGuide.references.length);
const install=await guide('Windows güncelleme CMD kurulum');assert.equal(install.engine,'guide');assert.match(install.output,/DENTAYA_GUNCELLE_DERLE/);
const identity=await guide('Adın ne?',{options:{useKnowledge:false}});assert.match(identity.output,/AYA/);assert.equal(identity.kind,'guide');
const recalled=await guide('Önceki kararımız neydi?',{workingMemory:manualMemory});assert.match(recalled.output,/Teslimi cuma hazırla/);assert.match(recalled.output,/Önce prova kontrolü/);assert.match(recalled.output,/Kurye saati/);
assert.match((await guide('Hedefimiz neydi?')).output,/kayıtlı hedef veya karar yok/);
const unknown='Zümrüt turnanın orkestradaki sessizliğine büyülü bir masal uydur';unavailable(await resolveAyaReply({prompt:unknown,mode:'guide'}),'GUIDE_NO_MATCH');
const disabled=await resolveAyaReply({prompt:'Dentin nedir',mode:'guide',options:{useKnowledge:false}});assert.deepEqual(disabled.references,[]);assert.equal(disabled.ok,false,'Disabled catalogue cannot quietly supply a definition');
assert.match((await guide('implant üstü diş gelmiyor',{cadContext:{...context,marginPoints:0}})).output,/Geçerli bir kole/);
assert.match((await guide('implant üstü diş gelmiyor',{cadContext:context})).output,/Koleye yerleştir/);
assert.match((await guide('kaydet ve çık',{cadContext:{...context,saveFailed:true}})).output,/Yerel kaydet ve çık/);
assert.match((await guide('implant nedir',{cadContext:context})).output,/tıbbi cihaz/);
assert.match((await guide('Kapanış nedir',{cadContext:context})).output,/kayıtlı ilişkisini/);
assert.match((await guide('Kapanış',{cadContext:{...context,upperReady:false,lowerReady:false}})).output,/Antagonist/);
const notebook=await guide('Kurye saatimiz kaç',{knowledge:[{id:'kurye',title:'Kurye saati',content:'Kurye 16:40 saatinde gelir.',kind:'memory'}]});assert.match(notebook.output,/16:40/);assert.equal(notebook.references[0].id,'knowledge-kurye');
const record=await guide('STL nedir');const next=await guide('peki nasıl kontrol ederim',{history:[{role:'user',content:'STL nedir'},{role:'assistant',content:record.output,engine:record.engine,references:record.references}],options:DEFAULT_AYA_OPTIONS});assert.equal(next.references[0].id,'aya-qa-scan-stl-check');
const scopedCad={...context,scope:'project:scan:unit46',snapshot:'current-snapshot',dataToken:'current-geometry',task:'margin',availableTools:['place','tool-margin','inspect','save','show-all']};
const placement=await guide('Modelin üstüne kron yapalım.',{cadContext:scopedCad});assert.equal(placement.proposals?.[0]?.tool,'place');assert.equal(placement.proposals?.[0].scope,scopedCad.scope);assert.equal(placement.proposals?.[0].snapshot,scopedCad.snapshot);
const noMargin=await guide('Modelin üstüne kron yapalım.',{cadContext:{...scopedCad,marginPoints:0}});assert.equal(noMargin.proposals?.[0]?.tool,'tool-margin');
const saveFailure=await guide('Güncel çalışma durumunu değerlendir.',{cadContext:{...scopedCad,saveFailed:true}});assert.equal(saveFailure.proposals?.[0]?.tool,'save');assert.match(saveFailure.output,/Son kayıt başarısız/);
const cadHistory=[{role:'user' as const,content:'Güncel çalışma durumunu değerlendir.',cadScope:scopedCad.scope},{role:'assistant' as const,engine:'core' as const,content:'Previous CAD advice',cadScope:scopedCad.scope}];
assert.equal((await guide('Peki şimdi?',{cadContext:scopedCad,history:cadHistory})).proposals?.[0]?.tool,'place');
const sectionCad={...scopedCad,view:'section',sectionToken:'current-section',section:{dataToken:scopedCad.dataToken,key:'current-section',plane:{normal:[0,0,1] as [number,number,number],constantMm:0},sourceSimplified:true,restoration:{lengthMm:20,areaMm2:24,closedLoops:1,issues:[]},source:{lengthMm:12,areaMm2:null,closedLoops:0,issues:['open']}}};
const sectionPrompt='Bu kesitin gerçek alanını ve uzunluğunu yorumla.';
const currentSection=await guide(sectionPrompt,{cadContext:sectionCad});assert.match(currentSection.output,/24 mm²/);assert.match(currentSection.output,/20 mm/);assert.match(currentSection.output,/sadeleştirilmiş/);assert.deepEqual(currentSection.proposals,[]);
const staleSection=await guide(sectionPrompt,{cadContext:{...sectionCad,sectionToken:'new-plane'}});assert.doesNotMatch(staleSection.output,/24 mm²/);assert.match(staleSection.output,/güncel kesit ölçümü yok/);

const beforeSafety=modelCalls;const safety=success(await resolveAyaReply({prompt:'Dişim şişti nefes alamıyorum',forceModel:true},{callModel}));assert.equal(safety.kind,'safety');assert.match(safety.output,/acil/);assert.equal(modelCalls,beforeSafety,'An emergency warning must not wait for model inference');
await assert.rejects(()=>resolveAyaReply({prompt:' '}),/INVALID_PROMPT/);await assert.rejects(()=>resolveAyaReply({prompt:'a'.repeat(8001)}),/INVALID_PROMPT/);
console.log(JSON.stringify({pass:true,conversationRequiresInference:true,noAutomaticFallback:true,noFabricatedFailureTurn:true,modelFirstKnownAndNovelPrompts:true,errorPrivacy:true,cancellationFinal:true,explicitGuideOnly:true,guideRetainsTypedCadAndRealSectionEvidence:true,emergencyDistinct:true,modelInference:'mock callback only'}));
