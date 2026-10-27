import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),route=path.join(root,'src/app/rc46-preview');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const url='http://127.0.0.1:3056/rc46-preview';
try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');assert.ok(old.includes('RC46 browser verification fixture'),'Refusing to overwrite a user route');}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.mkdir(route,{recursive:true});await fs.copyFile(path.join(root,'scripts/fixtures/rc46-conversation.tsx'),path.join(route,'page.tsx'));
let server,browser,logs='',exitCode=null;
const errors=[];
async function stopServer(){
 if(!server||server.exitCode!==null||server.signalCode)return;
 await new Promise(resolve=>{const timeout=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timeout);resolve();});server.kill('SIGTERM');});
}
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3056'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',d=>{logs=(logs+d).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let ready=false;while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:940}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/hydration|Maximum update depth|unique "key"/.test(m.text()))errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.rc46Fixture);await page.waitForFunction(()=>!document.querySelector('#aya-local-message')?.disabled);
 const main=page.locator('#main-test'),textarea=main.locator('#aya-local-message');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await main.locator('.aya-conversation-shell').screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'AYA_conversation_desktop.png'),animations:'disabled'});}
 assert.equal(await main.locator('.aya-prompts button').count(),0,'The primary conversation is not a menu of canned questions');
 async function ask(prompt,scope=main){const replies=scope===main?scope.locator('.aya-message--assistant'):scope.locator('.cad-aya-messages article').filter({hasNot:page.getByText('Siz',{exact:true})}),composer=scope.locator(scope===main?'.aya-chat-composer':'.cad-aya-panel>form');const count=await replies.count();await composer.locator('textarea').fill(prompt);await composer.locator('button[type=submit]').click();await replies.nth(count).waitFor();if(scope===main)await page.waitForFunction(()=>!document.querySelector('#aya-local-message')?.disabled);return replies.last();}
 async function unavailable(prompt,scope=main){const cad=scope!==main,selector=cad?'.cad-aya-messages article':'.aya-message--assistant',composer=scope.locator(cad?'.cad-aya-panel>form':'.aya-chat-composer');const count=await scope.locator(selector).count();await composer.locator('textarea').fill(prompt);await composer.locator('button[type=submit]').click();await scope.locator('[role=alert]').waitFor();await page.waitForFunction(cad=>!document.querySelector(cad?'#cad-test .cad-aya-panel>form textarea':'#aya-local-message')?.disabled,cad);assert.equal(await scope.locator(selector).count(),count+(cad?1:0),'Missing inference produces a user turn and error, never a fabricated assistant');assert.equal(await composer.locator('textarea').inputValue(),prompt);}
 for(const prompt of ['Adın ne ve amacın ne?','Mavi bir gezegen hakkında, daha önce duyulmamış bir masal yaz.','12 cm kaç mm?'])await unavailable(prompt);
 assert.equal(await main.locator('#aya-conversation-settings').count(),0,'Settings stay closed while the composer is ready');
 await main.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();
 const settings=main.locator('#aya-conversation-settings');await settings.waitFor();
 await page.waitForFunction(()=>document.activeElement?.id==='aya-conversation-settings');assert.equal(await settings.evaluate(node=>document.activeElement===node),true,'Opening settings moves keyboard focus into the panel');
 assert.equal(await settings.locator('#aya-response-mode').count(),0,'A stale persisted Core switch cannot silently replace model conversation');
 assert.equal(await settings.getByRole('button',{name:'Soru kütüphanesi',exact:true}).count(),0,'The primary settings do not present a canned-question chat');
 await settings.press('Escape');
 await ask('Hedefimiz: Cuma teslimine hazırlan\nKarar: Önce prova kontrolü');
 assert.match(await main.locator('.aya-goal-preview').textContent(),/Cuma teslimine hazırlan/,'Explicit memory controls remain available without inference');
 await page.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:true}));await page.waitForFunction(()=>window.rc46Fixture.readAyaState().sessions.length===1);await page.reload();await main.locator('.aya-goal-preview').waitFor();assert.match(await main.locator('.aya-goal-preview').textContent(),/Cuma teslimine hazırlan/);await page.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:false}));
 const cad=page.locator('#cad-test');await unavailable('implant üstü diş gelmiyor',cad);
 await cad.getByRole('combobox',{name:'Yanıt kaynağı',exact:true}).selectOption('guide');
 assert.match(await (await ask('implant üstü diş gelmiyor',cad)).textContent(),/Koleye yerleştir/);
 await page.evaluate(()=>window.rc46Fixture.setContext(c=>({...c,marginPoints:0})));assert.match(await (await ask('implant diş gelmiyor',cad)).textContent(),/Geçerli bir kole/);
 await page.evaluate(()=>window.rc46Fixture.setContext(c=>({...c,saveFailed:true})));assert.match(await (await ask('kaydet ve çık',cad)).textContent(),/Yerel kaydet ve çık/);
 assert.deepEqual(await page.evaluate(()=>window.rc46Fixture.actions),[],'Even explicitly selected guide replies cannot perform CAD actions');
 await page.setViewportSize({width:390,height:844});await textarea.scrollIntoViewIfNeeded();assert.ok(await main.evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));assert.equal(await textarea.isDisabled(),false);
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC61_AYA_unavailable_mobile.png'),animations:'disabled'});}
 const modelPage=await browser.newPage({viewport:{width:1280,height:940}});modelPage.on('pageerror',e=>errors.push(e.message));
 await modelPage.addInitScript(()=>{
  const state=window.rc46Model={calls:[],mode:'ok',pending:null,pendingMemory:null,memoryMode:'ok',memoryCancelAcknowledges:true,token:null,cancelAcknowledges:true,error:'LOCAL_TIMEOUT'};
  window.dentayaDesktop={
   onOpenPreferences:()=>()=>{},
   localAyaStatus:async()=>({ok:true,models:[{name:'test-local-model',size:1000}],progress:{running:false,status:'ready',completed:0,total:0}}),
   onLocalAyaToken:fn=>{state.token=fn;return()=>{state.token=null;};},
   localAyaChat:async input=>{
    state.calls.push(input);
    if(input.task==='memory'){if(state.memoryMode==='error')return {ok:false,error:'LOCAL_INVALID_PLAN'};if(state.memoryMode==='pending')return new Promise(resolve=>{state.pendingMemory=resolve;});return {ok:true,output:'Memory extraction only',workingMemory:input.workingMemory?.goal?input.workingMemory:{goal:'Cuma teslimine hazırlan',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati?']}};}
    if(state.mode==='error')return {ok:false,error:state.error};
    if(state.mode==='pending')return new Promise(resolve=>{state.pending=resolve;});
    const workingMemory=input.prompt.startsWith('Kısaca kendini tanıt')?{goal:'YALNIZ MOTOR TESTİNİN HEDEFİ',decisions:['KULLANICI KARARINI EZMEMELİ'],openQuestions:[]}:input.workingMemory?.goal?input.workingMemory:{goal:'Cuma teslimine hazırlan',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati?']};
    return {ok:true,output:input.prompt.startsWith('Kısaca kendini tanıt')?'Yerel model test cevabı · yalnız motor kontrolü':'Yerel model test cevabı',references:[{id:'fact:synthetic',title:'Kaynaklı yüzey kontrolü',href:'HTTPS://threejs.org/docs/#api/en/core/BufferGeometry'},{id:'aya-qa-dentin-definition',title:'MODELİN UYDURDUĞU BAŞLIK KAYNAK DEĞİLDİR',href:'/ai#aya-catalog'},{id:'aya-qa-this-record-does-not-exist',title:'Olmayan kaynak kaydı',href:'/ai#aya-catalog'},{id:'unsafe',title:'Unsafe',href:'javascript:alert(1)'}],workingMemory};
   },
   localAyaCancel:async()=>{if(state.pendingMemory&&state.memoryCancelAcknowledges){state.pendingMemory({ok:false,error:'LOCAL_CANCELLED'});state.pendingMemory=null;}if(!state.cancelAcknowledges)return new Promise(()=>{});state.pending?.({ok:false,error:'LOCAL_CANCELLED'});state.pending=null;return {ok:true};}
  };
 });
 await modelPage.goto(url);await modelPage.waitForFunction(()=>document.querySelector('.aya-status--model'));
 const modelMain=modelPage.locator('#main-test'),modelText=modelMain.locator('#aya-local-message');
 const normalCalls=()=>modelPage.evaluate(()=>window.rc46Model.calls.filter(call=>call.task!=='memory'));
 async function lastCall(){return (await normalCalls()).at(-1);}
 async function askModel(prompt){const count=await modelMain.locator('.aya-message--assistant').count();await modelText.fill(prompt);await modelMain.locator('form button[type=submit]').click();await modelMain.locator('.aya-message--assistant').nth(count).waitFor();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);return modelMain.locator('.aya-message--assistant').last();}
 assert.match(await (await askModel('Dentin nedir')).textContent(),/Yerel model test cevabı/);
 const refs=modelMain.locator('.aya-message--assistant').last().locator('.aya-sources'),externalRef=refs.locator(':scope > ul > li > a');
 assert.equal(await externalRef.count(),1,'Unsafe references are rejected before rendering');
 assert.equal(await refs.evaluate(node=>node.open),false,'References remain collapsed until requested');
 await refs.locator(':scope > summary').click();
 assert.equal(await externalRef.getAttribute('href'),'HTTPS://threejs.org/docs/#api/en/core/BufferGeometry');
 assert.equal(await externalRef.getAttribute('target'),'_blank');
 assert.match(await externalRef.getAttribute('rel'),/noopener/);
 assert.equal((await normalCalls()).length,1,'Definitions reach the ready model');
 assert.deepEqual(await modelPage.evaluate(()=>{const x=window.rc46Model.calls[0];return {agent:x.agent,prompt:x.prompt,memory:x.workingMemory};}),{agent:false,prompt:'Dentin nedir',memory:{goal:'',decisions:[],openQuestions:[]}});
 await modelMain.locator('.aya-goal-preview').filter({hasText:'Cuma teslimine hazırlan'}).waitFor();
 // The exact cited committed QA opens as a read-only source, outside model chat.
 const cited=refs.locator('[data-aya-reference="dentin-definition"]');
 assert.equal(await cited.evaluate(node=>node.open),false,'The trusted QA entry stays collapsed until requested');
 await modelText.fill('Kaynağa bakarken henüz göndermediğim taslak');
 const beforeSource={messages:await modelMain.locator('.aya-message').count(),calls:await modelPage.evaluate(()=>window.rc46Model.calls.length),memory:await modelMain.locator('.aya-goal-preview').textContent(),stored:await modelPage.evaluate(()=>window.rc46Fixture.readAyaState()),url:modelPage.url()};
 await cited.locator(':scope > summary').click();
 assert.match(await cited.locator(':scope > summary').textContent(),/Dentin dokusu nedir\?/);assert.match(await cited.locator('[data-user-content]').textContent(),/Dentin, mine ve kök yüzeyinin altında bulunan sert diş dokusudur\./);
 assert.match(await cited.locator('.aya-reference-note').textContent(),/Türkçe eğitim başvurusudur; model yanıtı değildir/);assert.doesNotMatch(await refs.textContent(),/MODELİN UYDURDUĞU BAŞLIK/,'The expanded source is resolved from the committed catalogue rather than model-supplied prose');
 assert.equal(await cited.getByRole('link',{name:/ADA · Tooth anatomy/}).getAttribute('href'),'https://www.mouthhealthy.org/all-topics-a-z/tooth');
 const missing=refs.locator(':scope > ul > li').filter({hasText:'Olmayan kaynak kaydı'});assert.equal(await missing.locator('a,summary').count(),0,'An unknown catalogue ID cannot create a fabricated source or navigation link');
 assert.equal(await modelMain.locator('.aya-message').count(),beforeSource.messages);assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.length),beforeSource.calls,'Reading a cited QA does not invoke the model');assert.equal(await modelMain.locator('.aya-goal-preview').textContent(),beforeSource.memory);assert.deepEqual(await modelPage.evaluate(()=>window.rc46Fixture.readAyaState()),beforeSource.stored,'Read-only evidence does not modify saved messages or memory');assert.equal(await modelText.inputValue(),'Kaynağa bakarken henüz göndermediğim taslak');assert.equal(modelPage.url(),beforeSource.url,'The exact source expands in place without navigation');
 if(process.env.DENTAYA_SCREENSHOT_DIR)await modelMain.locator('.aya-conversation-shell').screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC61_AYA_Cited_QA_Readonly.png'),animations:'disabled'});
 await askModel('Bunu cuma teslim planımızı düşünerek iki adıma indir');
 const followup=await lastCall();
 assert.equal(followup.workingMemory.goal,'Cuma teslimine hazırlan');assert.deepEqual(followup.workingMemory.decisions,['Önce prova kontrolü']);assert.equal(followup.history[0].content,'Dentin nedir');
 // Notebook opt-in is independent from transient conversation memory.
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaKnowledge([{id:'synthetic',title:'Kurye',kind:'memory',content:'Kurye 16:40.'}],false));
 await askModel('Kurye için planı yeniden yaz');
 assert.deepEqual(await modelPage.evaluate(()=>{const x=window.rc46Model.calls.filter(call=>call.task!=='memory').at(-1);return {useMemory:x.useMemory,knowledge:x.knowledge};}),{useMemory:false,knowledge:[]});
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaKnowledge([{id:'synthetic',title:'Kurye',kind:'memory',content:'Kurye 16:40.'}],true));
 await askModel('Kurye bilgisini kullanarak devam et');
 assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.filter(call=>call.task!=='memory').at(-1).knowledge[0].content),'Kurye 16:40.');
 const unsentDraft='  Henüz göndermediğim vaka sorusu\nÖnce kontrol edeceğim.  ';
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:true,useNote:true,note:'ÖZEL ÇALIŞMA NOTU'}));
 await modelPage.waitForFunction(()=>window.rc46Fixture.readAyaState().sessions[0]?.workingMemory?.goal==='Cuma teslimine hazırlan');
 const workBeforeDiagnostics=await modelPage.evaluate(()=>{const session=window.rc46Fixture.readAyaState().sessions[0];return {messages:session.messages,memory:session.workingMemory};});
 async function assertDiagnosticIsolation(){
  const request=await lastCall();
  assert.deepEqual(request.history,[],'Engine diagnostics never receive conversation history');
  assert.deepEqual(request.workingMemory,{goal:'',decisions:[],openQuestions:[]},'Engine diagnostics never receive the work goal or decisions');
  assert.deepEqual(request.knowledge,[]);assert.equal(request.useMemory,false,'Engine diagnostics do not retrieve the personal notebook');
  assert.equal(request.options.useKnowledge,false);assert.equal(request.options.useNote,false);assert.equal(request.options.note,'','The personal work note is omitted from engine diagnostics');
  assert.deepEqual(await modelPage.evaluate(()=>{const session=window.rc46Fixture.readAyaState().sessions[0];return {messages:session.messages,memory:session.workingMemory};}),workBeforeDiagnostics,'Success, failure, retry and cancellation of an engine check cannot alter stored work');
  assert.match(await modelMain.locator('.aya-goal-preview').textContent(),/Cuma teslimine hazırlan/,'The live work goal survives diagnostics');
 }
 await modelText.fill(unsentDraft);
 await modelMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();await modelMain.getByRole('button',{name:'Yerel yanıtı test et',exact:true}).click();await modelPage.waitForFunction(()=>window.rc46Model.calls.filter(call=>call.task!=='memory').length===5);await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);assert.match(await modelMain.locator('.aya-status').textContent(),/Yerel model · yanıt alındı/);
 assert.equal(await modelText.inputValue(),unsentDraft,'A successful setup diagnostic preserves the unsent composer draft exactly');
 await assertDiagnosticIsolation();
 assert.match(await modelMain.locator('.aya-diagnostic-result').textContent(),/Yerel model testi.*Yerel model test cevabı/s,'The diagnostic result is visibly separate from the working conversation');
 assert.doesNotMatch(await modelMain.textContent(),/YALNIZ MOTOR TESTİNİN HEDEFİ|KULLANICI KARARINI EZMEMELİ/);
 if(process.env.DENTAYA_SCREENSHOT_DIR)await modelMain.locator('.aya-conversation-shell').screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC61_AYA_Diagnostic_Isolation.png'),animations:'disabled'});
 const diagnosticPrompt=(await lastCall()).prompt;
 await modelPage.evaluate(()=>{window.rc46Model.mode='error';window.rc46Model.error='LOCAL_TIMEOUT';});
 await modelMain.getByRole('button',{name:'Yerel yanıtı test et',exact:true}).click();
 await modelMain.locator('.aya-chat-error').waitFor();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal(await modelText.inputValue(),unsentDraft,'A failed diagnostic cannot replace the draft with its test prompt');
 await assertDiagnosticIsolation();
 if(process.env.DENTAYA_SCREENSHOT_DIR)await modelMain.locator('.aya-conversation-shell').screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC61_AYA_Diagnostic_Draft.png'),animations:'disabled'});
 assert.equal(await modelMain.locator('.aya-chat-error').getByRole('button',{name:'Soruyu düzenle',exact:true}).count(),0,'Editing the fixed diagnostic must not overwrite a different composer draft');
 await modelPage.evaluate(()=>window.rc46Model.mode='ok');
 const callsBeforeDiagnosticRetry=(await normalCalls()).length;
 await modelMain.locator('.aya-chat-error').getByRole('button',{name:'Tekrar gönder',exact:true}).click();
 await modelPage.waitForFunction(count=>window.rc46Model.calls.filter(call=>call.task!=='memory').length===count+1,callsBeforeDiagnosticRetry);await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal((await lastCall()).prompt,diagnosticPrompt,'Retry repeats the isolated model diagnostic');
 assert.equal(await modelText.inputValue(),unsentDraft);
 await assertDiagnosticIsolation();
 await modelPage.evaluate(()=>{window.rc46Model.mode='pending';window.rc46Model.cancelAcknowledges=false;});
 await modelMain.getByRole('button',{name:'Yerel yanıtı test et',exact:true}).click();await modelPage.waitForFunction(()=>window.rc46Model.pending);
 await modelMain.locator('.aya-chat-composer button[type=button]').click();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal(await modelText.inputValue(),unsentDraft,'Cancellation preserves the separate draft even when native cancellation never settles');
 await assertDiagnosticIsolation();
 await modelPage.evaluate(()=>{window.rc46Model.mode='ok';window.rc46Model.pending=null;});
 await modelMain.locator('.aya-chat-error').getByRole('button',{name:'Tekrar gönder',exact:true}).click();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal(await modelText.inputValue(),unsentDraft,'Retry after diagnostic cancellation also retains the unrelated draft');
 await assertDiagnosticIsolation();
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:true}));
 await modelPage.waitForFunction(()=>window.rc46Fixture.readAyaState().sessions[0]?.workingMemory?.goal==='Cuma teslimine hazırlan');
 await modelPage.reload();await modelMain.locator('.aya-message--assistant').last().waitFor();await modelPage.waitForFunction(()=>document.querySelector('.aya-status--model'));
 assert.equal(await modelMain.locator('.aya-diagnostic-result').count(),0,'Engine check results are transient and are not restored as chat history');
 assert.equal(await modelMain.locator('.aya-message--assistant').last().locator('.aya-sources > ul > li > a').getAttribute('href'),'HTTPS://threejs.org/docs/#api/en/core/BufferGeometry','Safe source links survive opted-in history reload');
 await askModel('Önceki kararımız neydi');assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.filter(call=>call.task!=='memory').at(-1).workingMemory.goal),'Cuma teslimine hazırlan');
 assert.equal(await modelPage.evaluate(prompt=>window.rc46Model.calls.filter(call=>call.task!=='memory').at(-1).history.some(message=>message.content===prompt),diagnosticPrompt),false,'A normal follow-up never inherits the engine-test prompt or reply');
 assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.filter(call=>call.task!=='memory').at(-1).history.some(message=>message.content.includes('yalnız motor kontrolü'))),false,'The synthetic engine-test answer does not become conversational context');
 assert.match(await (await askModel('Adın ne ve amacın ne?')).textContent(),/Yerel model test cevabı/);assert.equal((await lastCall()).prompt,'Adın ne ve amacın ne?','Identity and purpose still reach a ready model');
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:false}));assert.equal(await modelPage.evaluate(()=>window.rc46Fixture.readAyaState().sessions.length),0);
 for(const error of ['LOCAL_TIMEOUT','LOCAL_BUSY','MODEL_MISSING','LOCAL_EMPTY_RESPONSE','LOCAL_INVALID_PLAN']){
  await modelPage.evaluate(error=>{window.rc46Model.mode='error';window.rc46Model.error=error;},error);
  const prompt='Yeni ifadeyle sorumu koru: '+error,count=await modelMain.locator('.aya-message--assistant').count();
  await modelText.fill(prompt);await modelMain.locator('.aya-chat-composer button[type=submit]').click();await modelMain.locator('.aya-chat-error').waitFor();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
  assert.equal(await modelMain.locator('.aya-message--assistant').count(),count,'A failed request cannot create an automatic fallback assistant');assert.equal(await modelText.inputValue(),prompt);
  assert.match(await modelMain.locator('.aya-chat-error').textContent(),error==='LOCAL_INVALID_PLAN'?/doğrulanamadı/:error==='LOCAL_TIMEOUT'?/zaman aşımına/:error==='LOCAL_BUSY'?/başka bir işlemde/:error==='MODEL_MISSING'?/bulunamadı/:/boş yanıt/);
  assert.match(await modelMain.locator('.aya-status').textContent(),/Son istek tamamlanamadı/,'An unsuccessful reply clears the successful-model indicator');
 }
 await modelText.fill('Başarısız sorunun düzenlenmiş hali');await modelPage.evaluate(()=>window.rc46Model.mode='ok');
 await modelMain.locator('.aya-chat-error').getByRole('button',{name:'Tekrar gönder',exact:true}).click();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal((await lastCall()).prompt,'Başarısız sorunun düzenlenmiş hali','Normal retry sends the current edited draft');
 assert.equal(await modelText.inputValue(),'','A successful regular retry consumes its own draft');
 await modelPage.evaluate(()=>{window.rc46Model.mode='pending';window.rc46Model.cancelAcknowledges=false;});
 await modelText.fill('Kısa bir masal yaz');await modelMain.locator('form button[type=submit]').click();await modelPage.waitForFunction(()=>window.rc46Model.pending);
 // Real cumulative tokens are visible before completion, while an unrelated request token is ignored.
 const pendingCall=await lastCall();
 await modelPage.evaluate(id=>{window.rc46Model.token?.({requestId:'foreign-request',output:'FOREIGN TOKEN'});window.rc46Model.token?.({requestId:id,output:'Henüz tamamlanmamış gerçek parça'});},pendingCall.requestId);
 await modelMain.locator('[data-aya-streaming=conversation]').filter({hasText:'Henüz tamamlanmamış gerçek parça'}).waitFor();assert.doesNotMatch(await modelMain.textContent(),/FOREIGN TOKEN/);
 const beforeCancel=await modelMain.locator('.aya-message--assistant:not([data-aya-streaming])').count();
 // The native cancellation promise deliberately never settles.
 await modelMain.locator('form button[type=button]').click();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);assert.equal(await modelText.inputValue(),'Kısa bir masal yaz');assert.equal(await modelMain.locator('[data-aya-streaming]').count(),0,'Cancelled partial output is removed');assert.equal(await modelMain.locator('.aya-message--assistant').count(),beforeCancel,'Cancellation never fabricates an assistant reply');
 await modelPage.evaluate(()=>window.rc46Model.mode='ok');await askModel('İptalden sonra devam edelim');
 const afterCancel=await modelMain.locator('.aya-message--assistant').count();
 await modelPage.evaluate(()=>{window.rc46Model.pending?.({ok:true,output:'STALE ANSWER SHOULD NEVER APPEAR',workingMemory:{goal:'STALE GOAL',decisions:[],openQuestions:[]}});window.rc46Model.pending=null;});
 await modelPage.waitForTimeout(100);assert.equal(await modelMain.locator('.aya-message--assistant').count(),afterCancel);assert.doesNotMatch(await modelMain.textContent(),/STALE ANSWER|STALE GOAL/);
 // Explicit memory editing is bounded and reaches Core without pretending to infer it.
 await modelMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();
 await modelMain.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();
 await modelMain.getByRole('button',{name:'Belleği düzenle',exact:true}).click();
 await modelMain.locator('#aya-memory-goal').fill('Manuel teslim hedefi');
 await modelMain.locator('#aya-memory-decisions').fill('Bir\nİki\nÜç\nDört\nBeş\nAltı');
 assert.equal(await modelMain.getByRole('button',{name:'Belleği kaydet',exact:true}).isDisabled(),true,'Excess memory entries cannot be silently truncated');
 await modelMain.locator('#aya-memory-decisions').fill('Önce kontrol');
 await modelMain.getByRole('button',{name:'Belleği kaydet',exact:true}).click();
 await modelMain.getByRole('button',{name:'Genel',exact:true}).click();
 await askModel('Hedefimiz neydi?');
 assert.equal((await lastCall()).workingMemory.goal,'Manuel teslim hedefi','The actual model receives manually edited memory');
 await modelMain.locator('#aya-conversation-settings').press('Escape');assert.equal(await modelMain.locator('#aya-conversation-settings').count(),0);
 assert.equal(await modelMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).evaluate(node=>document.activeElement===node),true,'Escape returns focus to the settings button');
 // Optional memory work is independent from the displayed reply and manual editor.
 await modelPage.evaluate(()=>{window.rc46Model.cancelAcknowledges=true;window.rc46Model.memoryMode='error';});
 await askModel('Başarılı serbest cevabı, bellek özeti başarısız olsa da göster');
 assert.match(await modelMain.locator('.aya-message--assistant').last().textContent(),/Yerel model test cevabı/);assert.equal(await modelMain.locator('.aya-chat-error').count(),0,'Optional extraction failure cannot replace a successful answer or create a chat error');
 assert.match(await modelMain.locator('.aya-goal-preview').textContent(),/Manuel teslim hedefi/);
 await modelPage.evaluate(()=>{window.rc46Model.memoryMode='pending';window.rc46Model.memoryCancelAcknowledges=false;});
 await askModel('Sonraki adımı düşünürken belleği ayrıca düzenleyeceğim');await modelPage.waitForFunction(()=>window.rc46Model.pendingMemory);
 await modelMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();await modelMain.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();await modelMain.getByRole('button',{name:'Belleği düzenle',exact:true}).click();
 await modelMain.locator('#aya-memory-goal').fill('SONRADAN ELLE ONAYLANAN HEDEF');await modelMain.getByRole('button',{name:'Belleği kaydet',exact:true}).click();
 await modelPage.evaluate(()=>{window.rc46Model.pendingMemory({ok:true,output:'Stale extraction',workingMemory:{goal:'ESKİ ÇIKARIM BELLEĞİ EZMEMELİ',decisions:[],openQuestions:[]}});window.rc46Model.pendingMemory=null;});
 await modelPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.match(await modelMain.locator('.aya-goal-preview').textContent(),/SONRADAN ELLE ONAYLANAN HEDEF/);assert.doesNotMatch(await modelMain.textContent(),/ESKİ ÇIKARIM BELLEĞİ EZMEMELİ/,'A late extraction cannot overwrite a committed manual memory edit');
 await modelMain.locator('#aya-conversation-settings').press('Escape');
 await modelPage.evaluate(()=>{window.rc46Model.memoryMode='pending';window.rc46Model.memoryCancelAcknowledges=true;});
 await askModel('Yanıtım hazır olduktan sonra belleği arka planda özetle');await modelPage.waitForFunction(()=>window.rc46Model.pendingMemory);
 const beforeNext=(await normalCalls()).length;await modelPage.evaluate(()=>window.rc46Model.memoryMode='error');
 await askModel('Bekleyen bellek özetini durdur ve bu yeni isteğime öncelik ver');assert.equal((await normalCalls()).length,beforeNext+1,'A new user turn settles background extraction before taking the same local engine');assert.equal(await modelPage.evaluate(()=>Boolean(window.rc46Model.pendingMemory)),false);
 // Turning history off removes both messages and model memory from persisted state.
 await modelPage.reload();await modelPage.waitForFunction(()=>window.rc46Fixture&&!document.querySelector('#aya-local-message')?.disabled&&document.querySelector('.aya-status--model'));assert.equal(await modelMain.locator('.aya-message').count(),0);
 await askModel('Yeni ve bağımsız çalışma');assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls[0].workingMemory.goal),'');
 await modelPage.evaluate(()=>window.rc46Fixture.setLocale('en'));
 await modelMain.getByRole('button',{name:'Conversation settings',exact:true}).click();
 assert.equal(await modelMain.getByRole('combobox',{name:'Response engine',exact:true}).count(),0,'Removed response engine switch remains absent in English');
 assert.equal(await modelMain.getByRole('button',{name:'Memory and notes',exact:true}).count(),1);
 await modelPage.evaluate(()=>window.rc46Fixture.setLocale('de'));
 assert.equal(await modelMain.getByRole('button',{name:'Conversation settings',exact:true}).count(),1,'New conversation controls use English fallback while retaining the selected language');
 await modelPage.evaluate(()=>window.rc46Fixture.setLocale('tr'));
 assert.deepEqual(errors,[]);
 // Stop the fixture server before cleanup so sequential suites cannot share a stale Next process.
 await browser.close();browser=null;await stopServer();
 // Complete source cleanup before publishing the pass result as well as in finally.
 rmSync(route,{recursive:true,force:true});rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});assert.equal(existsSync(route),false);
 console.log(JSON.stringify({pass:true,missingBridgeNoFabricatedReply:true,modelMissingDoesNotLockComposer:true,freeText:true,followup:true,historyOptIn:true,cadContext:true,noAutomaticCadActions:true,mobile:true,noAutomaticGuideFallback:true,naturalStreamingBeforeCompletion:true,exactCitedQaReadonlyExpansion:true,unknownQaCannotFabricateSource:true,optionalMemoryFailurePreservesAnswer:true,lateExtractionCannotOverwriteEditor:true,newTurnPrioritizesUserOverExtraction:true,modelFirstDefinitionsAndNewPhrasings:true,memoryAcrossTurnsAndOptInReload:true,notebookToggle:true,realModelTestButton:true,diagnosticSuccessFailureCancelPreserveDraft:true,diagnosticRetryRetainsForcedModel:true,diagnosticCannotChangeWorkingMemoryOrHistory:true,diagnosticOmitsPersonalContext:true,diagnosticNotInNextNormalContext:true,editedRegularRetryConsumesDraft:true,modelErrorAndCancelKeepQuestion:true,hungCancellationAndStaleResult:true,noCannedQuestionLanding:true,explicitEnglishFallback:true,collapsedConversationSettings:true,keyboardSettingsFocus:true,boundedExplicitMemory:true,explicitMemoryControlsOffline:true,modelCallsAreMock:true},null,2));
}catch(error){console.error(logs.slice(-14000));throw error;}finally{
 await browser?.close();await stopServer();
 // These are generated by this test server and reference its now-removed fixture.
 // Source code and production output are not removed.
 rmSync(route,{recursive:true,force:true});
 rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});
}
