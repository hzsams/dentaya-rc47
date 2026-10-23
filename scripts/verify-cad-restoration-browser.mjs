import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {STLExporter} from 'three/examples/jsm/exporters/STLExporter.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc.ts';
import {decodeCadWorkspace,encodeCadWorkspace} from '../src/lib/cad-project-state.ts';

// Real CAD/WebGL, prepared-stump geometry and user controls; synthetic HTTP backend.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222',caseId='33333333-3333-4333-8333-333333333333';
const specs=[
 {code:'46',type:'anatomic_crown',center:new THREE.Vector3(18,-5,0),axis:new THREE.Vector3(.2,-.15,1).normalize()},
 {code:'47',type:'coping',center:new THREE.Vector3(-10,4,0),axis:new THREE.Vector3(0,0,1)},
 {code:'16',type:'anatomic_crown',center:new THREE.Vector3(5,10,0),axis:new THREE.Vector3(0,0,-1)},
];
const group=new THREE.Group(),base=new THREE.Mesh(new THREE.BoxGeometry(50,30,.6));base.position.set(6,0,-.3);group.add(base);
for(const spec of specs){const geometry=new THREE.CylinderGeometry(1.5,2.25,3.6,48);geometry.rotateX(Math.PI/2);const mesh=new THREE.Mesh(geometry);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),spec.axis);mesh.position.copy(spec.center).addScaledVector(spec.axis,1.8);group.add(mesh);}
// Use actual transformed vertices, as the application's STL loader does. A
// transformed cylinder bounding box overestimates the tilted stump's height.
group.updateMatrixWorld(true);const sourceCenter=new THREE.Box3().setFromObject(group,true).getCenter(new THREE.Vector3()),stl=new STLExporter().parse(group);
const margin=spec=>{const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),spec.axis);return Array.from({length:48},(_,i)=>new THREE.Vector3(2.5*Math.cos(i*Math.PI/24),2.2*Math.sin(i*Math.PI/24),0).applyQuaternion(rotation).add(spec.center).sub(sourceCenter));};
const units=specs.map(spec=>({id:'unit-'+spec.code,tooth_code:spec.code,anatomy_code:spec.code,role:'abutment',design_type:spec.type,tooth_form:'natural',morphology_style:'balanced',material:'Zirkonya',attachment_type:'none',temporary:false,notes:''}));
const caseRow={id:caseId,case_number:'CAD-RC56-RESTORATION',patient_id:'44444444-4444-4444-8444-444444444444',patient_reference:'SYNTHETIC',title:'Kuron ve kapşon preparasyon yerleşimi',case_type:'Kron',status:'design',priority:'normal',due_date:null,tooth_codes:specs.map(s=>s.code),material:'Zirkonya',shade:'A2',clinical_notes:''};
let project={id:'55555555-5555-4555-8555-555555555555',case_id:caseId,lab_org_id:orgId,source_scan_id:'scan-preparations',title:'RC56 full design fixture',restoration_type:'Kron',tooth_codes:caseRow.tooth_codes,material:'Zirkonya',shade:'A2',workflow_stage:'margin',status:'working',settings:{render_palette:'natural',margin_offset_mm:.02,job_setup:{version:1,complete:true,active_unit_id:units[0].id,units,updated_at:null},unit_margins:Object.fromEntries(specs.map(s=>['unit-'+s.code,margin(s)])),unit_parameters:Object.fromEntries(specs.map(s=>['unit-'+s.code,{insertion_axis_x:s.axis.x,insertion_axis_y:s.axis.y,insertion_axis_z:s.axis.z}])),insertion_axis_x:specs[0].axis.x,insertion_axis_y:specs[0].axis.y,insertion_axis_z:specs[0].axis.z},margin_points:margin(specs[0]),measurements:[],updated_at:new Date().toISOString()};
const errors=[],measurements=[],screenshots=[],exports=[];let server,browser,logs='',exitCode=null,clock=0;
async function stop(){if(!server||server.exitCode!==null||server.signalCode)return;await new Promise(resolve=>{const timer=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill('SIGTERM');});}
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3069'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-browser-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-24000);});server.on('exit',code=>{exitCode=code;});
 const url='http://127.0.0.1:3069/design?case='+caseId,deadline=Date.now()+65000;let ready=false;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));let downloadCount=0;page.on('download',()=>downloadCount++);
 await page.route('**/training-scans/rc55-preparations.stl',route=>route.fulfill({status:200,contentType:'model/stl',body:stl}));
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const request=route.request(),u=new URL(request.url()),table=u.pathname.split('/').at(-1);let body=[];
  const user={id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  if(request.method()==='OPTIONS')body={};else if(u.pathname.startsWith('/auth/'))body={user};
  else if(table==='memberships')body=[{organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
  else if(table==='organizations')body=[{id:orgId,name:'CAD Fixture',org_type:'laboratory'}];else if(table==='cases')body=[caseRow];
  else if(table==='scan_sessions')body=[{id:'scan-preparations',scan_ref:'SYNTHETIC-PREPARATIONS',patient_id:caseRow.patient_id,case_id:caseId,arch:'lower',captured_at:'2026-10-21T10:00:00Z',file_name:'rc55-preparations.stl',storage_bucket:'public-demo',storage_path:'/training-scans/rc55-preparations.stl',scanner_brand:'Synthetic',scanner_model:'Geometry test',scan_origin:'laboratory',scan_purpose:'master_model'}];
  else if(table==='design_projects'){if(request.method()==='PATCH'){project={...project,...request.postDataJSON(),updated_at:new Date(Date.now()+ ++clock).toISOString()};}body=[project];}
  else if(table==='profiles')body=[{id:userId,display_name:'CAD Test'}];
  if(request.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
 });
 await page.addInitScript(({userId})=>{
  const exp=Math.floor(Date.now()/1000)+86400,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'studio',grid:false,axes:false,damping:false,followToothStyle:true}));
  localStorage.setItem('dentaya:tooth-appearance:v1',JSON.stringify({style:'anatomical',shade:'a2',finish:'enamel',showRoots:false}));
  localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
 },{userId});
 const state=()=>page.locator('[data-cad-inspection-state]').evaluate(node=>JSON.parse(node.dataset.cadInspectionState));
 const frames=()=>page.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);});
 const idle=()=>page.waitForFunction(()=>document.querySelector('.cad-save-state')?.getAttribute('data-save-state')==='saved'&&Array.from(document.querySelectorAll('.cad-main-header button')).some(button=>button.textContent?.trim()==='Kaydet'&&!button.disabled));
 async function save(){await idle();const [response]=await Promise.all([page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname.endsWith('/design_projects')),page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click()]);assert.equal(response.status(),200);await idle();return decodeCadWorkspace(project.settings.cad_workspace);}
 async function picture(name){if(!process.env.DENTAYA_SCREENSHOT_DIR)return;await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});const file=path.join(process.env.DENTAYA_SCREENSHOT_DIR,name);await page.locator('.cad-professional').screenshot({path:file,animations:'disabled'});screenshots.push(file);}
 async function camera(name){await page.locator('[data-cad-menu=camera]>summary').click();await page.locator('[data-cad-menu=camera]').getByRole('button',{name,exact:true}).click();await frames();}
 async function anatomyTab(){await page.getByRole('tab',{name:'Anatomi',exact:true}).click();}
 await page.goto(url);await page.locator('.cad-professional').waitFor();await page.waitForFunction(()=>document.querySelector('[data-cad-inspection-state]')&&document.querySelector('.cad-professional canvas')?.width>0,{},{timeout:65000});
 await idle();await page.getByRole('button',{name:'Sonraki',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).placement?.placed);
 await page.locator('[data-cad-menu=app]>summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();
 for(const [i,spec] of specs.entries()){
  if(i){await idle();await page.getByRole('button',{name:'Diş '+spec.code,exact:true}).click();await idle();await page.getByRole('button',{name:'Sonraki',exact:true}).click();}
  await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).placement?.placed);await frames();
  const current=await state(),registration=current.placement,expected=spec.center.clone().sub(sourceCenter);
  assert.ok(new THREE.Vector3(...registration.marginCenter).distanceTo(expected)<.001,'Placement uses this unit’s prepared stump instead of the arch center');
  assert.ok(registration.cervicalCenterGapMm<.035,'Rendered cervical center stays on its selected margin with the explicit 0.02mm offset');
  assert.ok(registration.maxMarginGapMm<.04,'The default rendered neck follows the selected margin polyline');
  assert.ok(registration.neckSampleCount>=24,'Registration uses a full neck ring rather than a single sphere pole');
  assert.equal(current.restorationMaterial.type,'MeshPhysicalMaterial');assert.ok(current.restorationMaterial.clearcoat>0,'The actual natural restoration uses its chosen enamel finish');
  const snapshot=await save(),record=snapshot.units['unit-'+spec.code];assert.ok(record.key.endsWith(':anatomy-rc55'));assert.equal(record.anchor.placed,true);
  const crownHeight=Math.max(...record.placementBase.filter((_,n)=>n%3===2));assert.ok(crownHeight>2&&crownHeight<12,'There is a bounded anatomical crown body, not an entire tooth/root');
  // This scan fixture's insertion direction is Z; global front/back are its occlusal views.
  await camera(spec.code==='16'?'Arkadan':'Önden');await picture('RC56_'+spec.code+'_'+spec.type+'_occlusal.png');await camera('İzometrik');await picture('RC56_'+spec.code+'_'+spec.type+'_placed.png');
  await anatomyTab();
  for(const height of [.84,1.2]){
   const input=page.getByRole('spinbutton',{name:'Tüberkül yüksekliği sayısal değer',exact:true});await input.fill(String(height));await input.press('Enter');await frames();
   const rendered=(await state()).placement;assert.ok(rendered.cervicalCenterGapMm<.035,'Cusp-height adjustment cannot lift or bury the rendered cervical base');
   measurements.push({unit:spec.code,type:spec.type,height,cervicalCenterGapMm:rendered.cervicalCenterGapMm,maxMarginGapMm:rendered.maxMarginGapMm});
  }
  const input=page.getByRole('spinbutton',{name:'Tüberkül yüksekliği sayısal değer',exact:true});await input.fill('1');await input.press('Enter');await frames();
  if(i===0){
   await camera('Önden');await page.getByRole('tab',{name:'Serbest',exact:true}).click();await page.locator('.cad-tool-palette--compact [data-cad-tool=add]').click();
   const original=(await state()).geometry.hash,canvas=await page.locator('canvas').boundingBox();
   for(const [dx,dy] of [[0,0],[-20,0],[20,0],[0,20],[0,-20]]){
    const x=canvas.x+canvas.width/2+dx,y=canvas.y+canvas.height/2+dy;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+8,y+5,{steps:5});await page.mouse.up();await frames();if((await state()).geometry.hash!==original)break;
   }
   const sculpted=(await state()).geometry.hash;assert.notEqual(sculpted,original,'A real manual brush stroke must modify the placed crown');
   await page.locator('.cad-history-actions button[aria-label="Geri al"]').click();await frames();assert.equal((await state()).geometry.hash,original);
   await page.locator('.cad-history-actions button[aria-label="Yinele"]').click();await frames();assert.equal((await state()).geometry.hash,sculpted);
   await picture('RC56_manual_crown_design.png');
  }
  await page.getByRole('tab',{name:'Son kontrol',exact:true}).click();await idle();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-cad-download-stl]').click()]);
  assert.equal(download.suggestedFilename(),'CAD-RC56-RESTORATION-DentAYA-unit-'+spec.code+'.stl');
  const file=await download.path(),bytes=await fs.readFile(file),exported=new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),qc=analyzeCadMesh(exported);
  assert.equal(qc.watertight,true);assert.equal(qc.connectedComponents,1);assert.equal(qc.degenerateTriangles,0);
  const currentRecord=(await save()).units['unit-'+spec.code];assert.equal(qc.triangleCount,currentRecord.geometry.indices.length/3,'Only the active restoration is exported, never the scan or another unit');
  const points=exported.getAttribute('position'),inverse=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),spec.axis).invert(),s=project.settings,anchor=currentRecord.anchor,anchorQ=new THREE.Quaternion(...anchor.quaternion),q=anchorQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),THREE.MathUtils.degToRad(s.rotation_z_deg))),xy=s.morphology_scale*(1+s.proximal_contact_mm*.035),z=s.cusp_height*(1+s.occlusal_offset_mm*.04),baseZ=Math.min(...currentRecord.placementBase.filter((_,n)=>n%3===2)),origin=new THREE.Vector3(...anchor.position).add(sourceCenter).add(new THREE.Vector3(s.design_tx_mm,s.design_ty_mm,s.design_tz_mm+s.margin_offset_mm).applyQuaternion(anchorQ)).add(new THREE.Vector3(0,0,baseZ).applyQuaternion(anchorQ));let minZ=Infinity,maxRawVertexErrorMm=0;
  for(let v=0;v<points.count;v++){const raw=new THREE.Vector3().fromBufferAttribute(points,v),local=raw.clone().sub(spec.center).applyQuaternion(inverse),index=currentRecord.geometry.indices[v]*3,expected=new THREE.Vector3(currentRecord.geometry.positions[index]*xy,currentRecord.geometry.positions[index+1]*xy,(currentRecord.geometry.positions[index+2]-baseZ)*z).applyQuaternion(q).add(origin);maxRawVertexErrorMm=Math.max(maxRawVertexErrorMm,raw.distanceTo(expected));minZ=Math.min(minZ,local.z);assert.ok(local.length()<15,'Export stays around this raw preparation, not the scene origin');}
  assert.ok(maxRawVertexErrorMm<.00002,'Every exported triangle vertex matches the actual edited unit in raw scan coordinates: '+maxRawVertexErrorMm);
  if(i>0)assert.ok(Math.abs(minZ-.02)<.04,'Untouched cervical offset remains explicit: '+minZ);
  exports.push({unit:spec.code,triangles:qc.triangleCount,rawAxialMinZ:minZ,maxRawVertexErrorMm,bytes:bytes.length});exported.dispose();
  console.log('PASS: actual rendered '+spec.code+' '+spec.type+' stays on its selected preparation, survives real controls and exports a closed working STL in raw scan coordinates.');
 }
 const beforeAya=await state();await idle();await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 const aya=page.getByRole('dialog',{name:'AYA çalışma asistanı',exact:true});
 async function askAya(prompt){const count=await aya.locator('.cad-aya-messages article').count();await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill(prompt);await aya.getByRole('button',{name:'Gönder',exact:true}).click();const reply=aya.locator('.cad-aya-messages article').nth(count+1);await reply.waitFor();return reply;}
 const anatomy=await askAya('Bu kron çok yapay görünüyor, anatomik formu nasıl değiştirebilirim?');assert.equal(await anatomy.locator('[data-proposal-tool=library]').count(),1);
 const seating=await askAya('Bu kuron preparasyonun üstüne oturmuyor; nereden kontrol etmeliyim?');assert.match(await seating.textContent(),/iç yüzey uyumu onayı değildir/);assert.equal(await seating.locator('[data-proposal-tool=inspect]').count(),1);await picture('RC56_AYA_placement_guidance.png');
 const negative=await askAya('Bu kronu daha doğal yapma.');assert.equal(await negative.locator('[data-proposal-tool]').count(),0);
 assert.equal((await state()).geometry.hash,beforeAya.geometry.hash,'AYA advice cannot alter the real restoration without Apply');assert.deepEqual((await state()).history,beforeAya.history);
 await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 // Changing palette is cosmetic, and analysis must remove the enamel coat.
 const before=(await state()).geometry.hash;
 await page.getByRole('combobox',{name:'Model görünümü',exact:true}).selectOption('technical');await frames();assert.equal((await state()).restorationMaterial.clearcoat,0);assert.equal((await state()).geometry.hash,before);
 await page.getByRole('combobox',{name:'Model görünümü',exact:true}).selectOption('natural');await frames();assert.ok((await state()).restorationMaterial.clearcoat>0);assert.equal((await state()).geometry.hash,before);
 await idle();const saved=await save();await page.reload();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-cad-inspection-state]')?.dataset.cadInspectionState||'{}').placement?.placed,{},{timeout:65000});await idle();
 assert.ok((await state()).placement.cervicalCenterGapMm<.035,'The actual saved upper restoration remains on its margin after reopening');
 const reopened=await save();for(const spec of specs)assert.deepEqual(reopened.units['unit-'+spec.code].geometry,saved.units['unit-'+spec.code].geometry,'Unit geometry survives save/reopen exactly');
 // Failed legacy upgrades must retain the previously placed surface and anchor.
 const legacy=structuredClone(reopened);delete legacy.sources;
 legacy.units['unit-16'].key=legacy.units['unit-16'].key.replace(':anatomy-rc55',':legacy-rc37');
 const legacyRecord=legacy.units['unit-16'];assert.deepEqual(legacyRecord.geometry.positions,legacyRecord.base);
 for(const badMargin of [
  [{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}],
  [[0,0],[6,0],[6,6],[4,6],[4,2],[2,2],[2,6],[0,6]].map(([x,y])=>({x,y,z:0})),
 ]){
  project={...project,margin_points:badMargin,settings:{...project.settings,cad_workspace:await encodeCadWorkspace(legacy),source_margins:{},unit_margins:{...project.settings.unit_margins,'unit-16':badMargin}}};
  await page.reload();await page.waitForFunction(()=>{const n=document.querySelector('[data-cad-render-state]');return n&&JSON.parse(n.dataset.cadRenderState).design?.visible;},{},{timeout:65000});await idle();
  const retained=(await save()).units['unit-16'];assert.deepEqual(retained.geometry,legacyRecord.geometry,'Invalid or unregistrable legacy margin cannot erase the saved placed crown');assert.deepEqual(retained.anchor,legacyRecord.anchor,'Failed upgrade retains the saved cervical anchor exactly');
 }
 // A new unit without a model margin must show the raw scan, never a floating second crown.
 project={...project,workflow_stage:'margin',margin_points:[],settings:{...project.settings,show_design:true,job_setup:{...project.settings.job_setup,active_unit_id:'unit-48',units:[{...units[0],id:'unit-48',tooth_code:'48',anatomy_code:'48'}]},unit_margins:{},source_margins:{},unit_workflow:{}}};
 await page.reload();await page.waitForFunction(()=>{const node=document.querySelector('[data-cad-render-state]');return node&&JSON.parse(node.dataset.cadRenderState).design;},{},{timeout:65000});await idle();
 const render=await page.locator('[data-cad-render-state]').evaluate(node=>JSON.parse(node.dataset.cadRenderState));assert.equal(render.design.visible,false,'An unregistered starter is hidden instead of floating at the model center');assert.equal(render.state.renderedUnits,0);assert.ok(render.lower.visible,'The actual scan remains visible for choosing the restoration target');
 await page.getByRole('button',{name:'Tümünü göster',exact:true}).click();await frames();assert.equal((await page.locator('[data-cad-render-state]').evaluate(node=>JSON.parse(node.dataset.cadRenderState))).design.visible,false,'Show all cannot invent a restoration target');await picture('RC56_raw_model_before_margin.png');
 await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();
 const hidden=await askAya('Kuron görünmüyor, nasıl gösterebilirim?');assert.match(await hidden.textContent(),/ham modelde doğru dişi ve koleyi doğrula/);assert.equal(await hidden.locator('[data-proposal-tool=show-all]').count(),0);assert.ok(await page.getByRole('button',{name:'Marjin çiz',exact:true}).getAttribute('aria-pressed')==='true'||await hidden.locator('[data-proposal-tool=tool-margin]').count()===1,'AYA either keeps the already selected margin tool or offers that actual tool');await aya.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.locator('[data-cad-menu=app]>summary').click();await page.getByRole('button',{name:'Uzman',exact:true}).click();await page.getByRole('tab',{name:'İç yüzey',exact:true}).click();
 await page.getByText('Crown Shell / Intaglio',{exact:true}).click();await page.getByRole('button',{name:'Crown shell oluştur',exact:true}).click();await frames();assert.match(await page.locator('.cad-status-bar').textContent(),/Önce restorasyonu ham modelde/);
 await page.getByRole('button',{name:"Shell'i temizle",exact:true}).click();await frames();assert.equal((await page.locator('[data-cad-render-state]').evaluate(node=>JSON.parse(node.dataset.cadRenderState))).design.visible,false,'Shell commands cannot reveal a starter with no raw-model target');
 await page.getByRole('tab',{name:'Son kontrol',exact:true}).click();const beforeBlockedExport=downloadCount;await page.locator('[data-cad-download-stl]').click();await frames();assert.equal(downloadCount,beforeBlockedExport,'An unregistered starter cannot be exported');assert.match(await page.locator('.cad-status-bar').textContent(),/güncel koleye yerleştir/);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,realWebGL:true,syntheticPreparedStumps:true,syntheticBackend:true,crownAndCoping:true,offsetTiltedAndOppositeAxes:true,actualRenderedNeckRegistration:true,cuspHeightPreservesMargin:true,naturalFinishAndTechnicalPalette:true,cosmeticChangesPreserveGeometry:true,ayaRestorationGuidanceAndNoAutomaticActions:true,perUnitSaveReopen:true,failedLegacyUpgradeRetainsSavedSurface:true,rawModelBeforeTarget:true,noFloatingSecondCrown:true,hiddenStarterGuidance:true,modelInference:false,manualDesignUndoRedo:true,localActiveUnitStlDownload:true,unregisteredExportBlocked:true,measurements,exports,screenshots},null,2));
}catch(error){console.error(logs);throw error;}finally{await browser?.close();await stop();}
