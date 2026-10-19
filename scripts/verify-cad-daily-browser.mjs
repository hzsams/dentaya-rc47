import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { decodeCadWorkspace } from '../src/lib/cad-project-state.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222',caseId='33333333-3333-4333-8333-333333333333';
const unit=(code,i)=>({id:`unit-${code}-${i}`,tooth_code:code,anatomy_code:code,role:'abutment',design_type:'anatomic_crown',tooth_form:'natural',morphology_style:'balanced',material:'Zirkonya',attachment_type:'none',temporary:false,notes:''});
const circle=(x,y,z)=>Array.from({length:32},(_,i)=>({x:x+2*Math.cos(i*Math.PI/16),y:y+2*Math.sin(i*Math.PI/16),z}));
const caseRow={id:caseId,case_number:'CAD-RC40-IMPLANT',patient_id:'44444444-4444-4444-8444-444444444444',patient_reference:'SYNTHETIC',title:'İmplant dayanaklı günlük CAD kontrolü',case_type:'İmplant üstü kron',status:'design',priority:'normal',due_date:null,tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',clinical_notes:''};
let savedProject={id:'55555555-5555-4555-8555-555555555555',case_id:caseId,lab_org_id:orgId,source_scan_id:'scan-lower',title:'RC40 test',restoration_type:caseRow.case_type,tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',workflow_stage:'margin',status:'working',settings:{show_design:false,opacity:0,job_setup:{version:1,complete:true,active_unit_id:'unit-46-0',units:[unit('46',0),unit('47',1)],updated_at:null},unit_margins:{'unit-46-0':circle(12,-5,-1.75),'unit-47-1':circle(-16,4,-1.55)}},margin_points:circle(12,-5,-1.75),measurements:[],updated_at:new Date().toISOString()};
const group=new THREE.Group();
const block=new THREE.Mesh(new THREE.BoxGeometry(50,25,.6));block.position.x=6;group.add(block);
for(const [x,y,h] of [[18,-5,5],[-10,4,6.2]]){const g=new THREE.CylinderGeometry(2,2,h,32);g.rotateX(Math.PI/2);const post=new THREE.Mesh(g);post.position.set(x,y,h/2);group.add(post);}
group.updateMatrixWorld(true);const fixture=new STLExporter().parse(group);
let server,browser,logs='',serverExit=null,failWrites=false,holdWrite=null,clock=0;
const errors=[],writes=[],submissions=[];
const reorder=value=>value&&typeof value==='object'?Array.isArray(value)?value.map(reorder):Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;
try {
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3049'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-browser-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',d=>{logs=(logs+d).slice(-25000);});server.on('exit',c=>{serverExit=c;});
 const url='http://127.0.0.1:3049/design?case='+caseId,deadline=Date.now()+65000;
 while(Date.now()<deadline){if(serverExit!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);let body=[],status=200;
  const user={id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  if(req.method()==='OPTIONS')body={};
  else if(u.pathname.startsWith('/auth/'))body={user};
  else if(table==='memberships')body=[{organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
  else if(table==='organizations')body=[{id:orgId,name:'CAD Test Laboratuvarı',org_type:'laboratory'}];
  else if(table==='cases')body=[caseRow];
  else if(table==='scan_sessions')body=[{id:'scan-lower',scan_ref:'SYNTHETIC-ABUTMENTS',patient_id:caseRow.patient_id,case_id:caseId,arch:'lower',captured_at:'2026-10-14T10:00:00Z',file_name:'602.stl',storage_bucket:'public-demo',storage_path:'/training-scans/602.stl',scanner_brand:'Synthetic',scanner_model:'Geometry test',scan_origin:'laboratory',scan_purpose:'master_model'}];
  else if(u.pathname.includes('/storage/v1/object/')&&req.method()==='POST')body={Key:'dentaya-files/test-design.stl',Id:'66666666-6666-4666-8666-666666666666'};
  else if(table==='attachments')body=req.method()==='POST'?[{id:'66666666-6666-4666-8666-666666666666'}]:[];
  else if(table==='dentaya_submit_design_version'){
   submissions.push(req.postDataJSON());savedProject={...savedProject,settings:reorder(savedProject.settings),workflow_stage:'review',status:'ready_for_review',updated_at:new Date(Date.now()+ ++clock).toISOString()};body='77777777-7777-4777-8777-777777777777';
  }
  else if(table==='design_projects'){
   if(req.method()==='PATCH'){
    if(holdWrite)await holdWrite;
    if(failWrites){status=503;body={message:'Connection unavailable',code:'NETWORK_TEST'};}
    else if(u.searchParams.get('updated_at')!=='eq.'+savedProject.updated_at){status=406;body={code:'PGRST116',message:'The project changed concurrently'};}
    else {const data=req.postDataJSON();writes.push(data);savedProject={...savedProject,...data,updated_at:new Date(Date.now()+ ++clock).toISOString()};body=[savedProject];}
   }else body=[savedProject];
  }else if(table==='profiles')body=[{id:userId,display_name:'CAD Test'}];
  if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
  await route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
 });
 await page.route('**/training-scans/602.stl',route=>route.fulfill({status:200,contentType:'model/stl',body:fixture}));
 await page.addInitScript(({userId})=>{
  const model=window.rc47CadModel={ready:false,calls:[],pending:[],mode:'ok',cancels:0};
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},localAyaStatus:async()=>({ok:true,models:model.ready?[{name:'cad-model-fixture',size:1000}]:[],progress:{running:false,status:'ready',completed:0,total:0}}),localAyaChat:async input=>{
   model.calls.push(input);
   const result={ok:true,output:model.mode==='pending'?'Gecikmiş model yanıtı':'Mevcut üniteye ait kontrol önerisi',workingMemory:{goal:input.workingMemory?.goal||'46 ünitesinin gerçek kontrol sonuçlarını incele',decisions:['Kontrol kullanıcının onayı ile çalışır'],openQuestions:[]},proposals:input.prompt.startsWith('Yeni kontrol sonuçlarını')?[]:[{tool:'inspect',reason:'Mevcut ünite için geometri kontrolünü hesapla',scope:input.cadContext.scope,snapshot:input.cadContext.snapshot}]};
   if(model.mode==='pending')return new Promise(resolve=>model.pending.push(()=>resolve(result)));
   if(model.mode==='invalid')return {ok:false,error:'LOCAL_INVALID_PLAN'};
   return result;
  },localAyaCancel:async()=>{model.cancels++;return {ok:true};}};
  const exp=Math.floor(Date.now()/1000)+86400,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'graphite',grid:false,axes:false,damping:false}));
  localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
 },{userId});
 const ready=async()=>{await page.locator('.cad-professional').waitFor();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.match(/Tarama (senkronize|hazır)/),{},{timeout:55000});};
 const save=async()=>{const n=writes.length;await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click();const deadline=Date.now()+25000;while(writes.length<=n&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));assert.ok(writes.length>n);try{await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('CAD projesi kaydedildi.'));}catch(error){console.error('Save diagnostic',await page.locator('.cad-status-bar').textContent(),{writes:writes.length});throw error;}await page.waitForFunction(async()=>{const idle=()=>Array.from(document.querySelectorAll('.cad-main-header button')).some(button=>button.textContent?.trim()==='Kaydet'&&!button.disabled);if(!idle())return false;await new Promise(requestAnimationFrame);return idle();});return decodeCadWorkspace(savedProject.settings.cad_workspace);};
 const unitMesh=s=>s.units['unit-46-0'].geometry.positions;
 const frames=()=>page.evaluate(async()=>{for(let i=0;i<25;i++)await new Promise(requestAnimationFrame);});
 await page.goto(url);await ready();
 await page.getByRole('button',{name:'Sonraki',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cad-professional')?.dataset.cadTask==='fit');
 let snapshot=await save();const first=snapshot.units['unit-46-0'];
 assert.equal(savedProject.settings.show_design,true);assert.equal(savedProject.settings.opacity,1);assert.equal(first.anchor.placed,true);assert.ok(Math.abs(first.anchor.position[0]-12)<.001);assert.ok(Math.abs(first.anchor.position[1]+5)<.001);
 const z=first.base.filter((_,i)=>i%3===2);assert.ok(Math.max(...z)-Math.min(...z)<15,'Crown is sized from the local margin, not the whole arch');
 const poseZ=Math.min(...first.placementBase.filter((_,i)=>i%3===2));assert.ok(Math.abs(first.anchor.position[2]+poseZ+1.75)<.001);
 console.log('PASS: implant-abutment crown appears on its offset margin, sized locally.');
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 const aya=page.getByRole('dialog',{name:'AYA çalışma asistanı',exact:true});
 const ask=async text=>{await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill(text);await aya.getByRole('button',{name:'Gönder',exact:true}).click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();};
 await ask('Koleyı çizdim diş gelmiyor');
 assert.match(await aya.getByRole('log').textContent(),/46/);assert.match(await aya.getByRole('log').textContent(),/32/);
 assert.equal(await aya.locator('[data-check-id]').count(),7);await aya.locator('[data-aya-tool=inspect]').click();
 assert.equal(await aya.locator('[data-check-id=position]').getAttribute('data-check-state'),'ready');
 assert.match(await aya.locator('.aya-cad-evidence').textContent(),/Antagonist karşılaştırması yok/);
 const again=await save();assert.deepEqual(unitMesh(again),unitMesh(snapshot),'AYA workspace checks must not change the placed crown');
 console.log('PASS: live CAD-aware AYA works without a model; real checks preserve the mesh.');
 // A fake local bridge tests renderer integration; it is not native inference.
 await page.evaluate(()=>{window.rc47CadModel.ready=true;window.dispatchEvent(new Event('focus'));});
 await aya.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 const historyBefore=await page.locator('.cad-history-count').textContent(),writesBefore=writes.length;
 await ask('Şu anki dişe bakıp gerçek kontrolü önerebilir misin?');
 const inspectProposal=aya.locator('[data-proposal-tool=inspect]').last();await inspectProposal.waitFor();
 assert.equal(await page.locator('.cad-history-count').textContent(),historyBefore);assert.equal(writes.length,writesBefore,'A model suggestion must not execute CAD or save automatically');
 // Two clicks in the same event turn must still dispatch only one operation.
 await inspectProposal.getByRole('button',{name:'Uygula',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>window.rc47CadModel.calls.length===2);await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
 const interpreted=await page.evaluate(()=>window.rc47CadModel.calls.at(-1));
 assert.equal(interpreted.cadContext.unit,'46');assert.equal(interpreted.cadContext.report.contactReference,'unavailable');assert.equal(interpreted.cadContext.report.collisionSamples,undefined);assert.equal(interpreted.cadContext.recentActions.at(-1).tool,'inspect');assert.equal(interpreted.cadContext.recentActions.at(-1).ok,true);assert.equal(interpreted.workingMemory.goal,'46 ünitesinin gerçek kontrol sonuçlarını incele');
 assert.ok(interpreted.cadContext.report.triangles>0,'The next model turn receives the actual kernel report');
 assert.ok(await inspectProposal.getByRole('button').isDisabled(),'Applied suggestions become stale');
 // Invalid model output and cancellation retain the prompt and leave CAD usable.
 await page.evaluate(()=>{window.rc47CadModel.mode='invalid';});await ask('Hedefi değiştirmeden kontrol et');assert.equal(await aya.getByRole('textbox').inputValue(),'Hedefi değiştirmeden kontrol et');
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});
 await aya.getByRole('textbox').fill('İptal edilecek soru');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await aya.getByRole('button',{name:'Durdur',exact:true}).click();try{await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();}catch(error){console.error('Cancel diagnostic',await page.evaluate(()=>({calls:window.rc47CadModel.calls.map(c=>c.prompt),cancels:window.rc47CadModel.cancels,pending:window.rc47CadModel.pending.length})));throw error;}assert.equal(await aya.getByRole('textbox').inputValue(),'İptal edilecek soru');
 // A closed panel and a late bridge response must not commit a reply or its memory.
 await aya.getByRole('textbox').fill('Kapalı panele gecikecek soru');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await page.waitForFunction(()=>window.rc47CadModel.pending.length===2);await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();assert.doesNotMatch(await aya.getByRole('log').textContent(),/Gecikmiş model yanıtı/);
 // Unit switches isolate working memory and discard an outstanding plan.
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});await aya.getByRole('textbox').fill('Eski dişe ait gecikmiş öneri');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await page.waitForFunction(()=>window.rc47CadModel.pending.length===1);
 await page.getByRole('button',{name:'Diş 47',exact:true}).click();await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});
 assert.equal(await aya.getByRole('log').textContent(),'');assert.doesNotMatch(await aya.locator('.aya-working-memory').textContent(),/46 ünitesinin gerçek kontrol/);
 await page.getByRole('button',{name:'Diş 46',exact:true}).click();assert.match(await aya.locator('.aya-working-memory').textContent(),/46 ünitesinin gerçek kontrol/);assert.doesNotMatch(await aya.getByRole('log').textContent(),/Gecikmiş model yanıtı/);
 // A real asynchronous save result must reach a panel reopened while the save is pending.
 let finishAyaSave;holdWrite=new Promise(resolve=>{finishAyaSave=resolve;});await aya.locator('[data-aya-tool=save]').click();
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydediliyor…',exact:true}).waitFor();await aya.getByRole('button',{name:'Kapat',exact:true}).click();await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();assert.ok(await aya.getByRole('textbox').isDisabled(),'Reopened panel cannot start another model request during save');
 finishAyaSave();holdWrite=null;await aya.getByRole('log').getByText(/CAD işlem sonucu · Kaydet/).waitFor();await page.waitForFunction(()=>!document.querySelector('.cad-aya-panel textarea')?.disabled);
 await ask('Kaydın gerçek sonucunu dikkate alarak devam et');assert.equal((await page.evaluate(()=>window.rc47CadModel.calls.at(-1))).cadContext.recentActions.at(-1).tool,'save');assert.equal((await page.evaluate(()=>window.rc47CadModel.calls.at(-1))).cadContext.recentActions.at(-1).ok,true,JSON.stringify({event:(await page.evaluate(()=>window.rc47CadModel.calls.at(-1))).cadContext.recentActions.at(-1),status:await page.locator('.cad-status-bar').textContent()}));
 await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 console.log('PASS: click-only CAD tools, actual report follow-up, replay/double-click guards, invalid JSON recovery, cancellation, late close, pending save reopen and unit memory boundaries (mock local bridge).');
 const menu=page.locator('[data-cad-menu=app]');await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();
 await page.getByRole('tab',{name:'Serbest',exact:true}).click();
 if(await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).count())await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).click();await page.getByRole('button',{name:'Restorasyon tek başına göster',exact:true}).click();
 const sculpt=async()=>{
  await page.keyboard.press('Numpad8');await frames();await page.locator('.cad-tool-palette--compact [data-cad-tool=add]').click();
  const box=await page.locator('canvas').boundingBox();const before=await page.locator('.cad-history-count').textContent();
  for(const [dx,dy] of [[0,0],[0,-30],[-25,0],[25,0],[0,30]]){
   await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx+8,box.y+box.height/2+dy+5,{steps:5});await page.mouse.up();
   if((await page.locator('.cad-history-count').textContent())!==before)return;
  }throw Error('A real brush stroke did not hit the placed crown');
 };
 await sculpt();snapshot=await save();assert.notDeepEqual(unitMesh(snapshot),unitMesh(again));const edited=unitMesh(snapshot);
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 assert.match(await aya.locator('.aya-cad-evidence').textContent(),/Güncel geometri kontrolü yok/,'Sculpt invalidates old report evidence');
 await aya.locator('[data-aya-tool=undo]').click();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('Geri alındı'));
 const undone=await save();assert.deepEqual(unitMesh(undone),unitMesh(again),'AYA undo uses the real viewport history');
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});await aya.getByRole('textbox').fill('Değişen geometriye ait gecikmiş soru');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await page.waitForFunction(()=>window.rc47CadModel.pending.length===1);
 await page.locator('.cad-history-actions button[aria-label="Yinele"]').click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();assert.equal(await aya.getByRole('textbox').inputValue(),'Değişen geometriye ait gecikmiş soru');
 await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});assert.doesNotMatch(await aya.getByRole('log').textContent(),/Gecikmiş model yanıtı/);await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited,'Manual redo restores the same deterministic sculpted geometry');
 console.log('PASS: AYA undo and manual redo use real history; geometry changes invalidate a pending model reply and old evidence.');
 await page.getByRole('button',{name:'Diş 47',exact:true}).click();await page.locator('button[data-cad-stage=design]').click();
 snapshot=await save();assert.equal(snapshot.units['unit-47-1'].anchor.placed,true);assert.ok(Math.abs(snapshot.units['unit-47-1'].anchor.position[0]+16)<.001);
 await page.getByRole('button',{name:'Diş 46',exact:true}).click();snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited);
 assert.ok(await page.locator('.cad-history-actions button[aria-label="Geri al"]').isEnabled());
 const beforeReload=await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('dentaya-cad-recovery',1);request.onsuccess=()=>{const db=request.result,q=db.transaction('drafts','readonly').objectStore('drafts').getAll();q.onsuccess=()=>{resolve(q.result.map(d=>({savedAt:d.savedAt,sourceKey:d.sourceKey,unit:d.workspace.settings.job_setup.active_unit_id})));db.close();};};}));
 await page.reload();await ready();if(await page.locator('.cad-recovery-notice').count())console.error('Recovery diagnostic',{beforeReload,remoteSavedAt:savedProject.settings.cad_workspace.savedAt});assert.equal(await page.locator('.cad-recovery-notice').count(),0,'Acknowledged cloud saves should not present a stale recovery prompt');snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited);assert.equal(Object.keys(snapshot.units).length,2);
 console.log('PASS: sculpted topology, separate unit margins, unit switching and reopen survive cloud save.');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();await aya.locator('[data-aya-tool=inspect]').click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC40_CAD_AYA.png'),animations:'disabled',timeout:15000});await aya.getByRole('button',{name:'Kapat',exact:true}).click();}
 let release;holdWrite=new Promise(resolve=>{release=resolve;});
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet ve çık',exact:true}).click();
 const modal=page.locator('.cad-save-dialog[open]');await modal.waitFor();assert.ok(page.url().includes('/design'));assert.equal(await page.evaluate(()=>document.querySelector('.cad-save-dialog')?.matches(':modal')),true);
 release();holdWrite=null;await page.waitForURL('**/lab');
 console.log('PASS: save-and-exit waits for committed save, with background editing blocked.');
 await page.goto(url);await ready();
 await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();await page.getByRole('tab',{name:'Serbest',exact:true}).click();
 failWrites=true;await sculpt();
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet ve çık',exact:true}).click();await modal.waitFor();await modal.getByRole('button',{name:'Yerel kaydet ve çık',exact:true}).waitFor();assert.ok(page.url().includes('/design'));
 const readDrafts=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('dentaya-cad-recovery',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('drafts','readonly'),q=tx.objectStore('drafts').getAll();q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};}));
 const beforeExit=await readDrafts();assert.equal(beforeExit.length,1);const offlineMesh=unitMesh(beforeExit[0].workspace.designSnapshot);assert.notDeepEqual(offlineMesh,edited);
 await modal.getByRole('button',{name:'Yerel kaydet ve çık',exact:true}).click();await page.waitForURL('**/lab');assert.equal((await readDrafts())[0].retained,true);
 await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('dentaya-cad-recovery',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),q=store.getAll();q.onsuccess=()=>{for(const draft of q.result)store.put({...draft,savedAt:Date.now()-8*86400000});};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};r.onerror=()=>reject(r.error);}));
 await page.goto(url);await ready();assert.equal((await readDrafts()).length,1,'An intentional local checkpoint survives expiry pruning');await page.getByRole('button',{name:'Geri yükle',exact:true}).click();failWrites=false;snapshot=await save();assert.deepEqual(unitMesh(snapshot),offlineMesh);
 console.log('PASS: a failed remote save stays in CAD; explicit local exit and recovery retain all geometry.');
 // Publishing must include the exact geometry checkpoint, then accept the RPC timestamp despite JSONB key order.
 await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();await page.locator('button[data-cad-stage=review]').click();
 await page.getByRole('button',{name:'STL oluştur ve kliniğin onayına gönder',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('kliniğin onayına gönderildi'));
 assert.equal(submissions.length,1);assert.deepEqual(unitMesh(await decodeCadWorkspace(submissions[0].p_parameters.settings.cad_workspace)),offlineMesh);
 snapshot=await save();assert.deepEqual(unitMesh(snapshot),offlineMesh);
 console.log('PASS: publication saves complete geometry and save after publication accepts reordered JSONB metadata.');
 // A concurrent writer must be rejected rather than silently overwritten.
 savedProject.updated_at=new Date(Date.now()+100000).toISOString();
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet ve çık',exact:true}).click();await modal.waitFor();await modal.getByRole('button',{name:'Yerel kaydet ve çık',exact:true}).waitFor();assert.ok(page.url().includes('/design'));
 await modal.getByRole('button',{name:'Kapat',exact:true}).click();
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC40_CAD_daily.png'),animations:'disabled',timeout:15000});}
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,realEditor:true,realWebGL:true,syntheticImplantAbutments:true,localMarginSizing:true,hiddenZeroOpacityRecovered:true,ayaChecksDoNotChangeMesh:true,fullMeshPersistence:true,perUnitPersistence:true,cloudReopen:true,saveExitAcknowledged:true,modalEditGuard:true,offlineExitRecovery:true,retainedLocalCheckpoint:true,publishCheckpoint:true,saveAfterPublish:true,optimisticConflictRejected:true,ayaContextGuide:true,ayaModelBridge:'mock; no native inference',ayaProposalClickOnly:true,ayaActualQcFollowup:true,ayaLateReplyGuard:true,ayaScopedMemory:true,backend:'intercepted API fixture; no production data'},null,2));
}catch(error){console.error(logs);throw error;}finally{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}}
