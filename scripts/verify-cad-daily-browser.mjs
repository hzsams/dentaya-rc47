import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { decodeCadWorkspace } from '../src/lib/cad-project-state.ts';
import { normalizeWorkspace } from '../electron/aya/agent.cjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222',caseId='33333333-3333-4333-8333-333333333333',secondCaseId='99999999-9999-4999-8999-999999999999';
const unit=(code,i)=>({id:`unit-${code}-${i}`,tooth_code:code,anatomy_code:code,role:'abutment',design_type:'anatomic_crown',tooth_form:'natural',morphology_style:'balanced',material:'Zirkonya',attachment_type:'none',temporary:false,notes:''});
const circle=(x,y,z)=>Array.from({length:32},(_,i)=>({x:x+2*Math.cos(i*Math.PI/16),y:y+2*Math.sin(i*Math.PI/16),z}));
const caseRow={id:caseId,case_number:'CAD-RC40-IMPLANT',patient_id:'44444444-4444-4444-8444-444444444444',patient_reference:'SYNTHETIC',title:'İmplant dayanaklı günlük CAD kontrolü',case_type:'İmplant üstü kron',status:'design',priority:'normal',due_date:null,tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',clinical_notes:''};
let savedProject={id:'55555555-5555-4555-8555-555555555555',case_id:caseId,lab_org_id:orgId,source_scan_id:'scan-lower',title:'RC40 test',restoration_type:caseRow.case_type,tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',workflow_stage:'margin',status:'working',settings:{show_design:false,opacity:0,job_setup:{version:1,complete:true,active_unit_id:'unit-46-0',units:[unit('46',0),unit('47',1)],updated_at:null},unit_margins:{'unit-46-0':circle(12,-5,-1.75),'unit-47-1':circle(-16,4,-1.55)}},margin_points:circle(12,-5,-1.75),measurements:[],updated_at:new Date().toISOString()};
const secondCase={...caseRow,id:secondCaseId,patient_id:'88888888-8888-4888-8888-888888888888',case_number:'CAD-SECOND-CASE',title:'Ayrı CAD vaka geçişi'};
let secondProject={...structuredClone(savedProject),id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',case_id:secondCaseId,source_scan_id:'scan-second'};
const group=new THREE.Group();
const block=new THREE.Mesh(new THREE.BoxGeometry(50,25,.6));block.position.x=6;group.add(block);
for(const [x,y,h] of [[18,-5,5],[-10,4,6.2]]){const g=new THREE.CylinderGeometry(2,2,h,32);g.rotateX(Math.PI/2);const post=new THREE.Mesh(g);post.position.set(x,y,h/2);group.add(post);}
group.updateMatrixWorld(true);const fixture=new STLExporter().parse(group);
let server,browser,logs='',serverExit=null,failWrites=false,failTargetReads=false,holdWrite=null,clock=0;
const errors=[],writes=[],submissions=[],requestLog=[],patchResults=[],navigationLog=[];
const suiteStarted=Date.now();
const reorder=value=>value&&typeof value==='object'?Array.isArray(value)?value.map(reorder):Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;
try {
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3049'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-browser-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',d=>{logs=(logs+d).slice(-25000);});server.on('exit',c=>{serverExit=c;});
 const url='http://127.0.0.1:3049/design?case='+caseId,deadline=Date.now()+65000;
 while(Date.now()<deadline){if(serverExit!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',request=>{if(request.url().includes('/design'))navigationLog.push({at:Date.now()-suiteStarted,url:request.url(),kind:request.resourceType(),navigation:request.isNavigationRequest()});});
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);let body=[],status=200;
  const user={id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  if(req.method()==='OPTIONS')body={};
  else if(u.pathname.startsWith('/auth/'))body={user};
  else if(table==='memberships')body=[{organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
  else if(table==='organizations')body=[{id:orgId,name:'CAD Test Laboratuvarı',org_type:'laboratory'}];
  else if(table==='cases')body=[caseRow,secondCase];
  else if(table==='scan_sessions'){const second=u.searchParams.get('patient_id')==='eq.'+secondCase.patient_id;body=[{id:second?'scan-second':'scan-lower',scan_ref:'SYNTHETIC-ABUTMENTS',patient_id:second?secondCase.patient_id:caseRow.patient_id,case_id:second?secondCaseId:caseId,arch:'lower',captured_at:'2026-10-14T10:00:00Z',file_name:'602.stl',storage_bucket:'public-demo',storage_path:'/training-scans/602.stl',scanner_brand:'Synthetic',scanner_model:'Geometry test',scan_origin:'laboratory',scan_purpose:'master_model'}];}
  else if(u.pathname.includes('/storage/v1/object/')&&req.method()==='POST')body={Key:'dentaya-files/test-design.stl',Id:'66666666-6666-4666-8666-666666666666'};
  else if(table==='attachments')body=req.method()==='POST'?[{id:'66666666-6666-4666-8666-666666666666'}]:[];
  else if(table==='dentaya_submit_design_version'){
   submissions.push(req.postDataJSON());savedProject={...savedProject,settings:reorder(savedProject.settings),workflow_stage:'review',status:'ready_for_review',updated_at:new Date(Date.now()+ ++clock).toISOString()};body='77777777-7777-4777-8777-777777777777';
  }
  else if(table==='design_projects'){
   if(req.method()==='PATCH'){
    const payload=req.postDataJSON(),entry={at:Date.now()-suiteStarted,method:'PATCH',id:u.searchParams.get('id'),expected:u.searchParams.get('updated_at'),unit:payload.settings?.job_setup?.active_unit_id,stage:payload.workflow_stage,localSavedAt:payload.settings?.cad_workspace?.savedAt,held:Boolean(holdWrite)};requestLog.push(entry);
    const heldAt=Date.now();if(holdWrite)await holdWrite;entry.heldMillis=Date.now()-heldAt;entry.transportFailure=req.failure()?.errorText??null;
    const second=u.searchParams.get('id')==='eq.'+secondProject.id,current=second?secondProject:savedProject;entry.serverVersion=current.updated_at;
    if(failWrites){status=503;body={message:'Connection unavailable',code:'NETWORK_TEST'};}
    else if(u.searchParams.get('updated_at')!=='eq.'+current.updated_at){status=406;body={code:'PGRST116',message:'The project changed concurrently'};}
    else {const data=payload;writes.push(data);const updated={...current,...data,updated_at:new Date(Date.now()+ ++clock).toISOString()};if(second)secondProject=updated;else savedProject=updated;body=[updated];}
    entry.status=status;entry.responseVersion=Array.isArray(body)?body[0]?.updated_at:null;patchResults.push(entry);
   }else{const current=u.searchParams.get('case_id')==='eq.'+secondCaseId?secondProject:savedProject;requestLog.push({at:Date.now()-suiteStarted,method:'GET',case:u.searchParams.get('case_id'),serverVersion:current.updated_at});if(failTargetReads&&u.searchParams.get('case_id')==='eq.'+secondCaseId){status=503;body={message:'Target case temporarily unavailable',code:'NETWORK_TEST'};}else body=[current];}
  }else if(table==='profiles')body=[{id:userId,display_name:'CAD Test'}];
  if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
  await route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
 });
 await page.route('**/training-scans/602.stl',route=>route.fulfill({status:200,contentType:'model/stl',body:fixture}));
 await page.addInitScript(({userId})=>{
  const openRecovery=indexedDB.open.bind(indexedDB);
  window.rc51RecoveryReads=[];
  indexedDB.open=(...args)=>{
   const request=openRecovery(...args);
   if(args[0]==='dentaya-cad-recovery')request.addEventListener('success',event=>{
    if(sessionStorage.getItem('rc51:hold-recovery')!=='yes')return;
    event.stopImmediatePropagation();
    window.rc51RecoveryReads.push(()=>request.dispatchEvent(new Event('success')));
   },{capture:true});
   return request;
  };
  const model=window.rc47CadModel={ready:false,calls:[],pending:[],mode:'ok',cancels:0};
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},localAyaStatus:async()=>({ok:true,models:model.ready?[{name:'cad-model-fixture',size:1000}]:[],progress:{running:false,status:'ready',completed:0,total:0}}),localAyaChat:async input=>{
   model.calls.push(input);
   const result={ok:true,output:model.mode==='pending'?'Gecikmiş model yanıtı':'Mevcut üniteye ait kontrol önerisi',workingMemory:{goal:input.workingMemory?.goal||'46 ünitesinin gerçek kontrol sonuçlarını incele',decisions:['Kontrol kullanıcının onayı ile çalışır'],openQuestions:[]},proposals:input.prompt.startsWith('Yeni kontrol sonuçlarını')?[]:[{tool:'inspect',reason:'Mevcut ünite için geometri kontrolünü hesapla',scope:input.cadContext.scope,snapshot:input.cadContext.snapshot}]};
   if(model.mode==='pending')return new Promise(resolve=>model.pending.push(()=>resolve(result)));
   if(model.mode==='invalid')return {ok:false,error:'LOCAL_INVALID_PLAN'};
   if(model.mode==='engine-memory')return {ok:false,error:'AYA_ENGINE_MEMORY'};
   return result;
  },localAyaCancel:async()=>{model.cancels++;return {ok:true};}};
  const exp=Math.floor(Date.now()/1000)+86400,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'graphite',grid:false,axes:false,damping:false}));
  localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
 },{userId});
 const ready=async()=>{await page.locator('.cad-professional').waitFor();await page.waitForFunction(()=>{const canvas=document.querySelector('.cad-professional canvas'),exit=Array.from(document.querySelectorAll('.cad-main-header button')).find(button=>button.textContent?.trim()==='Kaydet ve çık');return canvas instanceof HTMLCanvasElement&&canvas.width>0&&canvas.height>0&&exit&&!exit.disabled&&!document.querySelector('.cad-save-dialog')?.open;},{},{timeout:55000});};
 const save=async()=>{
  const observed=patchResults.length,writeCount=writes.length;
  const [response]=await Promise.all([page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname.endsWith('/design_projects')),page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click()]);
  assert.equal(response.status(),200,'The save must receive a successful server response');
  const acknowledgement=await response.json();assert.equal(acknowledgement.id,savedProject.id);assert.ok(acknowledgement.updated_at);
  await page.waitForFunction(async()=>{const idle=()=>document.querySelector('.cad-save-state')?.getAttribute('data-save-state')==='saved'&&Array.from(document.querySelectorAll('.cad-main-header button')).some(button=>button.textContent?.trim()==='Kaydet'&&!button.disabled);if(!idle())return false;await new Promise(requestAnimationFrame);return idle();});
  assert.ok(writes.length>writeCount,'A complete scene was written');
  assert.ok(patchResults.slice(observed).every(result=>result.status===200),'A failed or conflicting queued save must remain a test failure');
  return decodeCadWorkspace(savedProject.settings.cad_workspace);
 };
 const unitMesh=s=>s.units['unit-46-0'].geometry.positions;
 const frames=()=>page.evaluate(async()=>{for(let i=0;i<25;i++)await new Promise(requestAnimationFrame);});
 // Intentional network holds must begin after the editor's 900ms scheduled autosave.
 // Otherwise an autosave can block Playwright's Save actionability wait until the real 20s timeout.
 const settleAutosave=async()=>{await page.waitForTimeout(1100);await page.waitForFunction(()=>Array.from(document.querySelectorAll('.cad-main-header button')).some(button=>button.textContent?.trim()==='Kaydet'&&!button.disabled));};
 const navigateModule=async href=>{
  await page.locator('.cad-main-header').getByRole('button',{name:'Modüller',exact:true}).click();
  const modules=page.locator('.desktop-module-menu');await modules.waitFor({state:'visible'});
  await modules.locator('input[type="search"]').fill(href==='/design'?'CAD çalışma alanı':href==='/ai'?'AYA çalışma asistanı':'Çalışma alanı');
  await modules.locator(`a[href="${href}"]`).click();await modules.waitFor({state:'hidden'});
 };
 const selectStage=async stage=>{
  const workflow=page.locator('[data-cad-menu=workflow]');
  if(await workflow.getAttribute('open')===null)await workflow.locator('summary').click();
  await workflow.locator(`button[data-cad-stage=${stage}]`).click();await page.keyboard.press('Escape');
 };

 await page.goto(url);await ready();
 const openCaseUrl=page.url();await navigateModule('/design');assert.equal(page.url(),openCaseUrl,'The active Design module preserves its open case');
 // Both docks share the left column, leaving one continuous canvas beside them.
 const inspectorPanel=page.locator('.cad-floating-panel');
 assert.equal(await inspectorPanel.getAttribute('data-docked'),'true');
 await frames();
 const dockedScene=await page.locator('.cad-scene-viewport').boundingBox(),objectDock=await page.locator('.cad-object-panel').boundingBox(),parameterDock=await inspectorPanel.boundingBox();
 assert.ok(dockedScene.x>=objectDock.x+objectDock.width-1,'The object manager stays beside the canvas');
 assert.ok(dockedScene.x>=parameterDock.x+parameterDock.width-1,'The parameter inspector stays beside the canvas');
 assert.ok(objectDock.y+objectDock.height<=parameterDock.y+1,'The object manager and parameter inspector are stacked without overlap');
 for(const dock of [objectDock,parameterDock])assert.ok(dock.x>=0&&dock.y>=0&&dock.x+dock.width<=1600&&dock.y+dock.height<=1000,'The left docks remain inside the application window');
 assert.ok(dockedScene.width>700&&dockedScene.height>600,'The actual 3D scene remains the dominant work area');
 await page.evaluate(()=>{window.__cadDockCanvas=document.querySelector('.cad-professional canvas');});
 await inspectorPanel.getByRole('button',{name:'Araç panelini taşı',exact:true}).press('Shift+ArrowRight');
 await page.waitForFunction(()=>document.querySelector('.cad-floating-panel')?.dataset.docked==='false');
 await frames();
 assert.ok((await page.locator('.cad-scene-viewport').boundingBox()).width>=dockedScene.width-2,'Detaching the inspector preserves the continuous 3D scene');
 const detached=await inspectorPanel.boundingBox();assert.ok(detached.x>=0&&detached.y>=0&&detached.x+detached.width<=1600&&detached.y+detached.height<=1000,'The detached inspector stays inside the window');
 assert.ok(await page.evaluate(()=>window.__cadDockCanvas===document.querySelector('.cad-professional canvas')),'Dock changes preserve the WebGL canvas');
 await inspectorPanel.getByRole('button',{name:/^Paneli .*sabitle$/,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cad-floating-panel')?.dataset.docked==='true');
 await frames();
 assert.ok(Math.abs((await page.locator('.cad-scene-viewport').boundingBox()).width-dockedScene.width)<2,'Docking restores the measured scene column');
 const restoredDock=await inspectorPanel.boundingBox();assert.ok(Math.abs(restoredDock.x-parameterDock.x)<2&&Math.abs(restoredDock.y-parameterDock.y)<2,'Redocking restores the left parameter panel');
 assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:cad-floating-panel-v3')),null,'Docking clears the detached position');
 console.log('PASS: measured left-stacked docks, continuous real canvas, keyboard detach and explicit redock.');
 await page.getByRole('button',{name:'Sonraki',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cad-professional')?.dataset.cadTask==='fit');
 let snapshot=await save();const first=snapshot.units['unit-46-0'];
 assert.equal(savedProject.settings.show_design,true);assert.equal(savedProject.settings.opacity,1);assert.equal(first.anchor.placed,true);assert.ok(Math.abs(first.anchor.position[0]-12)<.001);assert.ok(Math.abs(first.anchor.position[1]+5)<.001);
 const z=first.base.filter((_,i)=>i%3===2);assert.ok(Math.max(...z)-Math.min(...z)<15,'Crown is sized from the local margin, not the whole arch');
 const poseZ=Math.min(...first.placementBase.filter((_,i)=>i%3===2));assert.ok(Math.abs(first.anchor.position[2]+poseZ+1.75)<.001);
 console.log('PASS: implant-abutment crown appears on its offset margin, sized locally.');
 if(process.env.DENTAYA_CAD_QUALITY_ONLY==='1'){
  // Focused visual regression: reuse the real scan, placed crown and editor above.
  // Keep the complete workflow suite as the default; this branch only measures quality rows.
  await page.locator('[data-cad-menu=app]>summary').click();
  await page.getByRole('button',{name:'Uzman',exact:true}).click();
  await selectStage('review');
  const measurements=[];
  for(const viewport of [{width:1366,height:768},{width:1600,height:1000}]){
   await page.setViewportSize(viewport);await frames();
   const rows=await page.locator('.cad-inspector-section[open] .cad-quality-row').evaluateAll(nodes=>nodes.map(row=>{
    const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const text=row.children[1],parts=Array.from(text.children).map(part=>{const range=document.createRange();range.selectNodeContents(part);return {tag:part.tagName,text:part.textContent,lines:Array.from(range.getClientRects()).map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom}))};});
    return {row:rect(row),icon:rect(row.children[0]),text:rect(text),parts};
   }));
   assert.equal(rows.length,4,'The real final review must display all four quality rows');
   for(const [index,value] of rows.entries()){
    assert.ok(value.text.width>100,`Quality text receives usable width at ${viewport.width}px`);
    assert.ok(value.icon.width<=40&&value.text.width>value.icon.width*2,'The status icon leaves the quality text usable space');
    for(const part of value.parts)for(const line of part.lines){
     assert.ok(line.left>=value.row.left-1&&line.right<=value.row.right+1,`${part.text} stays within its row horizontally`);
     assert.ok(line.top>=value.row.top-1&&line.bottom<=value.row.bottom+1,`${part.text} stays within its row vertically`);
    }
    const title=value.parts[0].lines,detail=value.parts[1].lines;
    assert.ok(Math.max(...title.map(line=>line.bottom))<=Math.min(...detail.map(line=>line.top))+1,'Quality title and detail do not overlap');
    if(index)assert.ok(rows[index-1].row.bottom<=value.row.top+1,'Adjacent quality rows do not overlap');
   }
   measurements.push({viewport,rows});
   if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,`RC48_CAD_quality_${viewport.width}.png`),animations:'disabled',timeout:15000});}
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,visualOnly:true,realEditor:true,realWebGL:true,placedImplantCrown:true,qualityRowsContained:true,qualityRowsDoNotOverlap:true,measurements,backend:'intercepted API fixture; no production data'},null,2));
 }else{
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 const aya=page.getByRole('dialog',{name:'AYA çalışma asistanı',exact:true});
 await page.setViewportSize({width:1366,height:768});await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).waitFor();const composerBox=await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).boundingBox();assert.ok(composerBox&&composerBox.y+composerBox.height<768,'The composer remains reachable on a laptop screen');
 // The knowledge notebook also contains a textarea. Opening during autosave
 // must focus the message composer after it becomes enabled.
 await page.waitForFunction(()=>document.activeElement===document.querySelector('.cad-aya-panel > form textarea'));
 await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill('Bu ünite için henüz göndermediğim soru');
 await page.keyboard.press('Escape');assert.equal(await aya.count(),0);assert.equal(await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).evaluate(button=>document.activeElement===button),true,'Closing the sidebar restores keyboard focus');await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();await page.setViewportSize({width:1600,height:1000});
 assert.equal(await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).inputValue(),'Bu ünite için henüz göndermediğim soru','Closing and reopening the same CAD unit preserves an unsent draft');
 const ask=async text=>{await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill(text);await aya.getByRole('button',{name:'Gönder',exact:true}).click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();};
 await aya.getByRole('combobox',{name:'Yanıt kaynağı',exact:true}).selectOption('guide');
 // Explicit tool guide uses current host context without impersonating inference.
 // A catalogue placement definition is not evidence of a live scene assessment.
 await ask('Güncel çalışma durumunu değerlendir ve sıradaki adımı öner.');
 assert.match(await aya.getByRole('log').textContent(),/Çalışma ünitesi: 46/);
 assert.equal(await aya.locator('[data-proposal-tool=inspect]').count(),1,'The scoped review offers the actual available geometry check');
 assert.equal(await aya.locator('[data-check-id]').count(),7);await aya.locator('[data-aya-tool=inspect]').click();
 assert.equal(await aya.locator('[data-check-id=position]').getAttribute('data-check-state'),'ready');
 assert.match(await aya.locator('.aya-cad-evidence').textContent(),/Antagonist karşılaştırması yok/);
 const again=await save();assert.deepEqual(unitMesh(again),unitMesh(snapshot),'AYA workspace checks must not change the placed crown');
 console.log('PASS: explicitly selected CAD tool guide uses live context; real manual checks preserve the mesh.');
 // A fake local bridge tests renderer integration; it is not native inference.
 await page.evaluate(()=>{window.rc47CadModel.ready=true;window.dispatchEvent(new Event('focus'));});
 await aya.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 await aya.getByRole('combobox',{name:'Yanıt kaynağı',exact:true}).selectOption('conversation');
 await page.setViewportSize({width:1366,height:768});await aya.locator('.cad-aya-context>summary').click();const contextComposer=await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).boundingBox(),sendControl=await aya.getByRole('button',{name:'Gönder',exact:true}).boundingBox();assert.ok(contextComposer&&sendControl&&contextComposer.y+contextComposer.height<768&&sendControl.y+sendControl.height<768,'Open workspace context must not push the composer or send button off screen');await aya.locator('.cad-aya-context>summary').click();await page.setViewportSize({width:1600,height:1000});

 const historyBefore=await page.locator('.cad-history-count').textContent(),writesBefore=writes.length;
 await ask('Şu anki dişe bakıp gerçek kontrolü önerebilir misin?');
 const inspectProposal=aya.locator('[data-proposal-tool=inspect]').last();await inspectProposal.waitFor();
 const preInspect=await page.evaluate(()=>window.rc47CadModel.calls.at(-1).cadContext);
 assert.equal(await page.locator('.cad-history-count').textContent(),historyBefore);assert.equal(writes.length,writesBefore,'A model suggestion must not execute CAD or save automatically');
 // An automatic result interpretation must not consume the user's next unsent question.
 const unsentCadDraft='Bir sonraki sorum: bu ünitenin formunu nasıl korurum?';
 await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill(unsentCadDraft);
 // Two clicks in the same event turn must still dispatch only one operation.
 await inspectProposal.getByRole('button',{name:'Uygula',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>window.rc47CadModel.calls.length===2);await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
 const interpreted=await page.evaluate(()=>window.rc47CadModel.calls.at(-1));
 assert.equal(interpreted.cadContext.unit,'46');assert.equal(interpreted.cadContext.report.contactReference,'unavailable');assert.equal(interpreted.cadContext.report.collisionSamples,undefined);assert.equal(interpreted.cadContext.recentActions.at(-1).tool,'inspect');assert.equal(interpreted.cadContext.recentActions.at(-1).ok,true);assert.equal(interpreted.workingMemory.goal,'46 ünitesinin gerçek kontrol sonuçlarını incele');
 assert.ok(interpreted.cadContext.report.triangles>0,'The next model turn receives the actual kernel report');
 const currentInspect=normalizeWorkspace(interpreted.cadContext).recentActions.at(-1);
 assert.equal(currentInspect?.tool,'inspect','The actual model-side normalizer retains the completed host QC receipt');assert.equal(currentInspect.ok,true);
 assert.equal(currentInspect.snapshot,interpreted.cadContext.snapshot);assert.equal(currentInspect.dataToken,interpreted.cadContext.dataToken);assert.notEqual(currentInspect.snapshot,preInspect.snapshot,'Receipt binds the committed post-action snapshot, not the proposal snapshot');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC60_Host_Action_Receipt.png'),animations:'disabled',timeout:15000});}
 assert.ok(await inspectProposal.getByRole('button').isDisabled(),'Applied suggestions become stale');
 assert.equal(await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).inputValue(),unsentCadDraft,'Successful automatic QC interpretation preserves the unsent question');
 await aya.getByRole('button',{name:'Kapat',exact:true}).click();await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 assert.equal(await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).inputValue(),unsentCadDraft,'The scoped session also preserves the draft after a model follow-up');
 await aya.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();
 const beforeInvalidInterpretation=await page.evaluate(()=>window.rc47CadModel.calls.length);await page.evaluate(()=>{window.rc47CadModel.mode='invalid';});await aya.locator('[data-aya-tool=inspect]').click();await page.waitForFunction(count=>window.rc47CadModel.calls.length===count+1,beforeInvalidInterpretation);await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
 assert.equal(await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).inputValue(),unsentCadDraft,'Invalid automatic QC output cannot replace the draft with the synthetic interpretation prompt');
 const beforeEngineInterpretation=await page.evaluate(()=>window.rc47CadModel.calls.length);await page.evaluate(()=>{window.rc47CadModel.mode='engine-memory';});await aya.locator('[data-aya-tool=inspect]').click();await page.waitForFunction(count=>window.rc47CadModel.calls.length===count+1,beforeEngineInterpretation);await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
 assert.match(await aya.getByRole('alert').textContent(),/bellek ayıramadı/,'CAD exposes the same safe actionable engine diagnosis as the main chat');
 assert.equal(await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).inputValue(),unsentCadDraft);
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});await aya.locator('[data-aya-tool=inspect]').click();await aya.getByRole('button',{name:'Durdur',exact:true}).waitFor();await aya.getByRole('button',{name:'Durdur',exact:true}).click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
 assert.equal(await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).inputValue(),unsentCadDraft,'Cancelling automatic QC interpretation preserves the original user draft');
 await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});
 if(process.env.DENTAYA_SCREENSHOT_DIR){await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC60_CAD_AYA_Draft_Preserved.png'),animations:'disabled',timeout:15000});}
 console.log('PASS: CAD drafts survive close/reopen and success, invalid output, engine failure, or cancellation during bounded QC interpretation.');
 // Invalid model output and cancellation retain the prompt and leave CAD usable.
 await page.evaluate(()=>{window.rc47CadModel.mode='invalid';});await ask('Hedefi değiştirmeden kontrol et');assert.equal(await aya.getByRole('textbox').inputValue(),'Hedefi değiştirmeden kontrol et');
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});
 await aya.getByRole('textbox').fill('İptal edilecek soru');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await aya.getByRole('button',{name:'Durdur',exact:true}).click();try{await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();}catch(error){console.error('Cancel diagnostic',await page.evaluate(()=>({calls:window.rc47CadModel.calls.map(c=>c.prompt),cancels:window.rc47CadModel.cancels,pending:window.rc47CadModel.pending.length})));throw error;}assert.equal(await aya.getByRole('textbox').inputValue(),'İptal edilecek soru');
 // A closed panel and a late bridge response must not commit a reply or its memory.
 await aya.getByRole('textbox').fill('Kapalı panele gecikecek soru');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await page.waitForFunction(()=>window.rc47CadModel.pending.length===2);await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 assert.equal(await aya.getByRole('textbox').inputValue(),'Kapalı panele gecikecek soru','Closing cancels the pending request and restores its original question for retry');
 await aya.getByRole('textbox').fill('Yeniden açtıktan sonra yazdığım yeni taslak');
 await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});
 assert.doesNotMatch(await aya.getByRole('log').textContent(),/Gecikmiş model yanıtı/);
 assert.equal(await aya.getByRole('textbox').inputValue(),'Yeniden açtıktan sonra yazdığım yeni taslak','A late response from the closed panel cannot overwrite the reopened panel draft');
 // Unit switches isolate working memory and discard an outstanding plan.
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});await aya.getByRole('textbox').fill('Eski dişe ait gecikmiş öneri');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await page.waitForFunction(()=>window.rc47CadModel.pending.length===1);
 await page.getByRole('button',{name:'Diş 47',exact:true}).click();await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});
 assert.equal(await aya.getByRole('log').textContent(),'');assert.doesNotMatch(await aya.locator('.aya-working-memory').textContent(),/46 ünitesinin gerçek kontrol/);
 await page.getByRole('button',{name:'Diş 46',exact:true}).click();assert.match(await aya.locator('.aya-working-memory').textContent(),/46 ünitesinin gerçek kontrol/);assert.doesNotMatch(await aya.getByRole('log').textContent(),/Gecikmiş model yanıtı/);
 // A real asynchronous save result must reach a panel reopened while the save is pending.
 await settleAutosave();let finishAyaSave;holdWrite=new Promise(resolve=>{finishAyaSave=resolve;});assert.equal(await page.evaluate(()=>{const button=document.querySelector('.cad-aya-panel [data-aya-tool=save]');if(!(button instanceof HTMLButtonElement)||button.disabled)return false;button.click();return true;}),true,'The held user save starts from an available control');
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydediliyor…',exact:true}).waitFor();await aya.getByRole('button',{name:'Kapat',exact:true}).click();await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();assert.ok(await aya.getByRole('textbox').isDisabled(),'Reopened panel cannot start another model request during save');
 finishAyaSave();holdWrite=null;await aya.getByRole('log').getByText(/CAD işlem sonucu · Kaydet/).waitFor();await page.waitForFunction(()=>!document.querySelector('.cad-aya-panel textarea')?.disabled);
 await ask('Kaydın gerçek sonucunu dikkate alarak devam et');assert.equal((await page.evaluate(()=>window.rc47CadModel.calls.at(-1))).cadContext.recentActions.at(-1).tool,'save');assert.equal((await page.evaluate(()=>window.rc47CadModel.calls.at(-1))).cadContext.recentActions.at(-1).ok,true,JSON.stringify({event:(await page.evaluate(()=>window.rc47CadModel.calls.at(-1))).cadContext.recentActions.at(-1),status:await page.locator('.cad-status-bar').textContent()}));
 const savedContext=await page.evaluate(()=>window.rc47CadModel.calls.at(-1).cadContext);
 assert.equal(normalizeWorkspace(savedContext).recentActions.at(-1)?.tool,'save','A reopened panel passes the actual committed save receipt through model normalization');
 // An asynchronous callback belongs to its original ownership generation even
 // when the user leaves and returns to the same unit before completion.
 await settleAutosave();let finishLateSave;holdWrite=new Promise(resolve=>{finishLateSave=resolve;});await aya.locator('[data-aya-tool=save]').click();
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydediliyor…',exact:true}).waitFor();
 await page.getByRole('button',{name:'Diş 47',exact:true}).click();await page.getByRole('button',{name:'Diş 46',exact:true}).click();
 finishLateSave();holdWrite=null;await page.waitForFunction(()=>!document.querySelector('.cad-aya-panel textarea')?.disabled);
 await ask('Üniteye döndükten sonra güncel durumu değerlendir');
 const returnedContext=await page.evaluate(()=>window.rc47CadModel.calls.at(-1).cadContext);
 assert.equal(returnedContext.scope,savedContext.scope);assert.equal(normalizeWorkspace(returnedContext).recentActions.filter(event=>event.tool==='save').length,0,'A late save result cannot be relabelled as evidence for a unit left and reopened while pending');
 await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 console.log('PASS: click-only CAD tools, actual report follow-up, replay/double-click guards, invalid JSON recovery, cancellation, late close, pending save reopen and unit memory boundaries (mock local bridge).');
 const menu=page.locator('[data-cad-menu=app]');await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();
 await page.getByRole('tab',{name:'Serbest',exact:true}).click();
 await page.locator('[data-cad-menu=analysis]>summary').click();assert.equal(await page.locator('[data-cad-menu=analysis]').getByRole('button',{name:'Temas',exact:true}).count(),0,'No contact view is offered without an actual antagonist');await page.locator('[data-cad-menu=analysis]>summary').click();
 if(await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).count())await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).click();await page.getByRole('button',{name:'Restorasyon tek başına göster',exact:true}).click();
 // Geometry-producing controls compute QC in the same user event. The new
 // report must survive the React commit and a task-only tab switch.
 const openShell=async()=>{await page.getByRole('tab',{name:'İç yüzey',exact:true}).click();const create=page.getByRole('button',{name:'Crown shell oluştur',exact:true});if(!await create.isVisible())await page.getByText('Crown Shell / Intaglio',{exact:true}).click();};
 await openShell();await page.getByRole('button',{name:'Crown shell oluştur',exact:true}).click();await page.locator('[data-cad-shell-report]').waitFor();assert.equal(await page.locator('[data-cad-qc-stale]').count(),0,'A just-computed shell report survives its own geometry commit');
 await page.getByRole('tab',{name:'Kontrol',exact:true}).click();await page.locator('[data-cad-qc-report]').waitFor();
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();await ask('Bu güncel shell kontrolünü yorumla');
 const shellEvidence=await page.evaluate(()=>window.rc47CadModel.calls.at(-1).cadContext.report);assert.ok(shellEvidence.triangles>0);assert.ok(Number.isFinite(shellEvidence.minimumWallEstimateMm));assert.equal(shellEvidence.wallMethod,'shell-offset-estimate');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC60_CAD_Current_Shell_QC.png'),animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});}
 await aya.getByRole('button',{name:'Kapat',exact:true}).click();await openShell();await page.getByRole('button',{name:'Mesh repair',exact:true}).click();await page.locator('[data-cad-shell-report]').waitFor();
 await page.getByRole('button',{name:"Shell'i temizle",exact:true}).click();await page.getByRole('tab',{name:'Kontrol',exact:true}).click();await page.locator('[data-cad-qc-report]').waitFor();
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();await ask('Shell temizlendikten sonraki güncel kontrolü yorumla');
 const clearedEvidence=await page.evaluate(()=>window.rc47CadModel.calls.at(-1).cadContext.report);assert.ok(clearedEvidence.triangles>0);assert.equal(clearedEvidence.minimumWallEstimateMm,undefined,'Clearing the shell removes its old wall estimate from AYA');await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 assert.deepEqual(unitMesh(await save()),unitMesh(again),'Build/repair/clear inspection preserves the original outer crown');
 console.log('PASS: same-event shell QC survives rendering/tasks and reaches AYA; clearing shell drops the old wall estimate.');
 const showCurrentQc=async()=>{await page.getByRole('tab',{name:'Kontrol',exact:true}).click();await page.getByRole('button',{name:'CAD Kernel QC çalıştır',exact:true}).click();await page.locator('[data-cad-qc-report]').waitFor();};
 const sculpt=async()=>{
  await page.keyboard.press('Numpad8');await frames();await page.locator('.cad-tool-palette--compact [data-cad-tool=add]').click();
  const box=await page.locator('canvas').boundingBox();const before=await page.locator('.cad-history-count').textContent();
  for(const [dx,dy] of [[0,0],[0,-30],[-25,0],[25,0],[0,30]]){
   await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx+8,box.y+box.height/2+dy+5,{steps:5});await page.mouse.up();
   if((await page.locator('.cad-history-count').textContent())!==before)return;
  }throw Error('A real brush stroke did not hit the placed crown');
 };
 await showCurrentQc();await page.getByRole('tab',{name:'Serbest',exact:true}).click();
 await sculpt();await page.getByRole('tab',{name:'Kontrol',exact:true}).click();await page.locator('[data-cad-qc-stale]').waitFor();assert.equal(await page.locator('[data-cad-qc-report]').count(),0,'A real sculpt removes stale QC metrics from the inspector');await page.getByRole('tab',{name:'Serbest',exact:true}).click();snapshot=await save();assert.notDeepEqual(unitMesh(snapshot),unitMesh(again));const edited=unitMesh(snapshot);
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 assert.match(await aya.locator('.aya-cad-evidence').textContent(),/Güncel geometri kontrolü yok/,'Sculpt invalidates old report evidence');
 await aya.locator('[data-aya-tool=undo]').click();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('Geri alındı'));
 const undone=await save();assert.deepEqual(unitMesh(undone),unitMesh(again),'AYA undo uses the real viewport history');
 await page.evaluate(()=>{window.rc47CadModel.mode='pending';});await aya.getByRole('textbox').fill('Değişen geometriye ait gecikmiş soru');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await page.waitForFunction(()=>window.rc47CadModel.pending.length===1);
 await page.locator('.cad-history-actions button[aria-label="Yinele"]').click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();assert.equal(await aya.getByRole('textbox').inputValue(),'Değişen geometriye ait gecikmiş soru');
 await page.evaluate(()=>{for(const resolve of window.rc47CadModel.pending.splice(0))resolve();window.rc47CadModel.mode='ok';});assert.doesNotMatch(await aya.getByRole('log').textContent(),/Gecikmiş model yanıtı/);await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited,'Manual redo restores the same deterministic sculpted geometry');
 console.log('PASS: AYA undo and manual redo use real history; geometry changes invalidate a pending model reply and old evidence.');
 await showCurrentQc();
 await page.getByRole('button',{name:'Diş 47',exact:true}).click();await selectStage('design');await page.getByRole('tab',{name:'Kontrol',exact:true}).click();await page.locator('[data-cad-qc-stale]').waitFor();assert.equal(await page.locator('[data-cad-qc-report]').count(),0,'Another unit never shows the prior unit QC metrics');if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC60_CAD_Stale_QC.png'),animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});}await page.getByRole('tab',{name:'Serbest',exact:true}).click();
 snapshot=await save();assert.equal(snapshot.units['unit-47-1'].anchor.placed,true);assert.ok(Math.abs(snapshot.units['unit-47-1'].anchor.position[0]+16)<.001);
 await page.getByRole('button',{name:'Diş 46',exact:true}).click();snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited);
 assert.ok(await page.locator('.cad-history-actions button[aria-label="Geri al"]').isEnabled());
 // A case switch must save first, and a failed save must keep the active scene and case.
 const casePicker=page.getByRole('combobox',{name:'Çalışma vakası',exact:true});
 failWrites=true;await casePicker.selectOption(secondCaseId);await page.waitForFunction(()=>!document.querySelector('.cad-save-dialog')?.open&&document.querySelector('.cad-status-bar')?.textContent?.includes('Connection unavailable'));assert.equal(await casePicker.inputValue(),caseId);assert.ok(page.url().includes(caseId));failWrites=false;
 failTargetReads=true;await casePicker.selectOption(secondCaseId);await page.locator('.cad-context-error[role=alert]').waitFor();await page.waitForURL('**case='+caseId);await page.waitForFunction(()=>!document.querySelector('.cad-save-dialog')?.open);assert.equal(await casePicker.inputValue(),caseId);assert.deepEqual(unitMesh(await decodeCadWorkspace(savedProject.settings.cad_workspace)),edited,'A failed target read cannot replace the prior case geometry');failTargetReads=false;await page.locator('.cad-context-error').getByRole('button',{name:'Kapat',exact:true}).click();
 await settleAutosave();let releaseSwitch;holdWrite=new Promise(resolve=>{releaseSwitch=resolve;});await casePicker.selectOption(secondCaseId);await page.locator('.cad-save-dialog[open]').waitFor();assert.equal(await casePicker.inputValue(),caseId);assert.ok(await casePicker.isDisabled());assert.ok(page.url().includes(caseId),'Navigation waits for save acknowledgment');releaseSwitch();holdWrite=null;
 await page.waitForURL('**case='+secondCaseId);await ready();await page.waitForFunction(()=>document.querySelector('.cad-save-state')?.getAttribute('data-save-state')==='saved');assert.ok(secondProject.settings.cad_workspace,'Autosave resumes when case context finishes after the viewport is ready');assert.deepEqual(unitMesh(await decodeCadWorkspace(savedProject.settings.cad_workspace)),edited,'The old case keeps its full edited scene');
 await casePicker.selectOption(caseId);await page.waitForURL('**case='+caseId);await ready();snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited,'Returning to a saved case restores its mesh');
 console.log('PASS: case switches await acknowledged scene save; failure preserves the selected case, and returning restores the edited mesh.');
 const beforeReload=await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('dentaya-cad-recovery',1);request.onsuccess=()=>{const db=request.result,q=db.transaction('drafts','readonly').objectStore('drafts').getAll();q.onsuccess=()=>{resolve(q.result.map(d=>({savedAt:d.savedAt,sourceKey:d.sourceKey,unit:d.workspace.settings.job_setup.active_unit_id})));db.close();};};}));
 await page.reload();await ready();if(await page.locator('.cad-recovery-notice').count())console.error('Recovery diagnostic',{beforeReload,remoteSavedAt:savedProject.settings.cad_workspace.savedAt});assert.equal(await page.locator('.cad-recovery-notice').count(),0,'Acknowledged cloud saves should not present a stale recovery prompt');snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited);assert.equal(Object.keys(snapshot.units).length,2);
 console.log('PASS: sculpted topology, separate unit margins, unit switching and reopen survive cloud save.');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();await aya.locator('[data-aya-tool=inspect]').click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC40_CAD_AYA.png'),animations:'disabled',timeout:15000});await aya.getByRole('button',{name:'Kapat',exact:true}).click();}
 await settleAutosave();let release;holdWrite=new Promise(resolve=>{release=resolve;});
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
 await page.evaluate(()=>sessionStorage.setItem('rc51:hold-recovery','yes'));
 await page.goto(url);await ready();
 await page.waitForFunction(()=>window.rc51RecoveryReads.length>=2);
 await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();await selectStage('review');
 const localDownload=page.locator('[data-cad-download-stl]'),publishButton=page.getByRole('button',{name:'STL oluştur ve kliniğin onayına gönder',exact:true});
 assert.ok(await localDownload.isDisabled(),'Local STL export waits for the recovery lookup');
 assert.ok(await publishButton.isDisabled(),'Clinical publication waits for the recovery lookup');
 const lookupPatchCount=requestLog.filter(request=>request.method==='PATCH').length;
 await navigateModule('/ai');
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.waitForTimeout(1100);
 assert.ok(page.url().includes('/design'),'Navigation waits for recovery lookup');
 assert.equal(requestLog.filter(request=>request.method==='PATCH').length,lookupPatchCount,'Manual and automatic saves cannot write during recovery lookup');
 await page.evaluate(()=>{sessionStorage.removeItem('rc51:hold-recovery');for(const release of window.rc51RecoveryReads.splice(0))release();});
 await page.locator('.cad-recovery-notice').waitFor();
 assert.ok(await localDownload.isDisabled(),'Local STL export waits for an explicit recovery decision');
 assert.ok(await publishButton.isDisabled(),'Clinical publication waits for an explicit recovery decision');
 assert.equal((await readDrafts()).length,1,'An intentional local checkpoint survives expiry pruning');
 const pendingPatchCount=requestLog.filter(request=>request.method==='PATCH').length;
 await navigateModule('/ai');
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click();
 await page.waitForTimeout(1100);
 assert.ok(page.url().includes('/design'),'Unresolved recovery must keep the case open');
 assert.equal(requestLog.filter(request=>request.method==='PATCH').length,pendingPatchCount,'Navigation and manual Save cannot write before an explicit recovery decision');
 const unresolvedDrafts=await readDrafts();assert.equal(unresolvedDrafts[0].retained,true);assert.deepEqual(unitMesh(unresolvedDrafts[0].workspace.designSnapshot),offlineMesh,'The retained recovery geometry remains intact');
 assert.equal(await page.locator('.cad-recovery-notice').count(),1);assert.equal(await page.locator('.cad-save-dialog[open]').count(),0);
 await page.getByRole('button',{name:'Geri yükle',exact:true}).click();failWrites=false;snapshot=await save();assert.deepEqual(unitMesh(snapshot),offlineMesh);
 console.log('PASS: delayed recovery lookup and pending recovery choice block writes/navigation/local STL/publication; explicit local exit and recovery retain all geometry.');
 // Publishing must include the exact geometry checkpoint, then accept the RPC timestamp despite JSONB key order.
 await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();await selectStage('review');
 // Changing stage schedules a 900ms autosave. Complete that known transition
 // before a physical publish click, which must not race a newly disabled button.
 await settleAutosave();
 const publish=page.getByRole('button',{name:'STL oluştur ve kliniğin onayına gönder',exact:true});
 await publish.evaluate(button=>{
  window.rc60PublicationClickTrace=[];
  for(const type of ['pointerdown','pointerup','click'])button.addEventListener(type,event=>window.rc60PublicationClickTrace.push({type:event.type,at:event.timeStamp,disabled:button.disabled,saveState:document.querySelector('.cad-save-state')?.getAttribute('data-save-state')}),{once:true,capture:true});
 });
 await publish.click();
 const publicationClicks=await page.evaluate(()=>window.rc60PublicationClickTrace);
 assert.equal(publicationClicks.filter(event=>event.type==='click').length,1,'The real enabled publish button must receive exactly one native click');
 assert.ok(publicationClicks.every(event=>!event.disabled&&event.saveState==='saved'),'Publication starts after the stage autosave has settled');
 await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('kliniğin onayına gönderildi'));
 assert.equal(submissions.length,1);assert.deepEqual(unitMesh(await decodeCadWorkspace(submissions[0].p_parameters.settings.cad_workspace)),offlineMesh);
 snapshot=await save();assert.deepEqual(unitMesh(snapshot),offlineMesh);
 console.log('PASS: publication saves complete geometry and save after publication accepts reordered JSONB metadata.');
 // New desktop links must preserve the existing error, retry and acknowledged-save guards.
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC51_CAD_daily.png'),animations:'disabled',caret:'initial',style:'nextjs-portal{visibility:hidden!important}',timeout:15000});}
 const acknowledgedVersion=savedProject.updated_at;savedProject.updated_at=new Date(Date.now()+100000).toISOString();
 await navigateModule('/ai');
 await modal.waitFor();await modal.getByRole('button',{name:'Yerel kaydet ve çık',exact:true}).waitFor();assert.ok(page.url().includes('/design'),'A conflicting desktop navigation save keeps the edited case open');
 savedProject.updated_at=acknowledgedVersion;
 let releaseNavigation;holdWrite=new Promise(resolve=>{releaseNavigation=resolve;});
 const navigationRequest=page.waitForRequest(request=>request.method()==='PATCH'&&new URL(request.url()).pathname.endsWith('/design_projects'));
 await modal.getByRole('button',{name:'Kaydet ve çık',exact:true}).click();
 await navigationRequest;assert.ok(page.url().includes('/design'),'Module navigation keeps CAD open while the retry is pending');
 releaseNavigation();holdWrite=null;await page.waitForURL('**/ai');
 assert.deepEqual(unitMesh(await decodeCadWorkspace(savedProject.settings.cad_workspace)),offlineMesh,'Module navigation retains the complete edited scene');
 console.log('PASS: desktop module navigation rejects conflicting saves, waits for retry acknowledgment and retains the requested destination and edited scene.');

 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,realEditor:true,realWebGL:true,syntheticImplantAbutments:true,localMarginSizing:true,hiddenZeroOpacityRecovered:true,ayaChecksDoNotChangeMesh:true,fullMeshPersistence:true,perUnitPersistence:true,cloudReopen:true,saveExitAcknowledged:true,modalEditGuard:true,offlineExitRecovery:true,retainedLocalCheckpoint:true,publishCheckpoint:true,saveAfterPublish:true,optimisticConflictRejected:true,desktopNavigationSaveGuard:true,pendingRecoveryBlocksNavigationAndSave:true,staleQcHiddenAfterSculptAndUnitSwitch:true,currentShellQcSurvivesGeometryCommitAndTabs:true,manualQcSharedWithAya:true,ayaContextGuide:true,ayaModelBridge:'mock; no native inference',ayaProposalClickOnly:true,ayaActualQcFollowup:true,ayaLateReplyGuard:true,ayaScopedMemory:true,saveBeforeCaseSwitch:true,caseFailureRetainsScene:true,targetReadFailureRestoresCase:true,ayaKeyboardAndLaptopComposer:true,noContactWithoutAntagonist:true,backend:'intercepted API fixture; no production data'},null,2));
 }
}catch(error){
 console.error(logs);
 const debugPage=browser?.contexts()[0]?.pages()[0];
 if(debugPage){try{const state=await debugPage.evaluate(()=>({url:location.href,status:document.querySelector('.cad-status-bar')?.textContent,case:document.querySelector('.cad-case-select')?.value,saveState:document.querySelector('.cad-save-state')?.getAttribute('data-save-state'),modalOpen:document.querySelector('.cad-save-dialog')?.open,headerButtons:Array.from(document.querySelectorAll('.cad-main-header button')).map(button=>({label:button.textContent?.trim(),disabled:button.disabled})),history:document.querySelector('.cad-history-count')?.textContent}));console.error('CAD failure diagnostic',JSON.stringify({state,serverVersion:savedProject.updated_at,serverUnit:savedProject.settings?.job_setup?.active_unit_id,serverSavedAt:savedProject.settings?.cad_workspace?.savedAt,writeCount:writes.length,requestLog:requestLog.slice(-30),navigationLog},null,2));const directory=process.env.DENTAYA_SCREENSHOT_DIR||path.join(os.tmpdir(),'dentaya-cad-browser-debug');await fs.mkdir(directory,{recursive:true});await debugPage.screenshot({path:path.join(directory,'CAD_failure.png'),animations:'disabled',timeout:15000});}catch(debugError){console.error('Diagnostic capture failed',debugError.message);}}
 throw error;
}finally{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}}
