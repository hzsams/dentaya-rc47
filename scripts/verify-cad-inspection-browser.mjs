import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const screenshotDir = process.env.DENTAYA_SCREENSHOT_DIR;
const userId='11111111-1111-4111-8111-111111111111', orgId='22222222-2222-4222-8222-222222222222', caseId='33333333-3333-4333-8333-333333333333';
const unit=(code,index)=>({id:`unit-${code}-${index}`,tooth_code:code,anatomy_code:code,role:'single',design_type:'anatomic_crown',tooth_form:code==='46'?'square':'slender',morphology_style:'balanced',material:'Zirkonya',attachment_type:'none',temporary:false,notes:''});
const caseRow={id:caseId,case_number:'CAD-TEST-030',patient_id:'44444444-4444-4444-8444-444444444444',patient_reference:'TEST',title:'Manuel CAD kontrolü',case_type:'Kron',status:'designing',priority:'normal',due_date:null,tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',clinical_notes:''};
// Synthetic registration target for display checks, not a preparation-fit fixture.
// RC55 intentionally hides a starter until a target margin exists.
const inspectionMargin=Array.from({length:24},(_,i)=>({x:8+4*Math.cos(i*Math.PI/12),y:-5+3*Math.sin(i*Math.PI/12),z:0}));
let savedProject={id:'55555555-5555-4555-8555-555555555555',case_id:caseId,lab_org_id:orgId,source_scan_id:'scan-upper',title:'CAD test',restoration_type:'Kron',tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',workflow_stage:'design',status:'working',settings:{job_setup:{version:1,complete:true,active_unit_id:'unit-46-0',units:[unit('46',0),unit('47',1)],updated_at:null}},margin_points:inspectionMargin,measurements:[],updated_at:new Date().toISOString()};
const scan=(id,arch,file)=>({id,scan_ref:`TEST-${arch}`,patient_id:caseRow.patient_id,case_id:caseId,arch,captured_at:'2026-10-04T10:00:00Z',file_name:file,storage_bucket:'public-demo',storage_path:`/training-scans/${file}`,scanner_brand:'Test fixture',scanner_model:'Public scan',scan_origin:'laboratory',scan_purpose:'master_model'});
let server,browser,logs='',exitCode=null;const errors=[],writes=[];
try {
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3053'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-browser-test-placeholder'},stdio:['ignore','pipe','pipe']});
  for (const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-20000);});server.on('exit',code=>{exitCode=code;});
  const url='http://127.0.0.1:3053/design?case='+caseId,deadline=Date.now()+55000;
  while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(/unique "key"|hydration|Maximum update depth|Removing a style property/i.test(message.text()))errors.push(message.text());});
  await page.route('http://127.0.0.1:54321/**',async route=>{
    const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);let body=[];
    if(req.method()==='OPTIONS'){
      await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
      return;
    }
    const user={id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    if(url.pathname.startsWith('/auth/'))body={user};
    else if(table==='memberships')body=[{organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
    else if(table==='organizations')body=[{id:orgId,name:'CAD Test Laboratuvarı',org_type:'laboratory'}];
    else if(table==='cases')body=[caseRow];
    else if(table==='scan_sessions')body=[scan('scan-upper','upper','602.stl'),scan('scan-lower','lower','601.stl')];
    else if(table==='design_projects'){
      if(req.method()!=='GET'){const data=req.postDataJSON();writes.push({table,method:req.method(),data});savedProject={...savedProject,...data};}
      body=[savedProject];
    } else if(table==='profiles')body=[{id:userId,display_name:'CAD Test'}];
    if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
    await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
  });
  await page.addInitScript(({userId})=>{
    document.addEventListener('DOMContentLoaded',()=>{
      const style=document.createElement('style');style.textContent='nextjs-portal{visibility:hidden!important}';document.head.appendChild(style);
    });
    // This bridge returns scoped model proposals to the real AYA UI and CAD host.
    // It tests clicked renderer integration; it is not native model inference.
    const model=window.rc53InspectionModel={calls:[],tool:'inspection',scopeMode:'current',cancels:0,mode:'normal'};
    window.dentayaDesktop={onOpenPreferences:()=>()=>{},localAyaStatus:async()=>({ok:true,models:[{name:'inspection-model-fixture',size:1000}],progress:{running:false,status:'ready',completed:0,total:0}}),localAyaChat:async input=>{
      model.calls.push(input);
      if(model.mode==='fail')return {ok:false,error:'LOCAL_TIMEOUT'};
      return {ok:true,output:'İnceleme önerisi hazır; işlem yalnız Uygula ile çalışır.',workingMemory:{goal:'Aktif restorasyonu geometriyi değiştirmeden incele',decisions:['Görünüm işlemleri kullanıcı tıklamasıyla çalışır'],openQuestions:[]},proposals:[{tool:model.tool,reason:'Mevcut görünüm için inceleme kontrolü',scope:model.scopeMode==='foreign'?'foreign-project:source:unit':input.cadContext.scope,snapshot:input.cadContext.snapshot}]};
    },localAyaCancel:async()=>{model.cancels++;return {ok:true};}};
    const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'}));
    localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:{id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
    localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'studio',grid:false,axes:false,damping:false}));
    localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
  },{userId});
  const appMenu = async() => { const menu=page.locator('[data-cad-menu=app]'); if(await menu.getAttribute('open')===null)await menu.locator('summary').first().click(); };
  const appAction = async(name) => { await appMenu(); await page.locator('[data-cad-menu=app]').getByRole('button',{name,exact:true}).click(); };
  let releaseModel;
  const modelGate = new Promise(resolve => { releaseModel = resolve; });
  await page.route('**/training-scans/602.stl', async route => { await modelGate; await route.continue(); });
  await page.goto(url);
  await page.locator('.cad-professional').waitFor({timeout:55000});
  await page.waitForFunction(()=>document.querySelector('.cad-scene-viewport')?.textContent?.includes('Tarama ve CAD sahnesi hazırlanıyor'));
  assert.ok(await page.locator('.cad-tool-palette [data-cad-tool=orbit]').isDisabled());
  releaseModel();
  await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.match(/Tarama (senkronize|hazır)/),{},{timeout:55000});

  const state=()=>page.locator('[data-cad-inspection-state]').evaluate(node=>JSON.parse(node.dataset.cadInspectionState));
  const waitState=async(predicate)=>page.waitForFunction(predicate);
  const settleCamera=async()=>page.evaluate(async()=>{let previous=null,stable=0;const deadline=performance.now()+15000;while(performance.now()<deadline){await new Promise(requestAnimationFrame);const value=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).camera,current=[...value.position,...value.target,...value.up];if(previous&&current.every((n,i)=>Math.abs(n-previous[i])<1e-9))stable++;else stable=0;if(stable>=3)return;previous=current;}throw Error('The actual camera did not settle');});

  await page.waitForFunction(()=>{const node=document.querySelector('[data-cad-inspection-state]');return node&&JSON.parse(node.dataset.cadInspectionState).geometry.hash;});
  assert.equal(await page.locator('canvas').count(),1);
  await page.evaluate(()=>{window.__inspectionCanvas=document.querySelector('canvas');});
  const baseline=await state();
  assert.equal(baseline.placement.placed,true,'Inspection uses a restoration registered to an explicit target, never an origin starter');
  assert.equal(baseline.flashlight.visible,false);assert.equal(baseline.exposure,1.08);
  assert.equal(await page.locator('[data-cad-command=inspection]').count(),0,'Guided work keeps expert inspection gated');
  const aya=page.getByRole('dialog',{name:'AYA çalışma asistanı',exact:true});
  const openAya=async()=>{if(!await aya.count())await page.locator('.cad-main-header').getByRole('button',{name:'AYA',exact:true}).click();await aya.getByRole('combobox',{name:'Kurulu yerel model',exact:true}).waitFor();};
  const askTool=async(tool,scopeMode='current')=>{
    await page.evaluate(({tool,scopeMode})=>{window.rc53InspectionModel.tool=tool;window.rc53InspectionModel.scopeMode=scopeMode;},{tool,scopeMode});
    await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill('Bu çalışma için '+tool+' önerisini hazırla.');
    await aya.getByRole('button',{name:'Gönder',exact:true}).click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
    const proposal=aya.locator(`[data-proposal-tool="${tool}"]`).last();await proposal.waitFor();
    return proposal;
  };
  const forceRejectedClick=async proposal=>{
    // React suppresses disabled DOM clicks. Invoke this real proposal button's
    // registered handler to verify the validator also rejects bypassed UI affordances.
    await proposal.getByRole('button').evaluate(button=>{const key=Object.keys(button).find(name=>name.startsWith('__reactProps$'));const handler=key&&button[key]?.onClick;if(typeof handler!=='function')throw Error('Proposal click handler unavailable');handler({type:'click',currentTarget:button,preventDefault(){},stopPropagation(){}});});
    await aya.getByRole('alert').filter({hasText:'Çalışma değişti'}).waitFor();
  };
  const assertInspectionPreservesMesh=async()=>{
    const current=await state();assert.deepEqual(current.geometry,baseline.geometry);assert.deepEqual(current.history,baseline.history);
    // The existing 900ms autosave persists display preferences as well as CAD
    // edits. A visual proposal must preserve model data, not disable autosave.
    for(const write of writes){
      assert.equal(write.method,'PATCH');assert.equal(write.data.source_scan_id,'scan-upper');
      assert.equal(write.data.workflow_stage,'design');assert.deepEqual(write.data.tooth_codes,['46','47']);
      assert.deepEqual(write.data.margin_points,inspectionMargin);assert.deepEqual(write.data.measurements,[]);
    }
  };
  await openAya();
  const guidedProposal=await askTool('inspection');
  const guidedContext=await page.evaluate(()=>window.rc53InspectionModel.calls.at(-1).cadContext);
  for(const tool of ['inspection','flashlight-on','flashlight-off'])assert.ok(!guidedContext.availableTools.includes(tool),'The host withholds expert capabilities in guided mode');
  assert.ok(await guidedProposal.getByRole('button').isDisabled());
  await forceRejectedClick(guidedProposal);
  assert.equal(await page.locator('.cad-inspection-panel').count(),0);assert.equal((await state()).flashlight.visible,false);await assertInspectionPreservesMesh();
  await appAction('Uzman');
  assert.equal(await page.locator('.cad-tool-palette--compact [data-cad-tool]').count(),8,'Original manual tools remain intact');
  const foreignProposal=await askTool('inspection','foreign');
  assert.ok(await foreignProposal.getByRole('button').isDisabled(),'A foreign project scope is rejected even when the capability is available');
  await forceRejectedClick(foreignProposal);assert.equal(await page.locator('.cad-inspection-panel').count(),0);
  const inspectionProposal=await askTool('inspection');
  assert.ok(await inspectionProposal.getByRole('button',{name:'Uygula',exact:true}).isEnabled());
  assert.equal(await page.locator('.cad-inspection-panel').count(),0,'A model proposal cannot open a CAD window automatically');
  const offContext=await page.evaluate(()=>window.rc53InspectionModel.calls.at(-1).cadContext);
  assert.equal(offContext.inspectionFlashlight,false);assert.equal(offContext.inspectionFlashlightTarget,'camera');
  assert.ok(offContext.availableTools.includes('inspection'));assert.ok(offContext.availableTools.includes('flashlight-on'));assert.ok(!offContext.availableTools.includes('flashlight-off'));
  await inspectionProposal.getByRole('button',{name:'Uygula',exact:true}).click();await page.locator('.cad-inspection-panel').waitFor();
  const unavailableOff=await askTool('flashlight-off');assert.ok(await unavailableOff.getByRole('button').isDisabled(),'Host capability state excludes an off action while the light is off');
  await forceRejectedClick(unavailableOff);assert.equal((await state()).flashlight.visible,false);
  const turnOn=await askTool('flashlight-on');
  assert.equal((await state()).flashlight.visible,false,'The real light stays off until Apply is clicked');await assertInspectionPreservesMesh();
  await turnOn.getByRole('button',{name:'Uygula',exact:true}).click();
  await waitState(()=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).flashlight.visible);
  assert.ok(await turnOn.getByRole('button').isDisabled(),'Applied scoped suggestions cannot be replayed');await assertInspectionPreservesMesh();
  const turnOff=await askTool('flashlight-off'),onContext=await page.evaluate(()=>window.rc53InspectionModel.calls.at(-1).cadContext);
  assert.equal(onContext.inspectionFlashlight,true);assert.ok(onContext.availableTools.includes('flashlight-off'));assert.ok(!onContext.availableTools.includes('flashlight-on'));
  assert.equal((await state()).flashlight.visible,true,'An off proposal also waits for Apply');
  await turnOff.getByRole('button',{name:'Uygula',exact:true}).click();
  await waitState(()=>!JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).flashlight.visible);await assertInspectionPreservesMesh();
  const staleOn=await askTool('flashlight-on');assert.ok(await staleOn.getByRole('button',{name:'Uygula',exact:true}).isEnabled());
  await appAction('Adım adım');await page.locator('.cad-inspection-panel').waitFor({state:'hidden'});
  assert.ok(await staleOn.getByRole('button').isDisabled(),'Changing workspace mode revokes expert proposal capabilities');
  await forceRejectedClick(staleOn);assert.equal((await state()).flashlight.visible,false);await assertInspectionPreservesMesh();
  await appAction('Uzman');await aya.getByRole('button',{name:'Kapat',exact:true}).click();
  if(await page.locator('.cad-inspection-panel').count())await page.locator('.cad-inspection-panel>header button').click();
  console.log('PASS: clicked AYA inspection/on/off use actual renderer state; guided, unavailable, foreign-scope and revoked capabilities are rejected. Local model bridge is synthetic.');
  await page.locator('[data-cad-command=inspection]').click();
  const panel=page.locator('.cad-inspection-panel'),control=id=>panel.locator(`[data-cad-inspection="${id}"]`),tab=id=>panel.locator(`[data-inspection-tab="${id}"]`);
  await panel.waitFor();
  const darkImage=await page.locator('canvas').evaluate(node=>node.toDataURL('image/png'));
  await control('flashlight').check();
  await waitState(()=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).flashlight.visible);
  const litImage=await page.locator('canvas').evaluate(node=>node.toDataURL('image/png'));
  assert.notDeepEqual(litImage,darkImage,'Actual rendered pixels change under the flashlight');
  await control('flashlight-intensity').fill('3.8');await control('flashlight-cone').fill('40');await control('exposure').fill('1.5');
  await waitState(()=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.flashlight.intensity===3.8&&Math.abs(s.flashlight.angle-Math.PI*40/180)<1e-8&&s.exposure===1.5;});
  const centeredLight=await state();assert.deepEqual(centeredLight.flashlight.position,centeredLight.camera.position);assert.deepEqual(centeredLight.flashlight.target,centeredLight.camera.target);
  await control('flashlight-target').selectOption('pointer');
  const canvas=await page.locator('canvas').boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.72,canvas.y+canvas.height*.6);
  await waitState(()=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.flashlight.target.some((v,i)=>Math.abs(v-s.camera.target[i])>.01);});
  const firstAim=(await state()).flashlight.target;
  await page.mouse.move(canvas.x+canvas.width*.6,canvas.y+canvas.height*.7);
  await page.waitForFunction(first=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).flashlight.target.some((v,i)=>Math.abs(v-first[i])>.01),firstAim);
  if(screenshotDir){await fs.mkdir(screenshotDir,{recursive:true});await page.screenshot({path:path.join(screenshotDir,'CAD_Inspection_Desktop.png'),timeout:15000,animations:'disabled',caret:'initial',style:'nextjs-portal{visibility:hidden!important}'});}
  await tab('surface').click();
  for(const name of ['edges','normals','faceted','interior'])await control(name).check();
  await waitState(()=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.edges>0&&s.normals>0&&s.faceted&&s.side===2;});
  assert.ok((await state()).normals<=240,'Normals are bounded to 240 actual samples');
  await tab('section').click();
  await control('section-center').click();
  await control('section-contours').check();
  await waitState(()=>{const c=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).sectionContours;return c?.restoration?.segmentCount>0&&c.restoration.areaMm2>0;});
  await panel.locator('[data-cad-section-readout]').filter({hasText:/mm²/}).waitFor({timeout:15000});
  assert.match(await panel.locator('[data-cad-section-readout]').textContent(),/mm²/,'Actual closed section measurements reach the visible inspection panel');
  assert.equal((await state()).geometry.hash,baseline.geometry.hash,'Section computation cannot modify the crown');
  if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,'CAD_Section_Measurements.png'),animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});
  await openAya();
  const sectionEvidence=aya.locator('[data-aya-section-evidence]');
  await sectionEvidence.waitFor({state:'attached'});const measuredSection=JSON.parse(await sectionEvidence.getAttribute('data-aya-section-evidence'));
  assert.ok(measuredSection.restoration.areaMm2>0);assert.equal(measuredSection.sourceSimplified,true,'The actual 669k-triangle scan is disclosed as a displayed preview');
  assert.ok(Math.abs(measuredSection.restoration.areaMm2-(await state()).sectionContours.restoration.areaMm2)<1e-6,'The live AYA context receives the actual section result');
  await askTool('inspection');const sectionInput=await page.evaluate(()=>window.rc53InspectionModel.calls.at(-1).cadContext);assert.equal(sectionInput.section.key,measuredSection.key);assert.equal(sectionInput.section.restoration.areaMm2,measuredSection.restoration.areaMm2);
  await page.evaluate(()=>{window.rc53InspectionModel.mode='fail';});
  await aya.getByRole('textbox',{name:'AYA’ya mesajınız',exact:true}).fill('Bu kesitin gerçek alanını ve uzunluğunu yorumla.');await aya.getByRole('button',{name:'Gönder',exact:true}).click();await aya.getByRole('button',{name:'Gönder',exact:true}).waitFor();
  const actualReply=aya.locator('.cad-aya-messages article').last();assert.ok((await actualReply.textContent()).includes(String(Number(measuredSection.restoration.areaMm2.toPrecision(6)))+' mm²'),'Core cites the actual measured closed area');assert.match(await actualReply.textContent(),/sadeleştirilmiş/);assert.match(await actualReply.textContent(),/duvar kalınlığı/);assert.equal(await actualReply.locator('[data-proposal-tool]').count(),0,'Interpreting existing contours never proposes or runs a geometry mutation');await assertInspectionPreservesMesh();
  if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,'RC58_AYA_Section_Evidence.png'),animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});
  await page.evaluate(()=>{window.rc53InspectionModel.mode='normal';});

  for(const [axis,expected] of [['x',[1,0,0]],['y',[0,1,0]],['z',[0,0,1]],['insertion',[0,0,1]]]){
    await control('section-axis').selectOption(axis);
    await page.waitForFunction(expected=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.section&&s.section.normal.every((v,i)=>Math.abs(v-expected[i])<1e-8);},expected);
    const current=await state(),dot=current.section.normal.reduce((sum,n,i)=>sum+n*current.restorationCenter[i],current.section.constant);
    assert.ok(Math.abs(dot)<1e-6,'Section passes through the actual restoration center');
  }
  await control('section-offset').fill('2.5');
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.section&&Math.abs(s.section.normal.reduce((sum,n,i)=>sum+n*s.restorationCenter[i],s.section.constant)+2.5)<1e-6;});
  const beforeInvert=(await state()).section;
  await page.waitForFunction(expected=>{const e=document.querySelector('[data-aya-section-evidence]');if(!e)return false;return Math.abs(JSON.parse(e.dataset.ayaSectionEvidence).plane.constantMm-expected)<1e-6;},beforeInvert.constant);
  const beforeReceipt=JSON.parse(await sectionEvidence.getAttribute('data-aya-section-evidence'));await control('section-invert').check();
  await page.waitForFunction(before=>{const p=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).section;return Math.abs(p.constant+before.constant)<1e-6&&p.normal.every((v,i)=>Math.abs(v+before.normal[i])<1e-6);},beforeInvert);
  await page.waitForFunction(oldKey=>{const e=document.querySelector('[data-aya-section-evidence]');return e&&JSON.parse(e.dataset.ayaSectionEvidence).key!==oldKey;},beforeReceipt.key);
  const invertedReceipt=JSON.parse(await sectionEvidence.getAttribute('data-aya-section-evidence')),invertedPlane=(await state()).section;
  assert.deepEqual(invertedReceipt.plane.normal,invertedPlane.normal);assert.ok(Math.abs(invertedReceipt.plane.constantMm-invertedPlane.constant)<1e-6);
  for(const role of ['restoration','source']){const a=beforeReceipt[role],b=invertedReceipt[role];assert.equal(Boolean(a),Boolean(b));if(!a)continue;assert.ok(Math.abs(a.lengthMm-b.lengthMm)<1e-5);if(a.areaMm2!==null&&b.areaMm2!==null)assert.ok(Math.abs(a.areaMm2-b.areaMm2)<1e-5);else assert.equal(a.areaMm2,b.areaMm2);}
  await askTool('inspection');const invertedInput=await page.evaluate(()=>window.rc53InspectionModel.calls.at(-1).cadContext);assert.equal(invertedInput.section.key,invertedReceipt.key);assert.ok(invertedInput.section.plane.normal.every((v,i)=>Math.abs(v-invertedReceipt.plane.normal[i])<1e-8));assert.ok(Math.abs(invertedInput.section.plane.constantMm-invertedReceipt.plane.constantMm)<1e-8);await assertInspectionPreservesMesh();
  await control('section').uncheck();
  await sectionEvidence.waitFor({state:'detached'});await aya.getByRole('button',{name:'Kapat',exact:true}).click();
  await waitState(()=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).sectionContours===null);
  await tab('camera').click();await control('focus').click();
  await waitState(()=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.camera.target.every((v,i)=>Math.abs(v-s.restorationCenter[i])<1e-6);});
  await settleCamera();
  const beforeTurn=(await state()).camera;
  await control('rotate-left').click();
  await page.waitForFunction(before=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return s.camera.position.some((v,i)=>Math.abs(v-before.position[i])>.1);},beforeTurn);
  await settleCamera();
  const left=(await state()).camera,beforeDelta=beforeTurn.position.map((v,i)=>v-beforeTurn.target[i]),leftDelta=left.position.map((v,i)=>v-left.target[i]);
  assert.ok(Math.abs(beforeDelta[0]*leftDelta[0]+beforeDelta[2]*leftDelta[2])<1e-4,'Camera makes a settled real 90 degree orbit: '+JSON.stringify({beforeDelta,leftDelta}));
  assert.ok(Math.abs(Math.hypot(...beforeDelta)-Math.hypot(...leftDelta))<1e-5);
  assert.ok(left.target.every((value,index)=>Math.abs(value-beforeTurn.target[index])<1e-8),'Orbit keeps its target within numerical precision');
  await control('rotate-right').click();
  await page.waitForFunction(before=>JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState).camera.position.every((v,i)=>Math.abs(v-before.position[i])<1e-5),beforeTurn);
  await control('reset').click();
  await waitState(()=>{const s=JSON.parse(document.querySelector('[data-cad-inspection-state]').dataset.cadInspectionState);return !s.flashlight.visible&&!s.edges&&!s.normals&&!s.faceted&&s.side===0&&s.exposure===1.08&&!s.section;});
  const finalState=await state();assert.deepEqual(finalState.geometry,baseline.geometry,'Real source/restoration geometry content fingerprints stay unchanged');assert.deepEqual(finalState.history,baseline.history,'Inspection does not create undo entries');
  assert.equal(await page.evaluate(()=>window.__inspectionCanvas===document.querySelector('canvas')),true,'Inspection preserves the single WebGL scene');
  for(const locale of ['en','de','tr']){
    await appMenu();await page.locator('.cad-app-menu .language-select--compact select').selectOption(locale);
    await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
    await page.waitForFunction(()=>!document.querySelector('.cad-app-menu .language-select--compact select')?.disabled);
    assert.equal(await panel.locator('header strong').textContent(),locale==='tr'?'Uzman inceleme':'Expert inspection','New inspection copy uses Turkish and English fallback');
    assert.equal(await page.evaluate(()=>window.__inspectionCanvas===document.querySelector('canvas')),true);
  }
  await page.locator('[data-cad-menu=app]').evaluate(node=>node.removeAttribute('open'));
  await page.setViewportSize({width:390,height:844});
  const bounds=await panel.boundingBox(),rail=await page.locator('.cad-main-header').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=rail.x-3&&bounds.y+bounds.height<=844-23,'Narrow inspection window stays within the canvas controls area');
  if(screenshotDir){await fs.mkdir(screenshotDir,{recursive:true});await page.screenshot({path:path.join(screenshotDir,'CAD_Inspection_Mobile.png'),timeout:15000,animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});}
  await page.setViewportSize({width:1600,height:1000});
  await tab('light').click();await control('flashlight').check();await control('flashlight-target').selectOption('pointer');await control('flashlight-intensity').fill('3.2');
  await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.cad-save-state')?.dataset.saveState==='saved');
  assert.equal(savedProject.settings.inspection_flashlight,true);assert.equal(savedProject.settings.inspection_flashlight_target,'pointer');assert.equal(savedProject.settings.inspection_flashlight_intensity,3.2);
  // Reference colours are application appearance presets, not mini-game skins.
  // Exercise the same preference control against this existing live CAD scene.
  const beforePaletteState=await state(),beforePaletteUnits=await page.locator('.cad-unit-selector button[aria-pressed=true]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('b')?.textContent));
  await page.evaluate(()=>{window.__referencePaletteCanvas=document.querySelector('canvas');});
  await appAction('Görünüm ve ses ayarları');
  const appearanceSelect=page.locator('dialog[open] .appearance-palette select');await appearanceSelect.waitFor();
  const originalAppearance=await appearanceSelect.inputValue();assert.notEqual(originalAppearance,'custom','The fixture starts from a restorable named appearance');
  for(const [id,bg,screenshot] of [
    ['reference-midnight','#121747','RC58_Background_CAD_Midnight.png'],
    ['reference-graphite','#0c0d0e','RC58_Background_CAD_Graphite.png'],
    ['reference-turquoise','#082a30',null],
    ['reference-coral','#2b1621',null],
  ]){
    await appearanceSelect.selectOption('palette:'+id);
    await page.waitForFunction(bg=>document.documentElement.style.getPropertyValue('--dy-bg')===bg,bg);
    await page.waitForFunction(bg=>{const gl=document.querySelector('canvas')?.getContext('webgl2');if(!gl)return false;const actual=Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE));return [1,3,5].every((offset,index)=>Math.abs(actual[index]-parseInt(bg.slice(offset,offset+2),16)/255)<.002);},bg,{timeout:15000});
    assert.equal(await page.evaluate(()=>window.__referencePaletteCanvas===document.querySelector('canvas')),true,'Changing application background retains the existing CAD canvas');
    const current=await state();assert.deepEqual(current.geometry,beforePaletteState.geometry,'Reference palettes cannot modify source or restoration geometry');assert.deepEqual(current.history,beforePaletteState.history,'Reference palettes cannot create or clear undo entries');
    assert.deepEqual(await page.locator('.cad-unit-selector button[aria-pressed=true]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('b')?.textContent)),beforePaletteUnits);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:cad-workspace:v1')).background),'theme');
    if(screenshotDir&&screenshot){await page.getByRole('button',{name:'Ayarları kapat',exact:true}).click();await fs.mkdir(screenshotDir,{recursive:true});await page.screenshot({path:path.join(screenshotDir,screenshot),animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});await appAction('Görünüm ve ses ayarları');await appearanceSelect.waitFor();}
  }
  await appearanceSelect.selectOption(originalAppearance);await page.getByRole('button',{name:'Ayarları kapat',exact:true}).click();
  console.log('PASS: four application reference palettes update the actual WebGL background while preserving canvas, source/restoration geometry, undo history and active unit.');
  await page.reload();await page.waitForFunction(()=>{const node=document.querySelector('[data-cad-inspection-state]');if(!node)return false;const current=JSON.parse(node.dataset.cadInspectionState);return current.flashlight.visible&&current.geometry.hash&&current.geometry.sourceHash;},{},{timeout:55000});
  const reloaded=await state();assert.equal(reloaded.flashlight.intensity,3.2);assert.equal(reloaded.geometry.hash,baseline.geometry.hash);assert.equal(reloaded.geometry.sourceHash,baseline.geometry.sourceHash);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,realWebGL:true,flashlightPixelsChanged:true,clickedAyaInspection:true,clickedAyaFlashlightOnOff:true,hostCapabilitiesChecked:true,unavailableAndForeignScopeRejected:true,modeRevokesExpertProposals:true,syntheticLocalModelBridge:true,pointerAim:true,powerConeExposure:true,restorationEdges:true,boundedWorldNormals:true,facetedAndInterior:true,sectionAxesCenterInvert:true,actualSectionEvidenceToModel:true,modelFailureInterpretsRealContours:true,identicalContourNewPlaneRefreshesReceipt:true,sectionOffRemovesEvidence:true,restorationFocus:true,realQuarterTurns:true,sourceAndRestorationFingerprintsPreserved:true,historyPreserved:true,singleCanvas:true,mobileBounds:true,newControlsEnglishFallback:true,savedInspectionSettings:true,referenceApplicationPalettes:4,referencePalettesActualWebGLBackground:true,referencePalettesPreserveSceneGeometryHistoryAndUnit:true,backend:'intercepted synthetic fixture'},null,2));
} catch(error){console.error(logs);throw error;}
finally {await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}}
