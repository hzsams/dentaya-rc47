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
let savedProject={id:'55555555-5555-4555-8555-555555555555',case_id:caseId,lab_org_id:orgId,source_scan_id:'scan-upper',title:'RC40 test',restoration_type:caseRow.case_type,tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',workflow_stage:'margin',status:'working',settings:{show_design:false,opacity:0,job_setup:{version:1,complete:true,active_unit_id:'unit-46-0',units:[unit('46',0),unit('47',1)],updated_at:null},unit_margins:{'unit-46-0':circle(12,-5,-1.75),'unit-47-1':circle(-16,4,-1.55)}},margin_points:circle(12,-5,-1.75),measurements:[],updated_at:new Date().toISOString()};
const group=new THREE.Group();
const block=new THREE.Mesh(new THREE.BoxGeometry(50,25,.6));block.position.x=6;group.add(block);
for(const [x,y,h] of [[18,-5,5],[-10,4,6.2]]){const g=new THREE.CylinderGeometry(2,2,h,32);g.rotateX(Math.PI/2);const post=new THREE.Mesh(g);post.position.set(x,y,h/2);group.add(post);}
group.updateMatrixWorld(true);const fixture=new STLExporter().parse(group);
let server,browser,logs='',serverExit=null,failWrites=false,holdWrite=null,clock=0;
const errors=[],writes=[],submissions=[],patchResults=[];
const custom=new THREE.Mesh(new THREE.BoxGeometry(8,9,10,2,2,2));custom.updateMatrixWorld(true);const customStl=new STLExporter().parse(custom);
const invalid=new THREE.Mesh(new THREE.PlaneGeometry(8,9));invalid.updateMatrixWorld(true);const invalidStl=new STLExporter().parse(invalid);
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
  else if(table==='scan_sessions')body=[{id:'scan-upper',scan_ref:'SYNTHETIC-ABUTMENTS',patient_id:caseRow.patient_id,case_id:caseId,arch:'upper',captured_at:'2026-10-14T10:00:00Z',file_name:'602.stl',storage_bucket:'public-demo',storage_path:'/training-scans/602.stl',scanner_brand:'Synthetic',scanner_model:'Geometry test',scan_origin:'laboratory',scan_purpose:'master_model'}];
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
  if(table==='design_projects'&&req.method()==='PATCH')patchResults.push({status,updatedAt:savedProject.updated_at});
  if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
  await route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
 });
 await page.route('**/training-scans/602.stl',route=>route.fulfill({status:200,contentType:'model/stl',body:fixture}));
 await page.addInitScript(({userId})=>{
  document.addEventListener('DOMContentLoaded',()=>{
   const style=document.createElement('style');style.textContent='nextjs-portal{visibility:hidden!important}';document.head.appendChild(style);
  });
  const exp=Math.floor(Date.now()/1000)+86400,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'graphite',grid:false,axes:false,damping:false}));
  localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
 },{userId});
 const ready=async()=>{await page.locator('.cad-professional').waitFor();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.match(/Tarama (senkronize|hazır)/),{},{timeout:55000});};
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
 const selectStage=async stage=>{
  const workflow=page.locator('[data-cad-menu=workflow]');
  if(await workflow.getAttribute('open')===null)await workflow.locator('summary').click();
  await workflow.locator(`button[data-cad-stage=${stage}]`).click();await page.keyboard.press('Escape');
 };
 await page.goto(url);await ready();
 assert.equal(await page.locator('[data-tooth-family]').count(),0,'The rejected 24-family browser is absent');
 await page.locator('.cad-main-header').getByRole('button',{name:'Form kütüphanesi',exact:true}).click();
 const library=page.getByRole('dialog',{name:'Form kütüphanesi',exact:true});await library.waitFor();
 assert.match(await library.textContent(),/Henüz form eklenmedi/);
 await page.waitForFunction(()=>document.querySelector('.cad-library-dialog .cad-library-toolbar button')?.disabled===false);
 await library.getByLabel('Dosya seç',{exact:true}).setInputFiles({name:'open.stl',mimeType:'model/stl',buffer:Buffer.from(invalidStl)});
 await library.getByRole('alert').waitFor();assert.match(await library.getByRole('alert').textContent(),/kapalı ve tek gövde/);assert.equal(await library.getByRole('button',{name:'Kaydet',exact:true}).isEnabled(),false);
 await library.getByLabel('Dosya seç',{exact:true}).setInputFiles({name:'technician-46.stl',mimeType:'model/stl',buffer:Buffer.from(customStl)});
 await library.getByRole('button',{name:'Kaydet',exact:true}).waitFor();await library.getByRole('button',{name:'Kaydet',exact:true}).click();
 await library.getByRole('status').waitFor();await library.locator('.cad-library-detail canvas').waitFor();
 const readForms=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('dentaya-cad-form-library',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('forms','readonly'),q=tx.objectStore('forms').getAll();q.onsuccess=()=>{resolve(q.result.map(v=>v.form));db.close();};q.onerror=()=>reject(q.error);};r.onerror=()=>reject(r.error);}));
 const imported=(await readForms())[0];assert.equal(imported.name,'technician-46');assert.deepEqual(imported.sizeMm,[8,9,10]);
 const downloadPromise=page.waitForEvent('download');await library.getByRole('button',{name:'Dışa aktar',exact:true}).click();const download=await downloadPromise;
 const exported=await fs.readFile(await download.path(),'utf8');assert.equal(JSON.parse(exported).forms[0].sha256,imported.sha256);
 await library.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.locator('.cad-session-strip').getByRole('button',{name:'İş tanımı',exact:true}).click();
 const setup=page.getByRole('dialog',{name:'CAD iş tanımı',exact:true});const firstUnit=setup.locator('article').first();
 assert.equal(await firstUnit.getByRole('combobox',{name:'Diş formu',exact:true}).locator('option').count(),6);
 await firstUnit.getByRole('button',{name:'Form kütüphanesi',exact:true}).click();await library.waitFor();
 await library.getByRole('button').filter({hasText:'technician-46'}).click();await library.getByRole('button',{name:'CAD’de kullan',exact:true}).waitFor();
 await library.getByRole('button',{name:'CAD’de kullan',exact:true}).click();await library.waitFor({state:'hidden'});
 await setup.getByRole('button',{name:"İş tanımını onayla · CAD'e başla",exact:true}).click();await setup.waitFor({state:'hidden'});
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).waitFor();
 await save();assert.equal(savedProject.settings.job_setup.units[0].form_library_id,imported.id);assert.equal(savedProject.settings.cad_library_assets[imported.id].sha256,imported.sha256);
 console.log('PASS: actual STL import, preview, committed library save, transfer and per-unit selection.');
 await page.getByRole('button',{name:'Sonraki',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cad-professional')?.dataset.cadTask==='fit');
 let snapshot=await save();const first=snapshot.units['unit-46-0'];
 assert.equal(savedProject.settings.show_design,true);assert.equal(savedProject.settings.opacity,1);assert.equal(first.anchor.placed,true);assert.ok(Math.abs(first.anchor.position[0]-12)<.001);assert.ok(Math.abs(first.anchor.position[1]+5)<.001);
 assert.ok(first.key.includes('library-rc41'));assert.equal(first.geometry.positions.length,26*3,'The actual imported topology is used');
 const z=first.base.filter((_,i)=>i%3===2);assert.ok(Math.max(...z)-Math.min(...z)<15,'Crown is sized from the local margin, not the whole arch');
 const poseZ=Math.min(...first.placementBase.filter((_,i)=>i%3===2));assert.ok(Math.abs(first.anchor.position[2]+poseZ+1.75)<.001);
 console.log('PASS: implant-abutment crown appears on its offset margin, sized locally.');
 const menu=page.locator('[data-cad-menu=app]');await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();
 await page.getByRole('tab',{name:'Anatomi',exact:true}).click();
 const placementSection=page.locator('#cad-tool-content .cad-inspector-section').filter({has:page.getByRole('button',{name:'Koleye yerleştir',exact:true,includeHidden:true})});
 if(await placementSection.getAttribute('open')===null)await placementSection.locator('summary').first().click();
 await placementSection.getByRole('button',{name:'Koleye yerleştir',exact:true}).click();
 const again=await save();assert.deepEqual(unitMesh(again),unitMesh(snapshot),'Repeated margin placement must not shrink or erase the crown');
 assert.equal(savedProject.margin_points.length,32,'Repeated placement preserves the actual selected contour');
 console.log('PASS: the actual manual placement control preserves the imported crown and selected contour.');
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
 await page.getByRole('button',{name:'Diş 47',exact:true}).click();await selectStage('design');
 snapshot=await save();assert.equal(snapshot.units['unit-47-1'].anchor.placed,true);assert.ok(Math.abs(snapshot.units['unit-47-1'].anchor.position[0]+16)<.001);
 await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-cad-render-state]').dataset.cadRenderState).state.renderedUnits===2);
 await page.locator('.cad-unit-visibility summary').click();await page.getByLabel('FDI 46',{exact:true}).uncheck();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-cad-render-state]').dataset.cadRenderState).state.renderedUnits===1);await page.getByLabel('FDI 46',{exact:true}).check();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-cad-render-state]').dataset.cadRenderState).state.renderedUnits===2);
 await page.getByRole('button',{name:'Diş 46',exact:true}).click();snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited);
 assert.ok(await page.locator('.cad-history-actions button[aria-label="Geri al"]').isEnabled());
 await page.reload();await ready();assert.equal(await page.locator('.cad-recovery-notice').count(),0,'Acknowledged cloud saves should not present a stale recovery prompt');snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited);assert.equal(Object.keys(snapshot.units).length,2);
 console.log('PASS: sculpted topology, separate unit margins, unit switching and reopen survive cloud save.');
 await page.locator('.cad-main-header').getByRole('button',{name:'Form kütüphanesi',exact:true}).click();await library.waitFor();await library.getByRole('button').filter({hasText:'technician-46'}).click();
 page.once('dialog',dialog=>dialog.accept());await library.getByRole('button',{name:'Sil',exact:true}).click();await library.getByRole('button',{name:'Sil',exact:true}).waitFor({state:'hidden'});assert.equal((await readForms()).length,0);await library.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.reload();await ready();snapshot=await save();assert.deepEqual(unitMesh(snapshot),edited,'Project shape survives deletion of its local library original');
 console.log('PASS: project contains the form independently of the personal library.');
 await page.locator('.cad-main-header').getByRole('button',{name:'Form kütüphanesi',exact:true}).click();await library.waitFor();
 await library.getByLabel('İçe aktar',{exact:true}).setInputFiles({name:'DentAYA_Form_Kutuphanesi.json',mimeType:'application/json',buffer:Buffer.from(exported)});
 await library.getByRole('status').waitFor();assert.equal((await readForms()).length,1);assert.equal((await readForms())[0].sha256,imported.sha256);
 await library.getByRole('button',{name:'Kapat',exact:true}).click();
 console.log('PASS: an exported technician library is imported through the actual JSON upload control.');

 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC52_CAD_Library.png'),animations:'disabled',timeout:15000});}
 let release;holdWrite=new Promise(resolve=>{release=resolve;});
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet ve çık',exact:true}).click();
 const modal=page.locator('.cad-save-dialog[open]');await modal.waitFor();assert.ok(page.url().includes('/design'));assert.equal(await page.evaluate(()=>document.querySelector('.cad-save-dialog')?.matches(':modal')),true);
 release();holdWrite=null;await page.waitForURL('**/lab').catch(async error=>{console.error('SAVE_EXIT_DIAGNOSTIC',JSON.stringify({url:page.url(),status:await page.locator('.cad-status-bar').textContent(),modal:await modal.textContent(),writes:writes.length,lastVersion:savedProject.updated_at,errors}));throw error;});
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
 await menu.locator('summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();await selectStage('review');
 await page.getByRole('button',{name:'STL oluştur ve kliniğin onayına gönder',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('kliniğin onayına gönderildi'));
 assert.equal(submissions.length,1);assert.deepEqual(unitMesh(await decodeCadWorkspace(submissions[0].p_parameters.settings.cad_workspace)),offlineMesh);
 snapshot=await save();assert.deepEqual(unitMesh(snapshot),offlineMesh);
 console.log('PASS: publication saves complete geometry and save after publication accepts reordered JSONB metadata.');
 // A concurrent writer must be rejected rather than silently overwritten.
 savedProject.updated_at=new Date(Date.now()+100000).toISOString();
 await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet ve çık',exact:true}).click();await modal.waitFor();await modal.getByRole('button',{name:'Yerel kaydet ve çık',exact:true}).waitFor();assert.ok(page.url().includes('/design'));
 await modal.getByRole('button',{name:'Kapat',exact:true}).click();
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC41_CAD_daily.png'),animations:'disabled',timeout:15000});}
 await page.goto('http://127.0.0.1:3049/cad-library');await page.locator('.cad-form-library').waitFor();await page.locator('.cad-library-item').filter({hasText:'technician-46'}).waitFor();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('.cad-form-library').evaluate(el=>el.getBoundingClientRect().right<=innerWidth));
 console.log('PASS: the standalone technician catalog persists and fits a small screen.');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,realEditor:true,realWebGL:true,libraryStlImport:true,libraryPreview:true,libraryPersistence:true,libraryTransfer:true,libraryBundleImport:true,standaloneCatalog:true,mobileCatalog:true,perUnitLibrarySelection:true,importedTopologyUsed:true,libraryDeletionDoesNotBreakProject:true,syntheticImplantAbutments:true,localMarginSizing:true,hiddenZeroOpacityRecovered:true,placementIdempotent:true,fullMeshPersistence:true,perUnitPersistence:true,multiplePlacedUnitsVisible:true,perUnitVisibility:true,cloudReopen:true,saveExitAcknowledged:true,modalEditGuard:true,offlineExitRecovery:true,retainedLocalCheckpoint:true,publishCheckpoint:true,saveAfterPublish:true,optimisticConflictRejected:true,manualPlacementControl:true,backend:'intercepted API fixture; no production data'},null,2));
}catch(error){console.error(logs);throw error;}finally{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}}
