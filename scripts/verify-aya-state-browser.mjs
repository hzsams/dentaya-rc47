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
 const page=await browser.newPage({viewport:{width:1366,height:960}});
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/hydration|maximum update depth|unique "key"/i.test(message.text()))errors.push(message.text());});
 await page.addInitScript(()=>{
  const state=window.rc54State={mode:'ready',pendingReply:null,pendingStatus:null,polls:0,calls:[]};
  const ready={ok:true,models:[{name:'synthetic-local-model',size:1000}],progress:{running:false,status:'ready',completed:0,total:0}};
  const installing={ok:true,models:[],progress:{running:true,status:'model',completed:10,total:100}};
  window.dentayaDesktop={
   onOpenPreferences:()=>()=>{},onLocalAyaToken:()=>()=>{},
   localAyaStatus:async()=>{
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
   localAyaChat:async input=>{state.calls.push(input);return new Promise(resolve=>{state.pendingReply=resolve;});},
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
 await page.evaluate(()=>{window.rc54State.pendingReply({ok:true,output:'Sentetik güncelleme',workingMemory:{goal:'Modelin güncel teslim hedefi',decisions:['Yeni teslim saati onaylandı'],openQuestions:['Kurye saati?']}});window.rc54State.pendingReply=null;});
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
 const setup=main.locator('.aya-engine-setup');if(!await setup.evaluate(node=>node.open))await setup.locator(':scope>summary').click();
 await page.evaluate(()=>{window.rc54State.mode='polling';window.rc54State.polls=0;});
 await setup.getByRole('button',{name:'Motoru ve modelleri yenile',exact:true}).click();
 await page.waitForFunction(()=>window.rc54State.pendingStatus);await page.waitForFunction(()=>window.rc54State.polls>=3&&document.querySelector('.aya-status--model'));
 await page.evaluate(()=>{window.rc54State.mode='ready';window.rc54State.pendingStatus({ok:true,models:[],progress:{running:true,status:'model',completed:10,total:100}});window.rc54State.pendingStatus=null;});
 await page.waitForTimeout(100);
 if(!await setup.evaluate(node=>node.open))await setup.locator(':scope>summary').click();
 assert.equal(await setup.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).inputValue(),'synthetic-local-model','Late polling cannot remove a newly ready selected model');
 assert.match(await main.locator('.aya-status').textContent(),/Yerel model/);
 assert.equal(await setup.getByRole('button',{name:'İndirmeyi durdur',exact:true}).count(),0,'A late status cannot revive finished installation');
 const cad=page.locator('#cad-test');
 await page.evaluate(()=>{window.rc54State.mode='installing';window.dispatchEvent(new Event('focus'));});
 await page.waitForFunction(()=>!document.querySelector('#cad-test select[aria-label="Kurulu yerel model"]'));
 const calls=await page.evaluate(()=>window.rc54State.calls.length);
 await cad.locator('.cad-aya-panel>form textarea').fill('Sıradaki adım ne?');await cad.locator('.cad-aya-panel>form button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#cad-test .cad-aya-panel>form textarea').disabled);
 assert.equal(await page.evaluate(()=>window.rc54State.calls.length),calls,'CAD uses Core instead of invoking a globally busy model');
 await page.evaluate(()=>{window.rc54State.mode='ready';});await cad.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 await page.evaluate(()=>{window.rc54State.mode='busy';window.dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>!document.querySelector('#cad-test select[aria-label="Kurulu yerel model"]'));
 await page.evaluate(()=>{window.rc54State.mode='ready';});await cad.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 await page.evaluate(()=>{window.rc54State.mode='unavailable';window.dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>!document.querySelector('#cad-test select[aria-label="Kurulu yerel model"]'));
 await screenshot(cad,'AYA_RC54_unavailable_model_core.png');
 assert.deepEqual(errors,[],'State transitions produce no React/hydration/page errors');
 await browser.close();browser=null;await stopServer();await fs.rm(route,{recursive:true,force:true});owned=false;await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});
 console.log(JSON.stringify({pass:true,sessionEditorIsolation:true,pendingReplyMemoryConflict:true,userDraftPreserved:true,explicitMemoryReload:true,lateStatusCannotOverwriteReady:true,cadInstallAndUnavailableUseCore:true,cadBusyPollingRecovers:true,modelCallsAreMock:true,cadCallbacksAreSynthetic:true,nativeInference:false,screenshots},null,2));
}catch(error){console.error(logs);throw error;}finally{
 await browser?.close();await stopServer();if(owned)await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});
}
