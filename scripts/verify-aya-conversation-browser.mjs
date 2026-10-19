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
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3056'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',d=>{logs=(logs+d).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let ready=false;while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:940}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/hydration|Maximum update depth|unique "key"/.test(m.text()))errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.rc46Fixture);await page.waitForFunction(()=>!document.querySelector('#aya-local-message')?.disabled);
 const main=page.locator('#main-test'),textarea=main.locator('#aya-local-message');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await main.locator('.aya-conversation-shell').screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'AYA_conversation_desktop.png'),animations:'disabled'});}
 await main.locator('.aya-prompts button').nth(2).click();assert.equal(await textarea.inputValue(),'12 cm kaç mm?');assert.equal(await main.locator('.aya-message').count(),0,'Welcome shortcuts prepare a question without sending');await textarea.fill('');
 async function ask(prompt,scope=main){const selector=scope===main?'.aya-message--assistant':'.cad-aya-messages article',composer=scope.locator(scope===main?'.aya-chat-composer':'.cad-aya-panel>form');const count=await scope.locator(selector).count();await composer.locator('textarea').fill(prompt);await composer.locator('button[type=submit]').click();await assert.doesNotReject(()=>scope.locator(selector).nth(count+(scope===main?0:1)).waitFor());if(scope===main)await page.waitForFunction(()=>!document.querySelector('#aya-local-message')?.disabled);return scope.locator(selector).last();}
 assert.match(await (await ask('kanka selam nasılsın')).textContent(),/Selam/);
 assert.match(await (await ask('zrikonya nedir')).textContent(),/Zirkonya/);
 assert.match(await (await ask('peki nasıl kontrol ederim')).textContent(),/ürün ailesi/);
 assert.match(await (await ask('Mavi bir gezegen hakkında masal yaz')).textContent(),/Mesajını aldım/);
 assert.equal(await main.locator('#aya-conversation-settings').count(),0,'Settings are closed while the composer is ready');
 await main.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();
 const settings=main.locator('#aya-conversation-settings');await settings.waitFor();
 await page.waitForFunction(()=>document.activeElement?.id==='aya-conversation-settings');assert.equal(await settings.evaluate(node=>document.activeElement===node),true,'Opening settings moves keyboard focus into the panel');
 await settings.locator('#aya-response-mode').selectOption('automatic');assert.equal(await textarea.isDisabled(),false);
 await settings.getByRole('button',{name:'Soru kütüphanesi',exact:true}).click();
 assert.match(await (await ask('STL nedir')).textContent(),/üçgen yüzey/);
 const library=main.locator('#aya-catalog');await library.locator(':scope>summary').click();await library.locator('select').selectOption('fdi');await library.locator('input').fill('75');assert.equal(await library.locator('li').count(),4);await library.locator('li').first().locator('details').click();assert.match(await library.locator('li').first().textContent(),/alt sol/);
 const before=await main.locator('.aya-message').count();await library.locator('li button').first().click();assert.equal(await textarea.inputValue(),'75 hangi diştir?');assert.equal(await main.locator('.aya-message').count(),before,'Question selection must not send a message');await textarea.press('Enter');await page.waitForFunction(()=>document.querySelectorAll('.aya-message').length>0&&!document.querySelector('#aya-local-message').disabled);assert.match(await main.locator('.aya-message--assistant').last().textContent(),/alt sol/);
 await page.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:true}));await page.waitForFunction(()=>window.rc46Fixture.readAyaState().sessions.length===1);await page.reload();await main.locator('.aya-message--assistant').last().waitFor();assert.match(await main.locator('.aya-message--assistant').last().textContent(),/alt sol/);await page.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:false}));
 const cad=page.locator('#cad-test');assert.match(await (await ask('implant üstü diş gelmiyor',cad)).textContent(),/Koleye yerleştir/);
 await page.evaluate(()=>window.rc46Fixture.setContext(c=>({...c,marginPoints:0})));assert.match(await (await ask('implant diş gelmiyor',cad)).textContent(),/Geçerli bir kole/);
 await page.evaluate(()=>window.rc46Fixture.setContext(c=>({...c,saveFailed:true})));assert.match(await (await ask('kaydet ve çık',cad)).textContent(),/Yerel kaydet ve çık/);
 assert.deepEqual(await page.evaluate(()=>window.rc46Fixture.actions),[],'Chat must not perform CAD actions');
 await page.setViewportSize({width:390,height:844});await textarea.scrollIntoViewIfNeeded();assert.ok(await main.evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));assert.equal(await textarea.isDisabled(),false);
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC46_AYA_mobile.png'),animations:'disabled'});}
 const modelPage=await browser.newPage({viewport:{width:1280,height:940}});modelPage.on('pageerror',e=>errors.push(e.message));
 await modelPage.addInitScript(()=>{
  const state=window.rc46Model={calls:[],mode:'ok',pending:null,token:null,cancelAcknowledges:true,error:'LOCAL_TIMEOUT'};
  window.dentayaDesktop={
   onOpenPreferences:()=>()=>{},
   localAyaStatus:async()=>({ok:true,models:[{name:'test-local-model',size:1000}],progress:{running:false,status:'ready',completed:0,total:0}}),
   onLocalAyaToken:fn=>{state.token=fn;return()=>{state.token=null;};},
   localAyaChat:async input=>{
    state.calls.push(input);
    if(state.mode==='error')return {ok:false,error:state.error};
    if(state.mode==='pending')return new Promise(resolve=>{state.pending=resolve;});
    const workingMemory=input.workingMemory?.goal?input.workingMemory:{goal:'Cuma teslimine hazırlan',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati?']};
    return {ok:true,output:'Yerel model test cevabı',references:[],workingMemory};
   },
   localAyaCancel:async()=>{if(!state.cancelAcknowledges)return new Promise(()=>{});state.pending?.({ok:false,error:'LOCAL_CANCELLED'});state.pending=null;return {ok:true};}
  };
 });
 await modelPage.goto(url);await modelPage.waitForFunction(()=>document.querySelector('.aya-status--model'));
 const modelMain=modelPage.locator('#main-test'),modelText=modelMain.locator('#aya-local-message');
 async function askModel(prompt){const count=await modelMain.locator('.aya-message--assistant').count();await modelText.fill(prompt);await modelMain.locator('form button[type=submit]').click();await modelMain.locator('.aya-message--assistant').nth(count).waitFor();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);return modelMain.locator('.aya-message--assistant').last();}
 assert.match(await (await askModel('Dentin nedir')).textContent(),/Yerel model test cevabı/);
 assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.length),1,'Definitions reach the ready model');
 assert.deepEqual(await modelPage.evaluate(()=>{const x=window.rc46Model.calls[0];return {agent:x.agent,prompt:x.prompt,memory:x.workingMemory};}),{agent:true,prompt:'Dentin nedir',memory:{goal:'',decisions:[],openQuestions:[]}});
 await askModel('Bunu cuma teslim planımızı düşünerek iki adıma indir');
 const followup=await modelPage.evaluate(()=>window.rc46Model.calls.at(-1));
 assert.equal(followup.workingMemory.goal,'Cuma teslimine hazırlan');assert.deepEqual(followup.workingMemory.decisions,['Önce prova kontrolü']);assert.equal(followup.history[0].content,'Dentin nedir');
 // Notebook opt-in is independent from transient conversation memory.
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaKnowledge([{id:'synthetic',title:'Kurye',kind:'memory',content:'Kurye 16:40.'}],false));
 await askModel('Kurye için planı yeniden yaz');
 assert.deepEqual(await modelPage.evaluate(()=>{const x=window.rc46Model.calls.at(-1);return {useMemory:x.useMemory,knowledge:x.knowledge};}),{useMemory:false,knowledge:[]});
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaKnowledge([{id:'synthetic',title:'Kurye',kind:'memory',content:'Kurye 16:40.'}],true));
 await askModel('Kurye bilgisini kullanarak devam et');
 assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.at(-1).knowledge[0].content),'Kurye 16:40.');
 await modelMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();await modelMain.getByRole('button',{name:'Yerel yanıtı test et',exact:true}).click();await modelPage.waitForFunction(()=>window.rc46Model.calls.length===5);await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);assert.match(await modelMain.locator('.aya-status').textContent(),/Yerel model · yanıt alındı/);
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:true}));
 await modelPage.waitForFunction(()=>window.rc46Fixture.readAyaState().sessions[0]?.workingMemory?.goal==='Cuma teslimine hazırlan');
 await modelPage.reload();await modelMain.locator('.aya-message--assistant').last().waitFor();await modelPage.waitForFunction(()=>document.querySelector('.aya-status--model'));
 await askModel('Önceki kararımız neydi');assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.at(-1).workingMemory.goal),'Cuma teslimine hazırlan');
 await modelPage.evaluate(()=>window.rc46Fixture.saveAyaOptions({saveHistory:false}));assert.equal(await modelPage.evaluate(()=>window.rc46Fixture.readAyaState().sessions.length),0);
 for(const error of ['LOCAL_TIMEOUT','LOCAL_BUSY','MODEL_MISSING','LOCAL_EMPTY_RESPONSE','LOCAL_INVALID_PLAN']){
  await modelPage.evaluate(error=>{window.rc46Model.mode='error';window.rc46Model.error=error;},error);
  const prompt='Yeni ifadeyle sorumu koru: '+error;
  assert.match(await (await askModel(prompt)).textContent(),/soru kaybolmadı/);assert.equal(await modelText.inputValue(),prompt);
  assert.match(await modelMain.locator('.aya-chat-error').textContent(),error==='LOCAL_INVALID_PLAN'?/doğrulanamadı/:error==='LOCAL_TIMEOUT'?/zaman aşımına/:error==='LOCAL_BUSY'?/başka bir işlemde/:error==='MODEL_MISSING'?/bulunamadı/:/boş yanıt/);
  assert.match(await modelMain.locator('.aya-status').textContent(),/Son istek tamamlanamadı/,'An unsuccessful reply must clear the successful-model indicator');
 }
 await modelPage.evaluate(()=>{window.rc46Model.mode='pending';window.rc46Model.cancelAcknowledges=false;});
 await modelText.fill('Kısa bir masal yaz');await modelMain.locator('form button[type=submit]').click();await modelPage.waitForFunction(()=>window.rc46Model.pending);
 // The native cancellation promise deliberately never settles.
 await modelMain.locator('form button[type=button]').click();await modelPage.waitForFunction(()=>!document.querySelector('#aya-local-message').disabled);assert.equal(await modelText.inputValue(),'Kısa bir masal yaz');assert.match(await modelMain.locator('.aya-message--assistant').last().textContent(),/durdurdun/);
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
 await modelMain.locator('#aya-response-mode').selectOption('core');
 const callsBeforeCore=await modelPage.evaluate(()=>window.rc46Model.calls.length);
 await askModel('Hedefimiz neydi?');assert.match(await modelMain.locator('.aya-message--assistant').last().textContent(),/Manuel teslim hedefi/);
 assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls.length),callsBeforeCore);
 await modelMain.locator('#aya-response-mode').selectOption('automatic');
 await modelMain.locator('#aya-conversation-settings').press('Escape');assert.equal(await modelMain.locator('#aya-conversation-settings').count(),0);
 assert.equal(await modelMain.getByRole('button',{name:'Sohbet ayarları',exact:true}).evaluate(node=>document.activeElement===node),true,'Escape returns focus to the settings button');
 // Turning history off removes both messages and model memory from persisted state.
 await modelPage.reload();await modelPage.waitForFunction(()=>window.rc46Fixture&&!document.querySelector('#aya-local-message')?.disabled&&document.querySelector('.aya-status--model'));assert.equal(await modelMain.locator('.aya-message').count(),0);
 await askModel('Yeni ve bağımsız çalışma');assert.equal(await modelPage.evaluate(()=>window.rc46Model.calls[0].workingMemory.goal),'');
 await modelPage.evaluate(()=>window.rc46Fixture.setLocale('en'));
 await modelMain.getByRole('button',{name:'Conversation settings',exact:true}).click();
 assert.equal(await modelMain.getByRole('combobox',{name:'Response engine',exact:true}).count(),1);
 assert.equal(await modelMain.getByRole('button',{name:'Memory and notes',exact:true}).count(),1);
 await modelPage.evaluate(()=>window.rc46Fixture.setLocale('de'));
 assert.equal(await modelMain.getByRole('button',{name:'Conversation settings',exact:true}).count(),1,'New conversation controls use English fallback while retaining the selected language');
 await modelPage.evaluate(()=>window.rc46Fixture.setLocale('tr'));
 assert.deepEqual(errors,[]);
 // Complete source cleanup before publishing the pass result as well as in finally.
 rmSync(route,{recursive:true,force:true});rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});assert.equal(existsSync(route),false);
 console.log(JSON.stringify({pass:true,noBridgeChat:true,modelMissingDoesNotLockComposer:true,freeText:true,followup:true,catalogueFilterAndPrepare:true,historyOptIn:true,cadContext:true,noAutomaticCadActions:true,mobile:true,coreDoesNotPretendModel:true,modelFirstDefinitionsAndNewPhrasings:true,memoryAcrossTurnsAndOptInReload:true,notebookToggle:true,realModelTestButton:true,modelErrorAndCancelKeepQuestion:true,hungCancellationAndStaleResult:true,prepareOnlyWelcomeTools:true,explicitEnglishFallback:true,collapsedConversationSettings:true,keyboardSettingsFocus:true,boundedExplicitMemory:true,offlineMemoryRecall:true,modelCallsAreMock:true},null,2));
}catch(error){console.error(logs.slice(-14000));throw error;}finally{
 // These are generated by this test server and reference its now-removed fixture.
 // Source code and production output are not removed.
 rmSync(route,{recursive:true,force:true});
 rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});
 await browser?.close();server?.kill('SIGTERM');
}
