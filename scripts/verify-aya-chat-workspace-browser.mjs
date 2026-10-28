import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Real AyaChat and Next route transitions; only the desktop transport is synthetic.
// Run sequentially with other browser fixtures because they share .next.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(root,'src/app/rc62-aya-workspace-preview');
const url='http://127.0.0.1:3073/rc62-aya-workspace-preview';
const workspaceKey='dentaya:aya-chat-workspace:v1';
const marker='RC62 AYA workspace browser fixture';
const fixture=`'use client';
// ${marker}: real route lifecycle, synthetic desktop transport only.
import {useEffect} from 'react';
import Link from 'next/link';
import AyaChat from '../ai/AyaChat';
import {readAyaState,saveAyaOptions,saveAyaSession,deleteAyaSession} from '@/lib/aya-local-state';
import {setLocale} from '@/lib/i18n';
export default function Fixture(){
 useEffect(()=>{setLocale('tr');Reflect.set(window,'rc62Work',{readAyaState,saveAyaOptions,saveAyaSession,deleteAyaSession});},[]);
 return <main style={{maxWidth:1120,margin:'auto',padding:16}}><Link id="leave-aya" href="/rc62-aya-workspace-preview/away">Leave AYA fixture</Link><section id="main-test" className="aya-page"><AyaChat/></section></main>;
}
`;
const awayFixture=`// ${marker}: route without AyaChat.
import Link from 'next/link';
export default function Away(){return <main><p>AYA fixture is unmounted.</p><Link id="return-aya" href="/rc62-aya-workspace-preview">Return to AYA fixture</Link></main>;}
`;
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const errors=[],screenshots=[];
let server,browser,owned=false,logs='',exitCode=null;
async function stopServer(){
 if(!server||server.exitCode!==null||server.signalCode)return;
 await new Promise(resolve=>{const timer=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill('SIGTERM');});
}
async function screenshot(locator,name){
 if(!process.env.DENTAYA_SCREENSHOT_DIR)return;
 await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});
 const file=path.join(process.env.DENTAYA_SCREENSHOT_DIR,name);
 await locator.screenshot({path:file,animations:'disabled'});screenshots.push(file);
}
function observe(page){
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(/hydration|maximum update depth|unique "key"/i.test(message.text()))errors.push(message.text());});
}
async function harness(){
 const context=await browser.newContext({viewport:{width:1366,height:960}});
 await context.addInitScript(()=>{
  const state=window.rc62Transport={mode:'ok',calls:[],pending:null,token:null,cancels:0,serial:0};
  window.dentayaDesktop={
   onOpenPreferences:()=>()=>{},
   localAyaStatus:async()=>({ok:true,models:[{name:'rc62-synthetic-model',size:1000}],progress:{running:false,status:'ready',completed:0,total:0}}),
   onLocalAyaToken:callback=>{state.token=callback;return()=>{if(state.token===callback)state.token=null;};},
   localAyaChat:async input=>{
    state.calls.push(input);
    if(input.task==='memory')return {ok:true,output:'Memory extraction only',workingMemory:input.workingMemory};
    if(state.mode==='error')return {ok:false,error:'LOCAL_TIMEOUT'};
    if(state.mode==='pending')return new Promise(resolve=>{state.pending={resolve,input};});
    state.serial++;return {ok:true,output:'MODEL OUTPUT SENTINEL '+state.serial+' · '+input.prompt};
   },
   localAyaCancel:async()=>{state.cancels++;const pending=state.pending;state.pending=null;pending?.resolve({ok:false,error:'LOCAL_CANCELLED'});return {ok:true};},
  };
 });
 const page=await context.newPage();observe(page);await page.goto(url);await ready(page);
 return {context,page};
}
async function ready(page){await page.waitForFunction(()=>window.rc62Work&&document.querySelector('#main-test .aya-status--model')&&!document.querySelector('#aya-local-message')?.disabled);}
const main=page=>page.locator('#main-test');
const input=page=>main(page).locator('#aya-local-message');
const normalCalls=page=>page.evaluate(()=>window.rc62Transport.calls.filter(call=>call.task!=='memory').length);
async function ask(page,prompt){
 const previous=await main(page).locator('.aya-message--assistant').count();
 await input(page).fill(prompt);await main(page).locator('.aya-chat-composer button[type=submit]').click();
 await main(page).locator('.aya-message--assistant').nth(previous).waitFor();await ready(page);
}
async function leave(page){await page.locator('#leave-aya').click();await page.locator('#return-aya').waitFor();assert.equal(await page.locator('#aya-local-message').count(),0,'The away route actually unmounts AyaChat');}
async function returnToAya(page){await page.locator('#return-aya').click();await ready(page);}
async function settings(page,panel){
 const shell=main(page);
 if(!await shell.locator('#aya-conversation-settings').count())await shell.getByRole('button',{name:'Sohbet ayarları',exact:true}).click();
 if(panel)await shell.getByRole('button',{name:panel,exact:true}).click();
}
async function historyOpen(page,title){await settings(page,'Geçmiş');await main(page).locator('.aya-history-item').filter({hasText:title}).locator('.aya-history-open').click();await ready(page);}
const workspace=page=>page.evaluate(key=>sessionStorage.getItem(key),workspaceKey);
try{
 try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');assert.ok(old.includes(marker),'Refusing to overwrite user source');}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(path.join(route,'away'),{recursive:true});owned=true;
 await fs.writeFile(path.join(route,'page.tsx'),fixture);await fs.writeFile(path.join(route,'away/page.tsx'),awayFixture);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3073'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+60000;let serverReady=false;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){serverReady=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(serverReady,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});

 // History OFF keeps the conversation only in this tab's live module cache.
 const temporary=await harness();
 // Some IMEs end composition with Enter/keyCode229 before isComposing resets.
 // Neither browser signal may dispatch a chat request or consume its draft.
 await temporary.page.evaluate(()=>window.rc62Work.saveAyaOptions({enterSends:true}));
 const imeDraft='RC62 IME taslağı gönderilmeden korunacak';
 await input(temporary.page).fill(imeDraft);
 for(const mode of ['isComposing','keyCode229']) {
  await input(temporary.page).evaluate((node,compositionMode)=>{
   const event=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true,isComposing:compositionMode==='isComposing'});
   if(compositionMode==='keyCode229')Object.defineProperty(event,'keyCode',{value:229});
   node.dispatchEvent(event);
  },mode);
  await temporary.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await normalCalls(temporary.page),0,'IME Enter '+mode+' cannot submit the chat draft');
  assert.equal(await input(temporary.page).inputValue(),imeDraft,'IME Enter '+mode+' preserves the complete draft');
 }
 await ask(temporary.page,'Geçmiş kapalıyken yalnız bu sekmedeki konuşma');
 const temporaryMessages=await main(temporary.page).locator('.aya-message').allTextContents();
 const temporaryDraft='  GEÇİCİ TASLAK\nHenüz gönderilmedi.  ';
 await input(temporary.page).fill(temporaryDraft);const temporaryCalls=await normalCalls(temporary.page);
 assert.equal(await workspace(temporary.page),null,'History OFF never writes draft recovery storage');
 await leave(temporary.page);await returnToAya(temporary.page);
 assert.deepEqual(await main(temporary.page).locator('.aya-message').allTextContents(),temporaryMessages,'Route return restores the in-process conversation with history OFF');
 assert.equal(await input(temporary.page).inputValue(),temporaryDraft,'Route return preserves every composer character');
 assert.equal(await normalCalls(temporary.page),temporaryCalls,'Restoring a workspace never auto-submits a question');
 assert.equal(await temporary.page.evaluate(()=>window.rc62Work.readAyaState().sessions.length),0);
 assert.equal(await workspace(temporary.page),null,'Process-only restoration does not opt the user into storage');
 await screenshot(main(temporary.page),'RC62_AYA_Temporary_Route_Return.png');
 await temporary.page.reload();await ready(temporary.page);
 assert.equal(await input(temporary.page).inputValue(),'','History OFF has no reload recovery');
 assert.equal(await main(temporary.page).locator('.aya-message').count(),0,'The process cache does not become transcript persistence');
 await temporary.context.close();

 const saved=await harness(),page=saved.page;
 await page.evaluate(()=>window.rc62Work.saveAyaOptions({saveHistory:true,useNote:true,note:'PRIVATE NOTE SENTINEL'}));
 await ask(page,'RC62 SESSION A');
 const sessionA=await page.evaluate(()=>window.rc62Work.readAyaState().sessions[0].id);
 const draftA='  TASLAK A\nİlk oturumun gönderilmemiş sorusu.  ';
 await input(page).fill(draftA);
 await main(page).getByRole('button',{name:'Yeni sohbet',exact:true}).click();
 assert.equal(await input(page).inputValue(),'','New conversation starts with an empty composer');
 assert.equal(await main(page).locator('.aya-message').count(),0);
 await ask(page,'RC62 SESSION B');
 const sessionB=await page.evaluate(()=>window.rc62Work.readAyaState().sessions[0].id);
 const draftB='TASLAK B · başka oturum';await input(page).fill(draftB);
 await historyOpen(page,'RC62 SESSION A');assert.equal(await input(page).inputValue(),draftA,'Opening A restores A draft rather than B draft');
 await historyOpen(page,'RC62 SESSION B');assert.equal(await input(page).inputValue(),draftB,'Returning to B preserves B draft');
 const storedWorkspace=JSON.parse(await workspace(page));
 assert.equal(storedWorkspace.version,1);assert.equal(storedWorkspace.lastActiveId,sessionB);
 assert.equal(storedWorkspace.drafts.find(entry=>entry.id===sessionA)?.draft,draftA);
 assert.equal(storedWorkspace.drafts.find(entry=>entry.id===sessionB)?.draft,draftB);
 assert.doesNotMatch(await workspace(page),/MODEL OUTPUT SENTINEL|PRIVATE NOTE SENTINEL|workingMemory|messages|references|diagnostic|streamingReply/,'Recovery storage contains draft metadata, never transcript, notes, memory or model output');

 // A different window's latest stored revision is authoritative on reload.
 const authoritativeMessages=[{role:'user',content:'RC62 SESSION B · newer stored question'},{role:'assistant',content:'AUTHORITATIVE REMOTE ANSWER',engine:'model'}];
 await page.evaluate(({id,messages})=>{const session=window.rc62Work.readAyaState().sessions.find(entry=>entry.id===id);window.rc62Work.saveAyaSession({...session,messages,updatedAt:session.updatedAt+1000});},{id:sessionB,messages:authoritativeMessages});
 const authoritativeBytes=await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1'));
 await page.reload();await ready(page);
 assert.match(await main(page).locator('.aya-message--assistant').textContent(),/AUTHORITATIVE REMOTE ANSWER/,'Reload loads current saved messages before applying draft metadata');
 assert.equal(await input(page).inputValue(),draftB);
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),authoritativeBytes,'Read-only restoration does not rewrite history or its revision');
 assert.equal(await normalCalls(page),0,'Reloaded drafts await an explicit send');

 // A real opener-created window receives a sessionStorage clone. That clone
 // can recover only its draft and cannot replace newer authoritative history.
 const popupPromise=page.waitForEvent('popup');await page.evaluate(target=>window.open(target,'_blank'),url);const cloned=await popupPromise;observe(cloned);await ready(cloned);
 assert.equal(await input(cloned).inputValue(),draftB,'An opener-created window exercises the browser sessionStorage clone behavior');
 const newerMessages=[{role:'user',content:'RC62 SESSION B · newest stored question'},{role:'assistant',content:'NEWEST AUTHORITATIVE ANSWER',engine:'model'}];
 await page.evaluate(({id,messages})=>{const session=window.rc62Work.readAyaState().sessions.find(entry=>entry.id===id);window.rc62Work.saveAyaSession({...session,messages,updatedAt:session.updatedAt+1000});},{id:sessionB,messages:newerMessages});
 const newestBytes=await page.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1'));
 await cloned.reload();await ready(cloned);
 assert.match(await main(cloned).locator('.aya-message--assistant').textContent(),/NEWEST AUTHORITATIVE ANSWER/);
 assert.equal(await input(cloned).inputValue(),draftB);
 assert.equal(await cloned.evaluate(()=>localStorage.getItem('dentaya:aya-core:v1')),newestBytes,'Cloned recovery metadata cannot overwrite authoritative saved history');
 await cloned.close();await page.reload();await ready(page);

 // Unmounting an unfinished real request keeps only the original question.
 const interrupted='RC62 ORİJİNAL BEKLEYEN SORU';
 await page.evaluate(()=>{window.rc62Transport.mode='pending';});await input(page).fill(interrupted);
 await main(page).locator('.aya-chat-composer button[type=submit]').click();await page.waitForFunction(()=>window.rc62Transport.pending);
 await page.evaluate(()=>{const pending=window.rc62Transport.pending;window.rc62Transport.token?.({requestId:pending.input.requestId,output:'UNFINISHED MODEL OUTPUT SENTINEL'});});
 await main(page).locator('[data-aya-streaming=conversation]').waitFor();
 const pendingCalls=await normalCalls(page);await leave(page);await returnToAya(page);
 assert.equal(await input(page).inputValue(),interrupted,'An interrupted real request restores its original question to the composer');
 await main(page).locator('.aya-draft-recovery[role=status]').waitFor();
 assert.equal(await normalCalls(page),pendingCalls,'Returning from an interrupted request never auto-retries');
 assert.doesNotMatch(await main(page).locator('.aya-message--assistant').allTextContents().then(values=>values.join('\n')),/UNFINISHED MODEL OUTPUT SENTINEL/,'Partial tokens cannot become completed assistant messages');
 assert.doesNotMatch(await workspace(page),/UNFINISHED MODEL OUTPUT SENTINEL/,'Partial model output never enters reload recovery');
 await screenshot(main(page),'RC62_AYA_Interrupted_Question_Recovery.png');
 await page.evaluate(()=>{window.rc62Transport.mode='ok';});
 await main(page).locator('.aya-draft-recovery').getByRole('button',{name:'Tekrar gönder',exact:true}).click();
 await ready(page);await main(page).locator('.aya-message--assistant').filter({hasText:interrupted}).waitFor();
 assert.equal(await normalCalls(page),pendingCalls+1,'Retry requires one explicit user action');
 assert.equal(await main(page).locator('.aya-message--user').filter({hasText:interrupted}).count(),1,'Retry does not duplicate the original user turn');

 // Diagnostics retain the unrelated draft and never become pending-question recovery.
 const diagnosticDraft='TANI SIRASINDA KORUNAN ÇALIŞMA TASLAĞI';await input(page).fill(diagnosticDraft);
 await settings(page,'Genel');await page.evaluate(()=>{window.rc62Transport.mode='pending';});
 await main(page).getByRole('button',{name:'Yerel yanıtı test et',exact:true}).click();await page.waitForFunction(()=>window.rc62Transport.pending);
 const diagnosticPrompt=await page.evaluate(()=>window.rc62Transport.pending.input.prompt);
 const diagnosticCalls=await normalCalls(page);await leave(page);await returnToAya(page);
 assert.equal(await input(page).inputValue(),diagnosticDraft,'Leaving during a diagnostic preserves the unrelated composer draft');
 assert.equal(await main(page).locator('.aya-draft-recovery').count(),0,'An interrupted diagnostic is not recovered as the user question');
 assert.equal(await normalCalls(page),diagnosticCalls);
 assert.ok(!(await workspace(page)).includes(diagnosticPrompt),'The fixed diagnostic prompt never enters draft recovery');
 assert.equal(await main(page).locator('.aya-diagnostic-result').count(),0,'Diagnostic results remain transient across route return');

 // The pending original question also survives a full reload when history is ON.
 await page.evaluate(()=>{window.rc62Transport.mode='pending';});const reloadQuestion='RC62 YENİLEMEDE KORUNACAK SORU';
 await input(page).fill(reloadQuestion);await main(page).locator('.aya-chat-composer button[type=submit]').click();await page.waitForFunction(()=>window.rc62Transport.pending);
 await page.reload();await ready(page);
 assert.equal(await input(page).inputValue(),reloadQuestion);await main(page).locator('.aya-draft-recovery[role=status]').waitFor();
 assert.equal(await normalCalls(page),0,'Reload recovers the interrupted question without submitting it');
 assert.doesNotMatch(await main(page).locator('.aya-message--assistant').allTextContents().then(values=>values.join('\n')),/UNFINISHED MODEL OUTPUT SENTINEL/);

 // Successful deletion removes its own cached draft, while other drafts remain.
 await settings(page,'Geçmiş');await main(page).locator('.aya-history-item').filter({hasText:'RC62 SESSION A'}).getByRole('button',{name:'Sil',exact:true}).click();
 assert.ok(!JSON.parse(await workspace(page)).drafts.some(entry=>entry.id===sessionA),'Deleting an inactive session evicts its cached draft');
 await main(page).locator('.aya-history-item').filter({hasText:'RC62 SESSION B'}).getByRole('button',{name:'Sil',exact:true}).click();
 assert.equal(await input(page).inputValue(),'','Deleting the active session creates an empty workspace');
 assert.ok(!JSON.parse(await workspace(page)).drafts.some(entry=>entry.id===sessionB),'Deleting the active session removes its recovery metadata');
 await page.reload();await ready(page);
 assert.equal(await main(page).locator('.aya-message').count(),0);assert.equal(await page.evaluate(()=>window.rc62Work.readAyaState().sessions.length),0,'Reload cannot resurrect a deleted conversation from draft metadata');

 // An externally deleted active id must not be restored by its stale draft.
 await ask(page,'RC62 EXTERNALLY DELETED SESSION');const externalId=await page.evaluate(()=>window.rc62Work.readAyaState().sessions[0].id);
 await input(page).fill('STALE DELETED SESSION DRAFT');await page.evaluate(id=>window.rc62Work.deleteAyaSession(id),externalId);
 await page.reload();await ready(page);
 assert.equal(await main(page).locator('.aya-message').count(),0);assert.equal(await input(page).inputValue(),'');
 assert.equal(await page.evaluate(()=>window.rc62Work.readAyaState().sessions.length),0,'A stale last-active id cannot recreate an externally deleted record');

 await ask(page,'RC62 PREFERENCE CLEAR SESSION');await input(page).fill('Taslak saklama tercihi kapanınca kaldırılacak');
 assert.ok(await workspace(page));await page.evaluate(()=>window.rc62Work.saveAyaOptions({saveHistory:false}));
 await page.waitForFunction(key=>sessionStorage.getItem(key)===null,workspaceKey);
 const beforeOff=await main(page).locator('.aya-message').allTextContents();const offDraft=await input(page).inputValue();await leave(page);await returnToAya(page);
 assert.deepEqual(await main(page).locator('.aya-message').allTextContents(),beforeOff);assert.equal(await input(page).inputValue(),offDraft,'Turning history OFF removes storage while preserving current tab work');
 assert.equal(await workspace(page),null,'Route return cannot re-create storage after history is disabled');
 await saved.context.close();
 assert.deepEqual(errors,[],'Workspace transitions produce no React, hydration or page errors');
 console.log(JSON.stringify({pass:true,realReactAndNextRoutes:true,historyOffProcessContinuity:true,imeEnterNeverSubmits:true,noHistoryOffReloadPersistence:true,perSessionDraftIsolation:true,newStartsEmpty:true,authoritativeReload:true,openerSessionStorageCloneCannotOverwriteHistory:true,interruptedQuestionRecovery:true,explicitRetryOnly:true,noPartialOutputPersistence:true,diagnosticRecoveryIsolation:true,reloadPendingQuestionRecovery:true,deleteEvictsDraft:true,deletedSessionCannotResurrect:true,historyOffClearsRecoveryImmediately:true,transportIsSynthetic:true,nativeInference:false,screenshots},null,2));
}catch(error){console.error(logs);throw error;}finally{
 await browser?.close();await stopServer();if(owned)await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(root,'.next/dev/types'),{recursive:true,force:true});
}
