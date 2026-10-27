import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(root,'src/app/rc60-aya-setup-preview'),url='http://127.0.0.1:3071/rc60-aya-setup-preview';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
let server,browser,owned=false,logs='',exitCode=null;const errors=[];
async function stopServer(){if(!server||server.exitCode!==null||server.signalCode)return;await new Promise(resolve=>{const timer=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill('SIGTERM');});}
try{
 try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');assert.ok(old.includes('RC60 AYA setup fixture'),'Refusing to overwrite user source');}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(route,{recursive:true});owned=true;await fs.copyFile(path.join(root,'scripts/fixtures/rc60-aya-setup.tsx'),path.join(route,'page.tsx'));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3071'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let ready=false;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const progress={running:true,status:'model',completed:10,total:100};
  const state=window.rc60Setup={mode:'foreign',cancels:0,refreshes:0,pending:null,ollamaMode:'pull-pending',ollamaPulls:0,ollamaCancels:0,pendingPull:null,pendingOllamaCancel:null,status:{ok:false,error:'LOCAL_BUSY',models:[],progress}};
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},
   localAyaStatus:async()=>{state.refreshes++;if(state.mode==='status-error')throw Error('PRIVATE status transport detail');return state.status;},
   localAyaInstallCancel:async()=>{
    state.cancels++;
    if(state.mode==='foreign')return {ok:false,error:'LOCAL_BUSY'};
    if(state.mode==='transport-error')throw Error('PRIVATE C:\\user\\model.gguf https://private.invalid');
    if(state.mode==='pending')return new Promise(resolve=>{state.pending=()=>{state.status={ok:true,models:[],progress:{running:false,status:'cancelled',completed:10,total:100}};resolve({ok:true});};});
    return {ok:true};
   },
   localAyaDownload:async()=>{
    state.ollamaPulls++;
    if(state.ollamaMode==='pull-error')throw Error('PRIVATE C:\\user\\model.gguf https://private.invalid');
    if(state.ollamaMode==='pull-busy')return {ok:false,error:'LOCAL_BUSY'};
    return new Promise(resolve=>{state.pendingPull=()=>{state.status={...state.status,ok:false,error:'LOCAL_BUSY',ollama:{online:true,progress:{running:true,status:'Model indiriliyor…',completed:250,total:2500}}};resolve({ok:true});};});
   },
   localAyaCancelDownload:async()=>{
    state.ollamaCancels++;
    if(state.ollamaMode==='cancel-foreign')return {ok:false,error:'LOCAL_BUSY'};
    if(state.ollamaMode==='cancel-error')throw Error('PRIVATE C:\\user\\model.gguf https://private.invalid');
    return new Promise(resolve=>{state.pendingOllamaCancel=()=>{state.status={...state.status,ok:true,error:undefined,ollama:{online:true,progress:{running:false,status:'İndirme durduruldu.',completed:250,total:2500}}};resolve({ok:true});};});
   },
  };
 });
 await page.goto(url);await page.waitForFunction(()=>window.rc60Setup?.refreshes>0);
 const main=page.locator('#aya-setup-test');
 const cancel=main.getByRole('button',{name:'İndirmeyi durdur',exact:true}),refresh=main.getByRole('button',{name:'Motoru ve modelleri yenile',exact:true});
 const unlocked=()=>page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Motoru ve modelleri yenile'&&!button.disabled));
 await cancel.click();await main.getByRole('alert').waitFor();assert.match(await main.getByRole('alert').textContent(),/başka bir işlemde/);
 await unlocked();
 assert.equal(await cancel.isEnabled(),true);assert.equal(await page.evaluate(()=>window.rc60Setup.status.progress.running),true,'A foreign cancellation cannot claim the download stopped');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC60_AYA_Setup_Other_Window.png'),animations:'disabled'});}
 const before=await page.evaluate(()=>({cancels:window.rc60Setup.cancels,refreshes:window.rc60Setup.refreshes}));
 await page.evaluate(()=>{window.rc60Setup.mode='pending';});
 await cancel.evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>window.rc60Setup.pending);
 assert.equal(await page.evaluate(()=>window.rc60Setup.cancels),before.cancels+1,'Same-turn double click dispatches only one cancellation');
 assert.equal(await cancel.isDisabled(),true);assert.equal(await refresh.isDisabled(),true);
 await page.evaluate(()=>{window.rc60Setup.pending();window.rc60Setup.pending=null;});
 await main.getByRole('status').filter({hasText:'İndirme durduruldu.'}).waitFor();assert.equal(await cancel.count(),0);assert.equal(await main.getByRole('alert').count(),0);
 await unlocked();
 assert.equal(await page.evaluate(()=>window.rc60Setup.refreshes),before.refreshes+1,'Acknowledged cancellation refreshes actual status once');
 await page.evaluate(()=>{window.rc60Setup.mode='transport-error';window.rc60Setup.status={ok:false,error:'LOCAL_BUSY',models:[],progress:{running:true,status:'model',completed:20,total:100}};});
 await refresh.click();await cancel.waitFor();const beforeRejected=await page.evaluate(()=>window.rc60Setup.refreshes);
 await cancel.click();await main.getByRole('alert').waitFor();assert.match(await main.getByRole('alert').textContent(),/işlemi tamamlanamadı/);
 await unlocked();
 assert.doesNotMatch(await main.getByRole('alert').textContent(),/PRIVATE|private\.invalid|model\.gguf/);
 assert.equal(await page.evaluate(()=>window.rc60Setup.refreshes),beforeRejected+1,'A rejected IPC request still refreshes actual progress');
 assert.equal(await cancel.isEnabled(),true);
 await page.evaluate(()=>{window.rc60Setup.mode='status-error';});await refresh.click();await main.getByRole('alert').waitFor();await unlocked();assert.equal(await refresh.isEnabled(),true,'A failed status refresh releases the action lock');
 await page.evaluate(()=>{window.rc60Setup.mode='ok';});await refresh.click();await page.waitForFunction(()=>!document.querySelector('#aya-setup-test [role=alert]'));
 assert.equal(await cancel.isEnabled(),true,'The setup remains usable after recovery');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC60_AYA_Setup_Cancel_Recovery.png'),animations:'disabled'});}
 // The optional larger model has its own loopback Ollama availability/progress.
 // An offline runtime never offers an action that would pretend to install it.
 const pull4B=main.getByRole('button',{name:'Ollama ile 4B modeli indir',exact:true}),cancel4B=main.getByRole('button',{name:'4B indirmeyi durdur',exact:true});
 await page.evaluate(()=>{window.rc60Setup.status={ok:false,models:[],progress:{running:false,status:'',completed:0,total:0},ollama:{online:false,progress:{running:false,status:'',completed:0,total:0}}};});
 await refresh.click();await unlocked();assert.equal(await pull4B.count(),0,'An offline Ollama has no enabled model-pull shortcut');assert.equal(await cancel4B.count(),0);
 await page.evaluate(()=>{window.rc60Setup.status={...window.rc60Setup.status,ok:true,ollama:{online:true,progress:{running:false,status:'',completed:0,total:0}}};});
 await refresh.click();await pull4B.waitFor();await unlocked();assert.equal(await pull4B.isEnabled(),true);
 const beforePull=await page.evaluate(()=>({pulls:window.rc60Setup.ollamaPulls,refreshes:window.rc60Setup.refreshes}));
 await pull4B.evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>window.rc60Setup.pendingPull);
 assert.equal(await page.evaluate(()=>window.rc60Setup.ollamaPulls),beforePull.pulls+1,'A same-turn double click starts only one Ollama model pull');
 assert.equal(await pull4B.isDisabled(),true);assert.equal(await refresh.isDisabled(),true);
 await page.evaluate(()=>{window.rc60Setup.pendingPull();window.rc60Setup.pendingPull=null;});await cancel4B.waitFor();await unlocked();
 assert.equal(await page.evaluate(()=>window.rc60Setup.refreshes),beforePull.refreshes+1,'Model-pull acknowledgement refreshes actual Ollama progress once');
 assert.equal(await page.evaluate(()=>window.rc60Setup.status.progress.running),false,'Managed progress remains separate from the Ollama pull');
 assert.equal(await page.evaluate(()=>window.rc60Setup.status.ollama.progress.running),true);assert.equal(await pull4B.isDisabled(),true);assert.equal(await cancel4B.isEnabled(),true);
 await page.evaluate(()=>{window.rc60Setup.ollamaMode='cancel-foreign';});await cancel4B.click();await main.getByRole('alert').waitFor();await unlocked();
 assert.match(await main.getByRole('alert').textContent(),/başka bir işlemde/);assert.equal(await cancel4B.isEnabled(),true);
 assert.equal(await page.evaluate(()=>window.rc60Setup.status.ollama.progress.running),true,'A rejected Ollama cancellation cannot claim the transfer stopped');
 const beforeOllamaCancel=await page.evaluate(()=>({cancels:window.rc60Setup.ollamaCancels,refreshes:window.rc60Setup.refreshes}));
 await page.evaluate(()=>{window.rc60Setup.ollamaMode='cancel-pending';});await cancel4B.evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>window.rc60Setup.pendingOllamaCancel);
 assert.equal(await page.evaluate(()=>window.rc60Setup.ollamaCancels),beforeOllamaCancel.cancels+1);assert.equal(await cancel4B.isDisabled(),true);assert.equal(await refresh.isDisabled(),true);
 await page.evaluate(()=>{window.rc60Setup.pendingOllamaCancel();window.rc60Setup.pendingOllamaCancel=null;});await page.waitForFunction(()=>!Array.from(document.querySelectorAll('#aya-setup-test button')).some(button=>button.textContent==='4B indirmeyi durdur'));await unlocked();
 assert.equal(await page.evaluate(()=>window.rc60Setup.refreshes),beforeOllamaCancel.refreshes+1);assert.equal(await main.getByRole('alert').count(),0);assert.equal(await pull4B.isEnabled(),true);
 const beforePullError=await page.evaluate(()=>window.rc60Setup.refreshes);
 await page.evaluate(()=>{window.rc60Setup.ollamaMode='pull-error';});await pull4B.click();await main.getByRole('alert').waitFor();await unlocked();
 assert.doesNotMatch(await main.getByRole('alert').textContent(),/PRIVATE|private\.invalid|model\.gguf/,'Ollama transport exceptions do not expose paths or URLs');
 assert.equal(await page.evaluate(()=>window.rc60Setup.refreshes),beforePullError+1);assert.equal(await pull4B.isEnabled(),true,'A failed Ollama request releases the setup lock');
 await page.evaluate(()=>{window.rc60Setup.ollamaMode='pull-pending';});await refresh.click();await unlocked();assert.equal(await main.getByRole('alert').count(),0);
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC61_AYA_Optional_Ollama_4B_Setup.png'),animations:'disabled'});}
 assert.deepEqual(errors,[],'Rejected cancellation/refresh has no unhandled rejection or React error');
 console.log(JSON.stringify({pass:true,realSetupComponent:true,foreignCancelShowsBusy:true,noFalseCancellationSuccess:true,sameTurnDoubleClickGuard:true,cancelAcknowledgementRefresh:true,rejectedCancelRefreshes:true,privateTransportDetailsExcluded:true,statusFailureReleasesLock:true,recoveryClearsError:true,optionalOllama4B:{offlineActionHidden:true,onlineActionAvailable:true,pullDoubleClickGuard:true,pullAcknowledgementRefresh:true,separateProgress:true,foreignCancelShowsBusy:true,cancelDoubleClickGuard:true,cancelAcknowledgementRefresh:true,privateTransportDetailsExcluded:true,failureReleasesLock:true},unhandledRejections:0,desktopIPC:'mock',nativeInference:false},null,2));
}catch(error){console.error(logs);throw error;}finally{await browser?.close();await stopServer();if(owned)await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});}
