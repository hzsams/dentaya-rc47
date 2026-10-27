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
  const state=window.rc60Setup={mode:'foreign',cancels:0,refreshes:0,pending:null,status:{ok:false,error:'LOCAL_BUSY',models:[],progress}};
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},
   localAyaStatus:async()=>{state.refreshes++;if(state.mode==='status-error')throw Error('PRIVATE status transport detail');return state.status;},
   localAyaInstallCancel:async()=>{
    state.cancels++;
    if(state.mode==='foreign')return {ok:false,error:'LOCAL_BUSY'};
    if(state.mode==='transport-error')throw Error('PRIVATE C:\\user\\model.gguf https://private.invalid');
    if(state.mode==='pending')return new Promise(resolve=>{state.pending=()=>{state.status={ok:true,models:[],progress:{running:false,status:'cancelled',completed:10,total:100}};resolve({ok:true});};});
    return {ok:true};
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
 assert.deepEqual(errors,[],'Rejected cancellation/refresh has no unhandled rejection or React error');
 console.log(JSON.stringify({pass:true,realSetupComponent:true,foreignCancelShowsBusy:true,noFalseCancellationSuccess:true,sameTurnDoubleClickGuard:true,cancelAcknowledgementRefresh:true,rejectedCancelRefreshes:true,privateTransportDetailsExcluded:true,statusFailureReleasesLock:true,recoveryClearsError:true,unhandledRejections:0,desktopIPC:'mock',nativeInference:false},null,2));
}catch(error){console.error(logs);throw error;}finally{await browser?.close();await stopServer();if(owned)await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});}
