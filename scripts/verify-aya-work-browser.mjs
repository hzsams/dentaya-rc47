import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(root,'src/app/rc50-aya-work-preview');
const port=3061,url=`http://127.0.0.1:${port}/rc50-aya-work-preview`;
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const goal='Cuma teslimini hazırla',decision='Önce prova kontrolü',question='Kurye saati?';
const memoryCommand=`Hedefimiz: ${goal}\nKarar: ${decision}\nAçık soru: ${question}`;
const screenshots=[],timings={},started=Date.now(),errors=[];
let server,browser,logs='',exitCode=null,routeOwned=false;
async function stopServer(){
 const current=server;server=null;
 if(!current||current.exitCode!==null||current.signalCode)return;
 await new Promise(resolve=>{
  const timeout=setTimeout(()=>current.kill('SIGKILL'),5000);
  current.once('exit',()=>{clearTimeout(timeout);resolve();});current.kill('SIGTERM');
 });
}

try{
 let oldRoute;
 try{oldRoute=await fs.lstat(route);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(oldRoute){
  assert.ok(oldRoute.isDirectory()&&!oldRoute.isSymbolicLink(),'Refusing to replace a non-fixture route');
  const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');assert.ok(old.includes('RC50 AYA work browser verification fixture'),'Refusing to overwrite a user route');
 }
 routeOwned=true;
 await fs.mkdir(route,{recursive:true});
 await fs.copyFile(path.join(root,'scripts/fixtures/rc50-aya-work.tsx'),path.join(route,'page.tsx'));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{
  cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe'],
 });
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-24000);});
 server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let ready=false;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
 assert.ok(ready,logs);timings.startupMs=Date.now()-started;
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 function watch(page){page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/hydration|maximum update depth|unique "key"/i.test(message.text()))errors.push(message.text());});}
 async function screenshot(locator,name){if(!process.env.DENTAYA_SCREENSHOT_DIR)return;await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});const target=path.join(process.env.DENTAYA_SCREENSHOT_DIR,name);await locator.screenshot({path:target,animations:'disabled'});screenshots.push(target);}
 async function waitForFixture(page){await page.waitForFunction(()=>{const input=document.querySelector('#aya-local-message');return Boolean(window.rc50Work&&input&&!input.disabled);});}
 async function ask(page,scope,prompt,cad=false){
  const selector=cad?'.cad-aya-messages article':'.aya-message--assistant';
  const count=await scope.locator(selector).count();
  const composer=scope.locator(cad?'.cad-aya-panel>form':'.aya-chat-composer');
  await composer.locator('textarea').fill(prompt);await composer.locator('button[type=submit]').click();
  const reply=scope.locator(selector).nth(count+(cad?1:0));await reply.waitFor();
  await page.waitForFunction(cad=>{const input=document.querySelector(cad?'#cad-test .cad-aya-panel>form textarea':'#aya-local-message');return input&&!input.disabled;},cad);
  return reply;
 }
 async function inspectMemory(page,main){
  await main.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();
  await main.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();
  const memory=main.locator('.aya-working-memory');
  assert.match(await memory.textContent(),new RegExp(goal));
  assert.match(await memory.textContent(),new RegExp(decision));
  assert.ok((await memory.textContent()).includes(question),'The open question is visible in working memory');
  await main.locator('#aya-conversation-settings').press('Escape');
 }
 const page=await browser.newPage({viewport:{width:1280,height:940}});watch(page);
 const offlineStarted=Date.now();
 await page.goto(url);await waitForFixture(page);
 const main=page.locator('#main-test');
 await ask(page,main,memoryCommand);await inspectMemory(page,main);
 const recalled=await (await ask(page,main,'Hedefimiz neydi?')).textContent();
 assert.ok(recalled.includes(goal),'Explicitly recorded goal is recalled without a model');
 assert.ok(recalled.includes(decision),'Recall retains the recorded decision');
 const compound=await (await ask(page,main,'12 cm kaç mm? Ardından teslim notu taslağı hazırla')).textContent();
 assert.match(compound,/120\s*mm/i,'The first requested step converts centimetres to millimetres');
 assert.ok(compound.includes(goal),'The delivery draft uses the recorded goal');
 assert.ok(compound.includes(decision),'The delivery draft uses the recorded decision');
 assert.match(compound,/\bCore\b/,'Offline tasks identify the actual Core engine');
 await screenshot(main.locator('.aya-conversation-shell'),'AYA_RC50_memory_and_multistep.png');
 await main.getByRole('button',{name:'Yeni sohbet',exact:true}).click();
 assert.equal(await main.locator('.aya-message').count(),0,'New conversation clears the displayed conversation');
 const reset=await (await ask(page,main,'Hedefimiz neydi?')).textContent();
 assert.ok(!reset.includes(goal)&&!reset.includes(decision),'A new conversation cannot recall the preceding working memory');
 await ask(page,main,memoryCommand);
 await page.evaluate(()=>window.rc50Work.saveAyaOptions({saveHistory:true}));
 await page.waitForFunction(goal=>window.rc50Work.readAyaState().sessions[0]?.workingMemory?.goal===goal,goal);
 await page.reload();await waitForFixture(page);
 await main.locator('.aya-goal-preview').waitFor();await inspectMemory(page,main);
 const restored=await (await ask(page,main,'Hedefimiz neydi?')).textContent();
 assert.ok(restored.includes(goal)&&restored.includes(decision)&&restored.includes(question),'History opt-in restores explicit memory after a browser reload');
 timings.offlineMemoryAndTasksMs=Date.now()-offlineStarted;

 const cadStarted=Date.now(),cad=page.locator('#cad-test');
 await ask(page,cad,memoryCommand,true);
 await cad.locator('.cad-aya-context>summary').click();
 await cad.locator('.aya-working-memory>summary').click();
 const cadMemory=await cad.locator('.aya-working-memory').textContent();
 assert.ok(cadMemory.includes(goal)&&cadMemory.includes(decision)&&cadMemory.includes(question),'The CAD panel records the same explicit memory command');
 await cad.locator('.cad-aya-context>summary').click();
 const cadRecall=await (await ask(page,cad,'Hedefimiz neydi?',true)).textContent();
 assert.ok(cadRecall.includes(goal)&&cadRecall.includes(decision),'The CAD conversation recalls its own recorded working memory');
 const placement=await ask(page,cad,'Sıradaki adım ne?',true);
 const proposal=placement.locator('[data-proposal-tool="place"]');
 await proposal.waitFor();assert.equal(await proposal.locator('button').isDisabled(),false,'The valid current placement proposal is available to apply');
 assert.deepEqual(await page.evaluate(()=>window.rc50Work.actions),[],'A CAD question must not invoke a host command');
 assert.equal(await page.evaluate(()=>window.rc50Work.getContext().placed),false,'A placement suggestion cannot change placement state');
 await screenshot(cad,'AYA_RC50_offline_place_proposal.png');
 await proposal.getByRole('button',{name:'Uygula',exact:true}).click();
 await page.waitForFunction(()=>window.rc50Work.getContext().placed===true);
 assert.deepEqual(await page.evaluate(()=>window.rc50Work.actions),['place'],'Apply invokes the typed placement callback once');
 assert.equal(await proposal.locator('button').isDisabled(),true,'The old proposal is disabled after its workspace snapshot changes');
 assert.match(await cad.locator('.cad-aya-messages article').last().textContent(),/Sentetik yerleştirme callback’i tamamlandı/,'The result comes from the callback');
 const noAntagonist=await ask(page,cad,'Antagonist temas kontrolünü yapabilir miyiz?',true);
 const noAntagonistText=await noAntagonist.textContent();
 assert.match(noAntagonistText,/antagonist/i);
 assert.match(noAntagonistText,/yok|yüklü değil|yüklenmemiş|eksik/i,'Missing antagonist evidence is stated');
 assert.doesNotMatch(noAntagonistText,/\b\d+(?:[.,]\d+)?\s*mm\b|\d+\s*(?:çakışma|collision)|su geçirmez/i,'Without a report, the assistant must not invent geometric metrics');
 assert.equal(await noAntagonist.locator('[data-proposal-tool="view-contact"]').count(),0,'An unavailable antagonist tool cannot be proposed');
 const save=await ask(page,cad,'Kaydet ve çık',true);
 const saveProposal=save.locator('[data-proposal-tool="save-exit"]');await saveProposal.waitFor();
 assert.deepEqual(await page.evaluate(()=>window.rc50Work.actions),['place'],'A save proposal requires its own Apply click');
 await saveProposal.getByRole('button',{name:'Uygula',exact:true}).click();
 await page.waitForFunction(()=>window.rc50Work.getContext().saveFailed===true);
 const failed=await cad.locator('.cad-aya-messages article').last().textContent();
 assert.match(failed,/Tamamlanamadı/);assert.match(failed,/kaydedilemedi/);
 assert.doesNotMatch(failed,/başarıyla kaydedildi|CAD projesi kaydedildi\./);
 assert.equal(await cad.locator('.cad-aya-panel').isVisible(),true,'A failed save leaves the CAD panel open');
 assert.equal(await page.evaluate(()=>window.rc50Work.getContext().unsaved),true,'A failed save keeps unsaved state');
 assert.deepEqual(await page.evaluate(()=>window.rc50Work.actions),['place','save-exit'],'There are no automatic follow-up CAD actions');
 await screenshot(cad,'AYA_RC50_callback_failure_and_stale_proposal.png');
 // A later manual host save supersedes an older failed AYA save event.
 await page.evaluate(()=>window.rc50Work.setContext(c=>({...c,saveFailed:false,unsaved:false,snapshot:'rc54-after-manual-save'})));
 const current=await ask(page,cad,'Güncel çalışma durumunu değerlendir ve sıradaki adımı öner.',true);
 assert.doesNotMatch(await current.textContent(),/Son kayıt başarısız|Sentetik kayıt başarısız/,'Historical callback text cannot override current successful host save state');
 assert.equal(await page.evaluate(()=>window.rc50Work.getContext().unsaved),false);
 const now=await ask(page,cad,'Peki şimdi?',true);assert.equal(await now.locator('[data-proposal-tool="inspect"]').count(),1,'A short scoped CAD follow-up evaluates fresh state');
 await page.evaluate(()=>window.rc50Work.setContext(c=>({...c,snapshot:'rc56-after-manual-sculpt',dataToken:'rc56-new-geometry',report:null})));
 const changed=await ask(page,cad,'Sonuç nasıl?',true);assert.match(await changed.textContent(),/güncel geometri kontrolü yok/);assert.equal(await changed.locator('[data-proposal-tool="inspect"]').count(),1,'A geometry change needs a new check instead of repeating historic findings');
 assert.deepEqual(await page.evaluate(()=>window.rc50Work.actions),['place','save-exit'],'Conversational follow-ups never invoke CAD callbacks');
 await screenshot(cad,'AYA_RC56_scoped_followup.png');
 const previousUnit=await page.evaluate(()=>window.rc50Work.getContext());
 // Match the actual DesignStudioClient scope key so each unit has its own panel session.
 await page.evaluate(()=>window.rc50Work.setContext(c=>({...c,unit:'47',scope:'rc56-synthetic-project/source/unit-47',snapshot:'rc56-unit47',dataToken:'rc56-unit47-geometry',placed:false,availableTools:['place','inspect']})));
 await page.waitForFunction(()=>window.rc50Work.getContext().unit==='47');
 const otherUnit=await ask(page,cad,'Peki şimdi?',true);assert.equal(await otherUnit.locator('[data-proposal-tool]').count(),0,'Another unit cannot infer a follow-up target from the previous unit');
 const otherMemory=await ask(page,cad,'Hedefimiz neydi?',true);assert.ok(!(await otherMemory.textContent()).includes(goal),'The new unit does not inherit the previous goal');
 await page.evaluate(context=>window.rc50Work.setContext(()=>context),previousUnit);await page.waitForFunction(()=>window.rc50Work.getContext().unit==='46');
 const returnedMemory=await ask(page,cad,'Hedefimiz neydi?',true);assert.ok((await returnedMemory.textContent()).includes(goal),'Returning to the original unit restores its own working memory');
 timings.offlineCadMs=Date.now()-cadStarted;

 const modelStarted=Date.now(),modelPage=await browser.newPage({viewport:{width:1280,height:940}});watch(modelPage);
 await modelPage.addInitScript(()=>{
  const state=window.rc50Model={calls:[],error:''};
  window.dentayaDesktop={
   onOpenPreferences:()=>()=>{},
   localAyaStatus:async()=>({ok:true,models:[{name:'rc50-synthetic-local-model',size:1000}],progress:{running:false,status:'ready',completed:0,total:0}}),
   onLocalAyaToken:()=>()=>{},
   localAyaChat:async input=>{state.calls.push(input);if(state.error)return {ok:false,error:state.error};return {ok:true,output:'Sentetik yerel model yanıtı: çalışma bağlamı alındı.',references:[],workingMemory:input.workingMemory};},
   localAyaCancel:async()=>({ok:true}),
  };
 });
 await modelPage.goto(url);await waitForFixture(modelPage);await modelPage.waitForFunction(()=>document.querySelector('.aya-status--model'));
 const modelMain=modelPage.locator('#main-test');
 await ask(modelPage,modelMain,memoryCommand);await inspectMemory(modelPage,modelMain);
 assert.equal(await modelPage.evaluate(()=>window.rc50Model.calls.length),0,'An explicit memory command is applied directly even when a local model is ready');
 await ask(modelPage,modelMain,'Dentin hakkında yeni bir açıklama hazırla');
 assert.equal(await modelPage.evaluate(()=>window.rc50Model.calls.length),1,'A normal new request still reaches the ready local model');
 assert.deepEqual(await modelPage.evaluate(()=>window.rc50Model.calls[0].workingMemory),{goal,decisions:[decision],openQuestions:[question]},'The model receives the memory the user explicitly recorded');
 assert.equal(await modelPage.evaluate(()=>window.rc50Model.calls[0].agent),true);
 assert.match(await modelMain.locator('.aya-message--assistant').last().textContent(),/Sentetik yerel model yanıtı/);
 await screenshot(modelMain.locator('.aya-conversation-shell'),'AYA_RC50_model_receives_explicit_memory.png');
 await modelMain.getByRole('button',{name:'Yeni sohbet',exact:true}).click();
 await ask(modelPage,modelMain,'Bağımsız yeni çalışma için kısa bir öneri yaz');
 assert.deepEqual(await modelPage.evaluate(()=>window.rc50Model.calls.at(-1).workingMemory),{goal:'',decisions:[],openQuestions:[]},'A new conversation sends empty memory to the model');
 const modelCad=modelPage.locator('#cad-test');await modelCad.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 await modelPage.evaluate(()=>{window.rc50Model.error='LOCAL_TIMEOUT';});
 const recoveredCad=await ask(modelPage,modelCad,'Modelin üstüne kron yapalım.',true);assert.match(await recoveredCad.textContent(),/AYA Core/);
 const fallbackPlace=recoveredCad.locator('[data-proposal-tool="place"]');await fallbackPlace.waitFor();assert.deepEqual(await modelPage.evaluate(()=>window.rc50Work.actions),[],'Model failure keeps placement as an explicit suggestion');
 await screenshot(modelCad,'AYA_RC56_model_failure_cad_help.png');
 await fallbackPlace.getByRole('button',{name:'Uygula',exact:true}).click();await modelPage.waitForFunction(()=>window.rc50Work.getContext().placed===true);assert.deepEqual(await modelPage.evaluate(()=>window.rc50Work.actions),['place']);
 await modelPage.evaluate(()=>{window.rc50Model.error='';});const callsBefore=await modelPage.evaluate(()=>window.rc50Model.calls.length);
 const restoredModel=await ask(modelPage,modelCad,'Peki şimdi?',true);assert.match(await restoredModel.textContent(),/Sentetik yerel model yanıtı/);assert.equal(await modelPage.evaluate(()=>window.rc50Model.calls.length),callsBefore+1,'A recovered ready model keeps priority over Core follow-up handling');
 timings.readyModelMs=Date.now()-modelStarted;
 assert.deepEqual(errors,[],'The real conversation components run without page, hydration, or React errors');
 await browser.close();browser=null;
 await stopServer();
 rmSync(route,{recursive:true,force:true});rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});
 assert.equal(existsSync(route),false);timings.totalMs=Date.now()-started;
 console.log(JSON.stringify({pass:true,explicitMemoryInRealChat:true,memoryRecallAndNewConversation:true,historyOptInReload:true,multistepConversionAndMemoryDraft:true,offlineTypedCadProposal:true,applyRequired:true,staleProposalDisabled:true,callbackFailurePreserved:true,manualSaveSupersedesHistoricalFailure:true,scopedCadFollowups:true,changedGeometryRequiresCurrentCheck:true,crossUnitFollowupAndMemoryBoundaries:true,failedModelRetainsApplyOnlyCadHelp:true,recoveredModelRetainsPriority:true,noInventedGeometryMetrics:true,readyModelReceivesExplicitMemory:true,modelCallsAreMock:true,cadCallbacksAreSynthetic:true,realGeometryValidated:false,timings,screenshots},null,2));
}catch(error){console.error(logs.slice(-14000));throw error;}finally{
 await browser?.close();
 await stopServer();
 if(routeOwned){rmSync(route,{recursive:true,force:true});rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});}
}
