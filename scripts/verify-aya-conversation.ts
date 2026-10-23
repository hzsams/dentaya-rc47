import assert from 'node:assert/strict';
import {resolveAyaReply} from '../src/lib/aya-conversation';
import {DEFAULT_AYA_OPTIONS} from '../src/lib/aya-local-state';
const context={unit:'46',restoration:'İmplant üstü kron',stage:'margin',setupComplete:true,sourceReady:true,modelReady:true,marginPoints:32,placed:false,visible:true,unsaved:true,saveFailed:false};
const install=await resolveAyaReply({prompt:'Windows güncelleme CMD kurulum'});assert.equal(install.engine,'guide');assert.match(install.output,/DENTAYA_GUNCELLE_DERLE/);
let modelCalls=0;
const callModel=async()=>{modelCalls++;return {ok:true,output:'Gerçek motorun test yanıtı',references:[]};};
assert.equal((await resolveAyaReply({prompt:'Kanka selam'})).engine,'core');
assert.match((await resolveAyaReply({prompt:'konu dışı bilinmeyen bir şey yazdım'})).output,/Mesajını aldım/);
assert.match((await resolveAyaReply({prompt:'?'})).output,/Biraz daha/);
assert.match((await resolveAyaReply({prompt:'devam'})).output,/Hangi konuyu/);
const core=await resolveAyaReply({prompt:'Dentin nedir'});assert.equal(core.engine,'core');assert.equal(modelCalls,0);
for(const prompt of ['Dentin nedir','Yeni bir klinik açan arkadaşıma sıcak ve kısa bir davet yaz','Bunu daha kısa anlatır mısın','Az önce seçtiğimiz hedefle sıradaki işi planlayalım']){const reply=await resolveAyaReply({prompt},{callModel});assert.equal(reply.engine,'model');assert.equal(reply.output,'Gerçek motorun test yanıtı');}
assert.equal(modelCalls,4);
const noKnowledgeModel=await resolveAyaReply({prompt:'Dentin nedir',options:{useKnowledge:false}},{callModel});assert.equal(noKnowledgeModel.engine,'model');assert.equal(modelCalls,5);
const model=await resolveAyaReply({prompt:'Bir çalışma notu yaz'},{callModel});assert.equal(model.engine,'model');assert.equal(modelCalls,6);
const force=await resolveAyaReply({prompt:'Kısaca kendini tanıt',forceModel:true},{callModel});assert.equal(force.engine,'model');assert.equal(modelCalls,7);
const cancelled=await resolveAyaReply({prompt:'Yeni bir hikaye yaz'},{callModel:async()=>({ok:false,error:'LOCAL_CANCELLED'})});assert.ok(cancelled.cancelled);assert.equal(cancelled.warning,'LOCAL_CANCELLED');assert.match(cancelled.output,/konuşmada/);
for(const error of ['MODEL_MISSING','LOCAL_TIMEOUT','LOCAL_BUSY','LOCAL_EMPTY_RESPONSE','LOCAL_INVALID_PLAN']){const reply=await resolveAyaReply({prompt:'Konu dışı bir hikaye'},{callModel:async()=>({ok:false,error})});assert.equal(reply.engine,'core');assert.equal(reply.warning,error);assert.ok(reply.output);}
const rejected=await resolveAyaReply({prompt:'Bilinmeyen bir soru'},{callModel:async()=>{throw Error('network');}});assert.equal(rejected.warning,'LOCAL_ERROR');assert.ok(rejected.output);
const empty=await resolveAyaReply({prompt:'Bilinmeyen bir soru'},{callModel:async()=>({ok:true,output:'  '})});assert.equal(empty.warning,'LOCAL_EMPTY_RESPONSE');
// Basic identity is available without inference; ready models still receive all
// normal questions. Recover known basics when inference fails, without hiding it.
const basicPrompts=['Adın ne?','Amacın ne?','Merhaba AYA, adın ne ve amacın ne?','What is your name?'];
let basicModelCalls=0;
for(const prompt of basicPrompts){
 const offline=await resolveAyaReply({prompt,options:{useKnowledge:false}});assert.equal(offline.engine,'core');assert.doesNotMatch(offline.output,/eşleştiremedim/);
 const ready=await resolveAyaReply({prompt},{callModel:async()=>{basicModelCalls++;return {ok:true,output:'Model-first basic reply'};}});assert.equal(ready.engine,'model');
 for(const error of ['MODEL_MISSING','LOCAL_TIMEOUT','LOCAL_EMPTY_RESPONSE']){const recovered=await resolveAyaReply({prompt},{callModel:async()=>({ok:false,error})});assert.equal(recovered.engine,'core');assert.equal(recovered.warning,error);assert.doesNotMatch(recovered.output,/eşleştiremedim/);assert.match(recovered.output,/AYA Core/);}
}
assert.equal(basicModelCalls,basicPrompts.length);
const cancelledIdentity=await resolveAyaReply({prompt:'Adın ne?'},{callModel:async()=>({ok:false,error:'LOCAL_CANCELLED'})});assert.equal(cancelledIdentity.cancelled,true);assert.match(cancelledIdentity.output,/durdurdun/);assert.doesNotMatch(cancelledIdentity.output,/Adım AYA/);
for(const error of [new DOMException('Aborted','AbortError'),new Error('LOCAL_CANCELLED')]){const aborted=await resolveAyaReply({prompt:'Adın ne?'},{callModel:async()=>{throw error;}});assert.equal(aborted.cancelled,true);assert.equal(aborted.warning,'LOCAL_CANCELLED');assert.doesNotMatch(aborted.output,/Adım AYA/);}
const memory=await resolveAyaReply({prompt:'Sonraki adımı önceki hedefe göre düzenle'},{callModel:async()=>({ok:true,output:'Önce hedefimize uygun kayıt notunu tamamlayalım.',workingMemory:{goal:'Vakanın teslimini hazırla',decisions:['Teslim cuma günü'],openQuestions:['Hangi kurye?']}})});assert.deepEqual(memory.workingMemory,{goal:'Vakanın teslimini hazırla',decisions:['Teslim cuma günü'],openQuestions:['Hangi kurye?']});
const manualMemory={goal:'Teslimi cuma hazırla',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati?']};
const offlineMemory=await resolveAyaReply({prompt:'Önceki kararımız neydi?',workingMemory:manualMemory});assert.equal(offlineMemory.engine,'core');assert.match(offlineMemory.output,/Teslimi cuma hazırla/);assert.match(offlineMemory.output,/Önce prova kontrolü/);assert.match(offlineMemory.output,/Kurye saati/);
const emptyMemory=await resolveAyaReply({prompt:'Hedefimiz neydi?'});assert.match(emptyMemory.output,/kayıtlı hedef veya karar yok/);
const localMemory=await resolveAyaReply({prompt:'Hedefimiz neydi?',workingMemory:manualMemory},{callModel:async()=>({ok:true,output:'Modele iletilen hedef'})});assert.equal(localMemory.engine,'model','A ready model retains priority even for memory queries.');
const failedMemory=await resolveAyaReply({prompt:'Sonra ne yapalım'},{callModel:async()=>({ok:false,error:'LOCAL_INVALID_PLAN'})});assert.equal(failedMemory.workingMemory,undefined,'A failed plan must not replace the current working memory');
const disabled=await resolveAyaReply({prompt:'Dentin nedir',options:{useKnowledge:false}});assert.equal(disabled.references.length,0);assert.ok(!disabled.output.includes('mine ve kök'));
const safety=await resolveAyaReply({prompt:'Dişim şişti nefes alamıyorum',forceModel:true},{callModel});assert.match(safety.output,/acil/);assert.equal(modelCalls,7);
assert.match((await resolveAyaReply({prompt:'implant üstü diş gelmiyor',cadContext:{...context,marginPoints:0}})).output,/Geçerli bir kole/);
assert.match((await resolveAyaReply({prompt:'implant üstü diş gelmiyor',cadContext:context})).output,/Koleye yerleştir/);
assert.match((await resolveAyaReply({prompt:'kaydet ve çık',cadContext:{...context,saveFailed:true}})).output,/Yerel kaydet ve çık/);
assert.match((await resolveAyaReply({prompt:'implant nedir',cadContext:context})).output,/tıbbi cihaz/);
assert.match((await resolveAyaReply({prompt:'Kapanış nedir',cadContext:context})).output,/kayıtlı ilişkisini/);
assert.match((await resolveAyaReply({prompt:'Kapanış',cadContext:{...context,upperReady:false,lowerReady:false}})).output,/Antagonist/);
const notebook=await resolveAyaReply({prompt:'Kurye saatimiz kaç',knowledge:[{id:'kurye',title:'Kurye saati',content:'Kurye 16:40 saatinde gelir.',kind:'memory'}]});assert.match(notebook.output,/16:40/);assert.equal(notebook.references[0].id,'knowledge-kurye');
const record=await resolveAyaReply({prompt:'STL nedir'});const next=await resolveAyaReply({prompt:'peki nasıl kontrol ederim',history:[{role:'user',content:'STL nedir'},{role:'assistant',content:record.output,engine:record.engine,references:record.references}],options:DEFAULT_AYA_OPTIONS});assert.equal(next.references[0].id,'aya-qa-scan-stl-check');
// A failed local inference still leaves the live, typed CAD helper available.
// Cancellation/context changes are final; none of these mocked calls execute tools.
const scopedCad={...context,scope:'project:scan:unit46',snapshot:'current-snapshot',dataToken:'current-geometry',task:'margin',availableTools:['place','tool-margin','inspect','save','show-all']};
for(const error of ['MODEL_MISSING','LOCAL_TIMEOUT','LOCAL_BUSY','LOCAL_INVALID_PLAN','LOCAL_EMPTY_RESPONSE']){
 const recovered=await resolveAyaReply({prompt:'Modelin üstüne kron yapalım.',cadContext:scopedCad,workingMemory:manualMemory},{callModel:async()=>({ok:false,error})});
 assert.equal(recovered.engine,'core');assert.equal(recovered.warning,error);assert.equal(recovered.proposals?.[0]?.tool,'place');assert.equal(recovered.proposals[0].scope,scopedCad.scope);assert.equal(recovered.proposals[0].snapshot,scopedCad.snapshot);assert.match(recovered.output,/AYA Core/);assert.equal(recovered.workingMemory,undefined);
}
const noMargin=await resolveAyaReply({prompt:'Modelin üstüne kron yapalım.',cadContext:{...scopedCad,marginPoints:0}},{callModel:async()=>({ok:false,error:'LOCAL_ERROR'})});assert.equal(noMargin.proposals?.[0]?.tool,'tool-margin');
const saveFailure=await resolveAyaReply({prompt:'Güncel çalışma durumunu değerlendir.',cadContext:{...scopedCad,saveFailed:true}},{callModel:async()=>({ok:false,error:'LOCAL_BUSY'})});assert.equal(saveFailure.proposals?.[0]?.tool,'save');assert.match(saveFailure.output,/Son kayıt başarısız/);
for(const error of ['LOCAL_CANCELLED','LOCAL_CONTEXT_CHANGED']){
 const halted=await resolveAyaReply({prompt:'Modelin üstüne kron yapalım.',cadContext:scopedCad},{callModel:async()=>({ok:false,error})});assert.equal(halted.warning,error);assert.equal(halted.proposals,undefined);
}
let liveCadModelCalls=0;
const priority=await resolveAyaReply({prompt:'Modelin üstüne kron yapalım.',cadContext:scopedCad},{callModel:async()=>{liveCadModelCalls++;return {ok:true,output:'Fresh model reply'};}});assert.equal(priority.engine,'model');assert.equal(liveCadModelCalls,1);
const cadHistory=[{role:'user' as const,content:'Güncel çalışma durumunu değerlendir.',cadScope:scopedCad.scope},{role:'assistant' as const,engine:'core' as const,content:'Previous CAD advice',cadScope:scopedCad.scope}];
const cadFollowup=await resolveAyaReply({prompt:'Peki şimdi?',cadContext:scopedCad,history:cadHistory});assert.equal(cadFollowup.proposals?.[0]?.tool,'place');
const recoveredFollowup=await resolveAyaReply({prompt:'Peki şimdi?',cadContext:scopedCad,history:cadHistory},{callModel:async()=>({ok:false,error:'LOCAL_TIMEOUT'})});assert.equal(recoveredFollowup.proposals?.[0]?.tool,'place');assert.equal(recoveredFollowup.warning,'LOCAL_TIMEOUT');
await assert.rejects(()=>resolveAyaReply({prompt:' '}),/INVALID_PROMPT/);await assert.rejects(()=>resolveAyaReply({prompt:'a'.repeat(8001)}),/INVALID_PROMPT/);
console.log('PASS: model-first definitions/new phrasings/followups, working-memory transfer, honest Core/model labels, offline guide, forced model path, cancellation/timeout/busy/invalid plan, preferences, notebook, clinical safety and actual CAD metadata (mock model calls only).');
