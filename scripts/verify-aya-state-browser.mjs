import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Real React components, synthetic desktop status/chat transport. No model inference.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(root,'src/app/rc54-aya-state-preview'),url='http://127.0.0.1:3068/rc54-aya-state-preview';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const errors=[],screenshots=[];let server,browser,logs='',exitCode=null,owned=false;
async function stopServer(){
 if(!server||server.exitCode!==null||server.signalCode)return;
 await new Promise(resolve=>{const timeout=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timeout);resolve();});server.kill('SIGTERM');});
}
async function screenshot(locator,name){
 if(!process.env.DENTAYA_SCREENSHOT_DIR)return;
 await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});
 const file=path.join(process.env.DENTAYA_SCREENSHOT_DIR,name);await locator.screenshot({path:file,animations:'disabled'});screenshots.push(file);
}
try{
 try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');assert.ok(old.includes('RC50 AYA work browser verification fixture'),'Refusing to overwrite user source');}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(route,{recursive:true});owned=true;await fs.copyFile(path.join(root,'scripts/fixtures/rc50-aya-work.tsx'),path.join(route,'page.tsx'));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3068'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let ready=false;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1366,height:960}});
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/hydration|maximum update depth|unique "key"/i.test(message.text()))errors.push(message.text());});
 await page.addInitScript(()=>{
  const state=window.rc54State={mode:'ready',pendingReply:null,pendingStatus:null,nextMemory:null,polls:0,calls:[]};
  const ready={ok:true,models:[{name:'synthetic-local-model',size:1000},{name:'synthetic-preferred-model',size:900}],progress:{running:false,status:'ready',completed:0,total:0}};
  const installing={ok:true,models:[],progress:{running:true,status:'model',completed:10,total:100}};
  window.dentayaDesktop={
   onOpenPreferences:()=>()=>{},onLocalAyaToken:()=>()=>{},
   localAyaStatus:async()=>{
    if(state.mode==='status-error')throw Error('Synthetic temporary status transport failure');
    if(state.mode==='unavailable')return {...ready,ok:false,models:[]};
    if(state.mode==='busy')return {...ready,ok:false,error:'LOCAL_BUSY'};
    if(state.mode==='installing')return installing;
    if(state.mode==='polling'){
     state.polls++;
     if(state.polls===1)return installing;
     if(state.polls===2)return new Promise(resolve=>{state.pendingStatus=resolve;});
     return ready;
    }
    return ready;
   },
   localAyaChat:async input=>{state.calls.push(input);if(input.task==='memory'){const workingMemory=state.nextMemory??input.workingMemory;state.nextMemory=null;return {ok:true,output:'Separate memory extraction',workingMemory};}return new Promise(resolve=>{state.pendingReply=resolve;});},
   localAyaCancel:async()=>({ok:true}),
  };
 });
 await page.goto(url);await page.waitForFunction(()=>window.rc50Work&&document.querySelector('.aya-status--model')&&!document.querySelector('#aya-local-message')?.disabled);
 const main=page.locator('#main-test'),input=main.locator('#aya-local-message'),memory=main.locator('.aya-working-memory');
 async function askCore(prompt){const count=await main.locator('.aya-message--assistant').count();await input.fill(prompt);await main.locator('.aya-chat-composer button[type=submit]').click();await main.locator('.aya-message--assistant').nth(count).waitFor();await page.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);}
 await askCore('Hedefimiz: İlk konuşma hedefi\nKarar: Dış kontur korunacak');
 await main.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();await main.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();
 await memory.getByRole('button',{name:'Belleği düzenle',exact:true}).click();await main.locator('#aya-memory-goal').fill('ESKİ SOHBETİN TASLAĞI');
 await main.getByRole('button',{name:'Yeni sohbet',exact:true}).click();
 assert.equal(await main.locator('.aya-memory-editor').count(),0,'A new session cannot save a draft from the previous session');
 assert.doesNotMatch(await memory.textContent(),/İlk konuşma hedefi|ESKİ SOHBETİN TASLAĞI|Dış kontur/);
 await askCore('Hedefimiz: Yeni çalışma hedefi\nKarar: Önce prova kontrolü');
 await memory.getByRole('button',{name:'Belleği düzenle',exact:true}).click();await main.locator('#aya-memory-goal').fill('KULLANICININ BEKLEYEN TASLAĞI');
 await input.fill('Planı yeni teslim saatine göre güncelle');await main.locator('.aya-chat-composer button[type=submit]').click();await page.waitForFunction(()=>window.rc54State.pendingReply);
 assert.equal(await memory.getByRole('button',{name:'Belleği kaydet',exact:true}).isDisabled(),true,'A pending response cannot race a manual memory commit');
 await page.evaluate(()=>{window.rc54State.nextMemory={goal:'Modelin güncel teslim hedefi',decisions:['Yeni teslim saati onaylandı'],openQuestions:['Kurye saati?']};window.rc54State.pendingReply({ok:true,output:'Sentetik güncelleme'});window.rc54State.pendingReply=null;});
 await memory.locator('.aya-memory-conflict[role=alert]').waitFor();
 assert.equal(await main.locator('#aya-memory-goal').inputValue(),'KULLANICININ BEKLEYEN TASLAĞI','Conflicting incoming memory preserves the visible user draft');
 assert.equal(await memory.getByRole('button',{name:'Belleği kaydet',exact:true}).isDisabled(),true,'A stale draft cannot silently overwrite new memory');
 await screenshot(main.locator('.aya-conversation-shell'),'AYA_RC54_memory_conflict.png');
 await memory.getByRole('button',{name:'Güncel belleği yükle',exact:true}).click();
 assert.equal(await main.locator('#aya-memory-goal').inputValue(),'Modelin güncel teslim hedefi');
 assert.match(await main.locator('#aya-memory-decisions').inputValue(),/Yeni teslim saati/);
 await memory.getByRole('button',{name:'Belleği kaydet',exact:true}).click();
 assert.match(await memory.textContent(),/Modelin güncel teslim hedefi/);
 await main.getByRole('button',{name:'Genel',exact:true}).click();
 const setup=main.locator('.aya-engine-setup');await setup.waitFor();
 await page.evaluate(()=>{window.rc54State.mode='polling';window.rc54State.polls=0;});
 await setup.getByRole('button',{name:'Motoru ve modelleri yenile',exact:true}).click();
 await page.waitForFunction(()=>window.rc54State.pendingStatus);await page.waitForFunction(()=>window.rc54State.polls>=3&&document.querySelector('.aya-status--model'));
 await page.evaluate(()=>{window.rc54State.mode='ready';window.rc54State.pendingStatus({ok:true,models:[],progress:{running:true,status:'model',completed:10,total:100}});window.rc54State.pendingStatus=null;});
 await page.waitForTimeout(100);
 assert.equal(await setup.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).inputValue(),'synthetic-local-model','Late polling cannot remove a newly ready selected model');
 assert.match(await main.locator('.aya-status').textContent(),/Yerel model/);
 assert.equal(await setup.getByRole('button',{name:'İndirmeyi durdur',exact:true}).count(),0,'A late status cannot revive finished installation');
 // Main chat must notice engine changes made in another desktop window and
 // restore the user's explicit model choice after a temporary empty list.
 await setup.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).selectOption('synthetic-preferred-model');
 await page.evaluate(()=>{window.rc54State.mode='unavailable';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>!document.querySelector('#main-test .aya-status--model'));
 assert.equal(await input.isDisabled(),false,'A model disappearing in another window does not lock the composer');
 const callsWhileUnavailable=await page.evaluate(()=>window.rc54State.calls.length);
 const noModelReplies=await main.locator('.aya-message--assistant').count();await input.fill('12 cm kaç mm?');await main.locator('.aya-chat-composer button[type=submit]').click();await main.locator('.aya-chat-error').waitFor();await page.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal(await main.locator('.aya-message--assistant').count(),noModelReplies,'A disappeared model cannot become a fabricated Core answer');assert.equal(await input.inputValue(),'12 cm kaç mm?');
 assert.equal(await page.evaluate(()=>window.rc54State.calls.length),callsWhileUnavailable,'Main chat does not invoke an unavailable model');
 await page.evaluate(()=>{window.rc54State.mode='ready';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>document.querySelector('#main-test .aya-status--model'));
 // The ready-model inspector keeps its current selection visible after recovery.
 assert.equal(await setup.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).inputValue(),'synthetic-preferred-model','Recovery retains the chosen model instead of silently switching to the first installed model');
 // A selected installed model that is temporarily busy is not a missing model.
 await page.evaluate(()=>{window.rc54State.mode='busy';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>document.querySelector('#main-test .aya-status')?.textContent.includes('Yerel model meşgul.'));
 assert.match(await main.locator('.aya-status-description').textContent(),/Mesajlarınız bu bilgisayarda işlenir/);assert.doesNotMatch(await main.locator('.aya-status-description').textContent(),/kurun veya seçin|çalışan bir yerel model gerekiyor/,'Busy local work keeps its true installed/local status');assert.equal(await main.getByRole('button',{name:'Yerel yanıtı test et',exact:true}).isDisabled(),true,'A diagnostic cannot contend for a busy engine');assert.equal(await input.isDisabled(),false,'The composer remains available while background work owns the model');
 await screenshot(main.locator('.aya-conversation-shell'),'RC61_AYA_Installed_Model_Busy.png');
 await page.evaluate(()=>{window.rc54State.mode='ready';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>document.querySelector('#main-test .aya-status--model')&&!document.querySelector('#main-test .aya-status')?.textContent.includes('Yerel model meşgul.'));assert.equal(await main.getByRole('button',{name:'Yerel yanıtı test et',exact:true}).isDisabled(),false,'An idle installed model becomes diagnostic-ready again');
 await page.evaluate(()=>{window.rc54State.mode='status-error';window.dispatchEvent(new Event('focus'));});
 await main.locator('.aya-chat-error').waitFor();assert.match(await main.locator('.aya-chat-error').textContent(),/Yerel motor kontrol edilemedi/);
 await page.evaluate(()=>{window.rc54State.mode='ready';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>document.querySelector('#main-test .aya-status--model')&&!document.querySelector('#main-test .aya-chat-error'));
 await input.fill('Diğer pencerede hazır olan seçili modelle devam edelim');await main.locator('.aya-chat-composer button[type=submit]').click();
 await page.waitForFunction(()=>window.rc54State.pendingReply);
 assert.equal(await page.evaluate(()=>window.rc54State.calls.at(-1).model),'synthetic-preferred-model','The recovered selection is used for the next real bridge request');
 await page.evaluate(()=>{window.rc54State.pendingReply({ok:true,output:'Seçili model ile sentetik devam yanıtı'});window.rc54State.pendingReply=null;});
 await page.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 await screenshot(main.locator('.aya-conversation-shell'),'RC61_AYA_Focus_Model_Recovery.png');
 const cad=page.locator('#cad-test');
 await page.evaluate(()=>{window.rc54State.mode='installing';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>!document.querySelector('#cad-test select[aria-label="Kurulu yerel model"]'));
 const calls=await page.evaluate(()=>window.rc54State.calls.length);
 await cad.locator('.cad-aya-panel>form textarea').fill('Sıradaki adım ne?');await cad.locator('.cad-aya-panel>form button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cad-test .cad-aya-panel>form textarea').disabled);
 assert.equal(await page.evaluate(()=>window.rc54State.calls.length),calls,'CAD does not invoke a globally busy model');assert.equal(await cad.locator('.cad-aya-messages article').filter({hasText:'Sıradaki adım ne?'}).count(),1);assert.equal(await cad.locator('.cad-aya-messages article strong').filter({hasText:'AYA'}).count(),0,'CAD cannot fabricate an assistant while the model is unavailable');
 await page.evaluate(()=>{window.rc54State.mode='ready';});await cad.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 await page.evaluate(()=>{window.rc54State.mode='busy';window.dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>!document.querySelector('#cad-test select[aria-label="Kurulu yerel model"]'));
 await page.evaluate(()=>{window.rc54State.mode='ready';});await cad.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 await page.evaluate(()=>{window.rc54State.mode='unavailable';window.dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>!document.querySelector('#cad-test select[aria-label="Kurulu yerel model"]'));
 await screenshot(cad,'AYA_RC61_unavailable_model.png');
 // A manually edited session can contain memory without any sent messages.
 // Clearing its last memory must also clear its opted-in persisted record.
 await page.evaluate(()=>window.rc50Work.saveAyaOptions({saveHistory:false}));
 await main.getByRole('button',{name:'Yeni sohbet',exact:true}).click();
 await page.evaluate(()=>window.rc50Work.saveAyaOptions({saveHistory:true}));
 assert.equal(await page.evaluate(()=>window.rc50Work.readAyaState().sessions.length),0,'Enabling history in an empty conversation must not create an empty session');
 await main.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();
 async function saveGoal(goal){
  await memory.getByRole('button',{name:'Belleği düzenle',exact:true}).click();await main.locator('#aya-memory-goal').fill(goal);await memory.getByRole('button',{name:'Belleği kaydet',exact:true}).click();
 }
 await saveGoal('YALNIZ BELLEKTEKİ HEDEF');
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions[0]?.workingMemory.goal==='YALNIZ BELLEKTEKİ HEDEF');
 assert.equal(await main.locator('.aya-message').count(),0);
 await memory.getByRole('button',{name:'Belleği temizle',exact:true}).click();
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions.length===0);
 await saveGoal('EDİTÖRDEN SİLİNECEK HEDEF');
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions[0]?.workingMemory.goal==='EDİTÖRDEN SİLİNECEK HEDEF');
 await saveGoal('');await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions.length===0);
 await page.reload();await page.waitForFunction(()=>window.rc50Work&&!document.querySelector('#aya-local-message')?.disabled);
 assert.equal(await main.locator('.aya-goal-preview').count(),0,'Reload cannot restore memory cleared from a memory-only conversation');
 assert.equal(await main.locator('.aya-message').count(),0);
 assert.equal(await page.evaluate(()=>window.rc50Work.readAyaState().sessions.length),0,'Reload does not save a fresh empty record');
 await screenshot(main.locator('.aya-conversation-shell'),'RC61_AYA_Empty_Memory_Reload.png');
 await main.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();await main.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();
 await saveGoal('BU PENCERENİN HEDEFİ');await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions.length===1);
 // A second real browser page shares this origin's localStorage. All edits
 // below use the real controls; only the desktop model transport is synthetic.
 const beforeReadOnly=await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1'));
 const secondPage=await context.newPage();secondPage.on('pageerror',error=>errors.push(error.message));
 await secondPage.goto(url);await secondPage.waitForFunction(()=>window.rc50Work&&document.querySelector('.aya-goal-preview'));
 const settleReadOnly=()=>secondPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await settleReadOnly();
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),beforeReadOnly,'Opening an unchanged second window leaves exact history bytes, timestamp and revision untouched');
 await secondPage.reload();await secondPage.waitForFunction(()=>window.rc50Work&&document.querySelector('.aya-goal-preview'));await settleReadOnly();
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),beforeReadOnly,'Reloading an unchanged conversation does not create activity or a new revision');
 await page.evaluate(()=>window.rc50Work.setLocale('en'));await main.getByRole('button',{name:'New conversation',exact:true}).waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),beforeReadOnly,'Changing interface language does not modify conversation content or activity');
 await page.evaluate(()=>window.rc50Work.setLocale('tr'));await main.getByRole('button',{name:'Yeni sohbet',exact:true}).waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),beforeReadOnly);
 await saveGoal('BU PENCERENİN DEVAM HEDEFİ');
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions[0]?.workingMemory.goal==='BU PENCERENİN DEVAM HEDEFİ');
 assert.equal(await main.locator('.aya-session-conflict').count(),0,'A read-only second window cannot block the original window\'s next real edit');
 await screenshot(main.locator('.aya-conversation-shell'),'RC61_AYA_Read_Only_History.png');
 const afterRealEdit=await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1'));
 await secondPage.reload();await secondPage.waitForFunction(()=>window.rc50Work&&document.querySelector('.aya-goal-preview'));await settleReadOnly();
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),afterRealEdit);
 const secondMain=secondPage.locator('#main-test'),secondMemory=secondMain.locator('.aya-working-memory');
 async function secondEditGoal(goal){
  await secondMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();
  await secondMain.getByRole('button',{name:'Bellek ve notlar',exact:true}).click();
  await secondMemory.getByRole('button',{name:'Belleği düzenle',exact:true}).click();
  await secondMain.locator('#aya-memory-goal').fill(goal);
  await secondMemory.getByRole('button',{name:'Belleği kaydet',exact:true}).click();
 }
 await secondEditGoal('DİĞER PENCERENİN YENİ HEDEFİ');
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions[0]?.workingMemory.goal==='DİĞER PENCERENİN YENİ HEDEFİ');
 await memory.getByRole('button',{name:'Belleği temizle',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.rc50Work.readAyaState().sessions[0]?.workingMemory.goal),'DİĞER PENCERENİN YENİ HEDEFİ','A local empty reset cannot delete a newer stored edit from another window');
 await main.locator('.aya-session-conflict').waitFor();
 const unsent='BU PENCEREDEKİ GÖNDERİLMEMİŞ TASLAK';await input.fill(unsent);
 await main.getByRole('button',{name:'Saklanan sohbeti yükle',exact:true}).click();
 await main.locator('.aya-goal-preview').filter({hasText:'DİĞER PENCERENİN YENİ HEDEFİ'}).waitFor();
 assert.equal(await input.inputValue(),unsent,'Explicit stored-conversation reload preserves the unsent composer draft');
 assert.equal(await main.locator('.aya-session-conflict').count(),0);
 // A pending reply captures the old goal while a newer stored decision is
 // committed in the second window. Its late result remains local work.
 await page.evaluate(()=>{window.rc54State.mode='ready';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>document.querySelector('#main-test .aya-status--model'));
 await input.fill('Eski hedefle başlayan bekleyen model yanıtı');await main.locator('.aya-chat-composer button[type=submit]').click();
 await page.waitForFunction(()=>window.rc54State.pendingReply);
 const originalId=await page.evaluate(()=>window.rc50Work.readAyaState().sessions[0].id);
 await secondPage.reload();await secondPage.waitForFunction(()=>window.rc50Work&&document.querySelector('.aya-goal-preview'));
 await secondEditGoal('YENİ PENCEREDE ONAYLANAN TESLİM HEDEFİ');
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions[0]?.workingMemory.goal==='YENİ PENCEREDE ONAYLANAN TESLİM HEDEFİ');
 await page.evaluate(()=>{window.rc54State.nextMemory={goal:'ESKİ YANITIN YEREL HEDEFİ',decisions:['Yerel karar'],openQuestions:[]};window.rc54State.pendingReply({ok:true,output:'BEKLEYEN PENCERENİN YANITI KORUNDU'});window.rc54State.pendingReply=null;});
 await main.locator('.aya-session-conflict').waitFor();await page.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal(await page.evaluate(id=>window.rc50Work.readAyaState().sessions.find(session=>session.id===id)?.workingMemory.goal,originalId),'YENİ PENCEREDE ONAYLANAN TESLİM HEDEFİ','The delayed reply cannot overwrite a newer stored goal');
 assert.match(await main.locator('.aya-message--assistant').last().textContent(),/BEKLEYEN PENCERENİN YANITI KORUNDU/);
 assert.match(await main.locator('.aya-goal-preview').textContent(),/ESKİ YANITIN YEREL HEDEFİ/,'Conflict handling retains current in-memory work');
 await screenshot(main.locator('.aya-conversation-shell'),'RC61_AYA_Two_Window_Conflict.png');
 await input.fill(unsent);await main.getByRole('button',{name:'Bu çalışmayı ayrı sohbete kaydet',exact:true}).click();
 await page.waitForFunction(()=>window.rc50Work.readAyaState().sessions.length===2&&!document.querySelector('.aya-session-conflict'));
 const copyId=await page.evaluate(()=>window.rc50Work.readAyaState().sessions[0].id);
 assert.notEqual(copyId,originalId);assert.equal(await input.inputValue(),unsent);
 assert.equal(await page.evaluate(id=>window.rc50Work.readAyaState().sessions.find(session=>session.id===id)?.workingMemory.goal,originalId),'YENİ PENCEREDE ONAYLANAN TESLİM HEDEFİ');
 assert.equal(await page.evaluate(id=>window.rc50Work.readAyaState().sessions.find(session=>session.id===id)?.workingMemory.goal,copyId),'ESKİ YANITIN YEREL HEDEFİ');
 // Deleting a conversation while another window is answering cannot cause the
 // delayed window to silently re-create the deleted record.
 await input.fill('Silinen kayda gelen geç yanıt');await main.locator('.aya-chat-composer button[type=submit]').click();await page.waitForFunction(()=>window.rc54State.pendingReply);
 await secondPage.reload();await secondPage.waitForFunction(()=>window.rc50Work&&document.querySelector('.aya-goal-preview'));
 await secondMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();await secondMain.getByRole('button',{name:'Geçmiş',exact:true}).click();
 const firstHistoryRow=secondMain.locator('.aya-history-item').first();
 await secondPage.evaluate(()=>{const original=Storage.prototype.setItem;window.rc60RestoreStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(key,value){if(key==='dentaya:aya-core:v1')throw new DOMException('Synthetic storage failure','QuotaExceededError');return original.call(this,key,value);};});
 await firstHistoryRow.getByRole('button',{name:'Sil',exact:true}).click();
 assert.equal(await secondMain.locator('.aya-history-item').count(),2,'A failed history delete preserves the record and active conversation');
 assert.match(await secondMain.locator('.aya-chat-error').textContent(),/saklanamadı/);
 await secondPage.evaluate(()=>window.rc60RestoreStorage());
 await firstHistoryRow.getByRole('button',{name:'Sil',exact:true}).click();
 await page.waitForFunction(id=>!window.rc50Work.readAyaState().sessions.some(session=>session.id===id),copyId);
 await page.evaluate(()=>{window.rc54State.nextMemory={goal:'SİLİNEN KAYDIN YEREL HEDEFİ',decisions:[],openQuestions:[]};window.rc54State.pendingReply({ok:true,output:'SİLİNEN KAYDIN YALNIZ YEREL YANITI'});window.rc54State.pendingReply=null;});
 await main.locator('.aya-session-conflict').waitFor();await page.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);
 assert.equal(await page.evaluate(id=>window.rc50Work.readAyaState().sessions.some(session=>session.id===id),copyId),false,'A delayed reply cannot resurrect a conversation deleted from another window');
 assert.match(await main.locator('.aya-session-conflict').textContent(),/saklanan kaydı silinmiş/);
 assert.equal(await main.getByRole('button',{name:'Saklanan sohbeti yükle',exact:true}).isDisabled(),true);
 assert.match(await main.locator('.aya-message--assistant').last().textContent(),/SİLİNEN KAYDIN YALNIZ YEREL YANITI/);
 await screenshot(main.locator('.aya-conversation-shell'),'RC61_AYA_Deleted_Record_Recovery.png');
 await secondPage.close();
 assert.deepEqual(errors,[],'State transitions produce no React/hydration/page errors');
 await browser.close();browser=null;await stopServer();await fs.rm(route,{recursive:true,force:true});owned=false;await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});
 console.log(JSON.stringify({pass:true,sessionEditorIsolation:true,pendingReplyMemoryConflict:true,userDraftPreserved:true,explicitMemoryReload:true,lateStatusCannotOverwriteReady:true,mainFocusRecoversEngineChanges:true,installedBusyModelKeepsLocalStatus:true,busyDiagnosticDisabledAndRecovers:true,explicitModelChoiceSurvivesUnavailable:true,recoveredStatusClearsTransportError:true,cadInstallAndUnavailableNeverFabricateReply:true,cadBusyPollingRecovers:true,memoryOnlyResetPersists:true,emptySessionNotCreated:true,newerStoredMemoryPreserved:true,readOnlyOpenPreservesHistoryBytes:true,readOnlyReloadPreservesActivity:true,localeDoesNotRewriteConversation:true,readOnlyWindowDoesNotBlockRealEdit:true,twoRealWindowsPreserveNewerStoredReply:true,explicitStoredReloadPreservesDraft:true,explicitSeparateCopyPreservesBoth:true,failedDeleteRetainsRecord:true,deletedConversationNotResurrected:true,modelCallsAreMock:true,cadCallbacksAreSynthetic:true,nativeInference:false,screenshots},null,2));
}catch(error){console.error(logs);throw error;}finally{
 await browser?.close();await stopServer();if(owned)await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});
}
