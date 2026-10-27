import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(root,'src/app/rc62-aya-acceptance-preview'),url='http://127.0.0.1:3073/rc62-aya-acceptance-preview';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
let server,browser,page,owned=false,logs='',exitCode=null;const errors=[];
async function stopServer(){if(!server||server.exitCode!==null||server.signalCode)return;await new Promise(resolve=>{const timer=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill('SIGTERM');});}
try{
 try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');assert.ok(old.includes('RC62 AYA acceptance fixture'),'Refusing to overwrite user source');}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(route,{recursive:true});owned=true;await fs.copyFile(path.join(root,'scripts/fixtures/rc62-aya-acceptance.tsx'),path.join(route,'page.tsx'));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3073'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let ready=false;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1366,height:900},acceptDownloads:true});page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const state=window.rc62Acceptance={calls:[],cancels:0,mode:'gate',pendingGate:null,pendingChat:null,pendingCancelAck:null};
  for(const [key,value] of Object.entries({'dentaya:aya-core:v1':'PRIVATE_HISTORY_AND_MEMORY','dentaya:aya-knowledge:v1':'PRIVATE_NOTEBOOK'}))localStorage.setItem(key,value);
  window.rc62AcceptanceGate=async()=>state.mode==='gate'?await new Promise(resolve=>{state.pendingGate=resolve;}):true;
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},localAyaChat:async input=>{
   state.calls.push(input);
   if(state.mode==='pending')return await new Promise(resolve=>{state.pendingChat=resolve;});
   const workingMemory=input.task==='memory'?{goal:input.prompt.includes('kaldır')?'':input.prompt,decisions:['Dış konturu koru'],openQuestions:[]}:undefined;
   return {ok:true,output:`EXACT_REPLY_${state.calls.length}\n<literal> ${input.prompt}`,model:input.model,...(workingMemory?{workingMemory}:{}),...(input.cadContext?{proposals:[]}:{}),metrics:{milliseconds:7,tokens:9}};
  },localAyaCancel:async()=>{state.cancels++;return await new Promise(resolve=>{state.pendingCancelAck=()=>resolve({ok:true});});}};
 });
 await page.goto(url);const main=page.locator('#aya-acceptance-test');await main.locator('.aya-acceptance-panel').waitFor();
 assert.equal(await page.evaluate(()=>window.rc62Acceptance.calls.length),0,'Opening setup never starts model acceptance');
 const start=main.getByRole('button',{name:'Kabul oturumunu başlat',exact:true}),stop=main.getByRole('button',{name:'Kabul oturumunu durdur',exact:true});
 await start.evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>window.rc62Acceptance.pendingGate);
 assert.equal(await main.locator('#acceptance-busy').textContent(),'true','The global busy coordinator locks before asynchronous preflight');
 assert.equal(await main.locator('#ordinary-draft').isDisabled(),true);assert.equal(await main.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.rc62Acceptance.calls.length),0,'No model request overtakes preflight');
 await page.evaluate(()=>{window.rc62Acceptance.mode='ready';window.rc62Acceptance.pendingGate(true);});
 await main.getByRole('status').filter({hasText:'Oturum tamamlandı.'}).waitFor();
 assert.equal(await page.evaluate(()=>window.rc62Acceptance.calls.length),9,'A same-task double click produces one nine-step acceptance run');
 assert.equal(await main.locator('#acceptance-busy').textContent(),'false');assert.equal(await main.locator('#ordinary-draft').inputValue(),'UNSENT_PRIVATE_DRAFT');
 await main.locator('.aya-acceptance-transcript>summary').click();assert.equal(await main.locator('.aya-acceptance-transcript article').count(),9);
 assert.match(await main.locator('.aya-acceptance-transcript article').first().textContent(),/EXACT_REPLY_1\n<literal>/,'Raw replies remain text with original newlines and literal markup');
 const downloadEvent=page.waitForEvent('download');await main.getByRole('button',{name:'Kabul kaydını dışa aktar',exact:true}).click();const download=await downloadEvent;
 const report=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(report.steps.length,9);assert.equal(report.semanticReviewRequired,true);assert.equal(report.nativeInferenceVerified,false);assert.match(report.steps[0].output,/EXACT_REPLY_1\n<literal>/);
 const inputs=await page.evaluate(()=>window.rc62Acceptance.calls);
 for(const input of inputs){assert.deepEqual(input.history,[]);assert.deepEqual(input.knowledge,[]);assert.equal(input.useMemory,false);assert.equal(input.options.note,'');assert.equal(input.options.useKnowledge,false);assert.equal(input.options.useNote,false);assert.doesNotMatch(JSON.stringify(input),/UNSENT_PRIVATE_DRAFT|PRIVATE_HISTORY_AND_MEMORY|PRIVATE_NOTEBOOK/);}
 assert.equal(inputs.filter(input=>input.task==='memory').length,2);assert.equal(inputs.filter(input=>input.cadContext).length,2);
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),'PRIVATE_HISTORY_AND_MEMORY');assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-knowledge:v1')),'PRIVATE_NOTEBOOK','Synthetic acceptance never writes the notebook');
 await page.evaluate(()=>{window.rc62Acceptance.mode='pending';});await start.click();await page.waitForFunction(()=>window.rc62Acceptance.pendingChat);await stop.click();
 await main.getByRole('status').filter({hasText:'Oturum durduruldu.'}).waitFor();await page.waitForFunction(()=>window.rc62Acceptance.pendingCancelAck);
 assert.equal(await main.locator('#acceptance-busy').textContent(),'true','A stopped report does not release the engine while cancel acknowledgement and chat are pending');assert.equal(await start.isDisabled(),true);
 await page.evaluate(()=>{window.rc62Acceptance.pendingCancelAck();});
 assert.equal(await main.locator('#acceptance-busy').textContent(),'true','Cancel acknowledgement alone cannot release the still-pending native chat');
 await page.evaluate(()=>{window.rc62Acceptance.pendingChat({ok:false,error:'LOCAL_CANCELLED'});window.rc62Acceptance.pendingChat=null;});
 await page.waitForFunction(()=>document.querySelector('#acceptance-busy')?.textContent==='false');assert.equal(await main.getByRole('alert').count(),0,'User cancellation has a stopped status without a generic failure alert');assert.equal(await page.evaluate(()=>window.rc62Acceptance.cancels),1,'One cancellation sends one native cancel request');assert.equal(await main.locator('#ordinary-draft').inputValue(),'UNSENT_PRIVATE_DRAFT');
 assert.equal(await main.locator('.aya-acceptance-transcript article').count(),0,'Cancelling a new acceptance run never redisplays the previous completed report');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC62_AYA_Acceptance_Isolated.png'),animations:'disabled'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,explicitStart:true,sameTurnDoubleClick:true,preflightBusyCoordinator:true,nineSyntheticSteps:true,fullRawTranscriptAndExport:true,isolatedHistoryNotebookDraft:true,cancel:true,desktopIPC:'mock',nativeInference:false,semanticReviewRequired:true},null,2));
}catch(error){console.error(logs);if(page&&!page.isClosed())console.error(JSON.stringify(await page.evaluate(()=>({fixture:window.rc62Acceptance,status:[...document.querySelectorAll('[role=status],[role=alert]')].map(n=>n.textContent),busy:document.querySelector('#acceptance-busy')?.textContent,errors:document.querySelector('nextjs-portal')?.textContent})).catch(()=>null),null,2));console.error(errors);throw error;}finally{await browser?.close();await stopServer();if(owned)await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});}
