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
let savedProject={id:'55555555-5555-4555-8555-555555555555',case_id:caseId,lab_org_id:orgId,source_scan_id:'scan-upper',title:'CAD test',restoration_type:'Kron',tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',workflow_stage:'design',status:'working',settings:{job_setup:{version:1,complete:true,active_unit_id:'unit-46-0',units:[unit('46',0),unit('47',1)],updated_at:null}},margin_points:[],measurements:[],updated_at:new Date().toISOString()};
const scan=(id,arch,file)=>({id,scan_ref:`TEST-${arch}`,patient_id:caseRow.patient_id,case_id:caseId,arch,captured_at:'2026-10-04T10:00:00Z',file_name:file,storage_bucket:'public-demo',storage_path:`/training-scans/${file}`,scanner_brand:'Test fixture',scanner_model:'Public scan',scan_origin:'laboratory',scan_purpose:'master_model'});
let server,browser,logs='',exitCode=null;const errors=[],writes=[];
try {
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3047'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-browser-test-placeholder'},stdio:['ignore','pipe','pipe']});
  for (const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-20000);});server.on('exit',code=>{exitCode=code;});
  const url='http://127.0.0.1:3047/design?case='+caseId,deadline=Date.now()+55000;
  while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(/unique "key"|hydration|Maximum update depth|Removing a style property/i.test(message.text()))errors.push(message.text());});
  await page.route('http://127.0.0.1:54321/**',async route=>{
    const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);let body=[];
    const user={id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    if(url.pathname.startsWith('/auth/'))body={user};
    else if(table==='memberships')body=[{organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
    else if(table==='organizations')body=[{id:orgId,name:'CAD Test Laboratuvarı',org_type:'laboratory'}];
    else if(table==='cases')body=[caseRow];
    else if(table==='scan_sessions')body=[scan('scan-upper','upper','602.stl'),scan('scan-lower','lower','601.stl')];
    else if(table==='design_projects'){
      if(req.method()!=='GET'){const data=req.postDataJSON();writes.push({table,data});savedProject={...savedProject,...data};}
      body=[savedProject];
    } else if(table==='profiles')body=[{id:userId,display_name:'CAD Test'}];
    if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
    await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
  });
  await page.addInitScript(({userId})=>{
    const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'}));
    localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:{id:userId,email:'cad-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
    localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'graphite',grid:false,axes:false,damping:false}));
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
  console.log('PASS: real CAD canvas and source models loaded.');
  assert.equal(await page.locator('canvas').count(),1);
  assert.equal(await page.locator('.cad-professional').getAttribute('data-workspace-mode'),'wizard');
  assert.equal(await page.locator('.cad-panel-tabs [role=tab]').count(),0);
  assert.equal(await page.locator('.cad-task-tools [data-cad-tool]').count(),1);
  assert.equal(await page.locator('.cad-tool-palette--compact [data-cad-tool=margin]').count(),0);
  assert.equal(await page.locator('.cad-tool-palette--compact [data-cad-tool=connector]').count(),0);
  assert.equal(await page.locator('#cad-tool-content [data-cad-tool]').count(),0,'One primary tool selector');
  // RC41 restores the six original CAD presets; custom files use the separate library.
  await page.locator('.cad-session-strip').getByRole('button',{name:'İş tanımı',exact:true}).click();
  const setup=page.getByRole('dialog',{name:'CAD iş tanımı',exact:true});
  const first=setup.locator('article').nth(0),second=setup.locator('article').nth(1);
  const family=()=>first.getByRole('combobox',{name:'Diş formu',exact:true});
  assert.equal(await family().locator('option').count(),6);assert.equal(await page.locator('[data-tooth-family]').count(),0);
  await family().selectOption('square');await second.getByRole('combobox',{name:'Diş formu',exact:true}).selectOption('oval');
  await setup.getByRole('button',{name:"İş tanımını onayla · CAD'e başla",exact:true}).click();await setup.waitFor({state:'hidden'});
  await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('kaydedildi'));
  assert.equal(savedProject.settings.job_setup.units[0].tooth_form,'square');assert.equal(savedProject.settings.job_setup.units[1].tooth_form,'oval');
  await page.reload();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.match(/Tarama (senkronize|hazır)/),{},{timeout:55000});
  await page.locator('.cad-session-strip').getByRole('button',{name:'İş tanımı',exact:true}).click();assert.equal(await family().inputValue(),'square');assert.equal(await second.getByRole('combobox',{name:'Diş formu',exact:true}).inputValue(),'oval');await setup.getByRole('button',{name:'Kapat',exact:true}).click();
  console.log('PASS: six original CAD presets and independent per-unit save/reload.');
  await appAction('Uzman');
  assert.equal(await page.locator('.cad-panel-tabs [role=tab]').count(),8);
  assert.equal(await page.locator('.cad-tool-palette--compact [data-cad-tool]').count(),8);
  assert.equal(await page.locator('.cad-left,.cad-toolrail,.cad-inspector').count(),0);
  for (const tool of ['orbit','margin','measure','add','reduce','smooth','flatten','connector']) {
    const button = page.locator(`.cad-tool-palette--compact [data-cad-tool=${tool}]`);
    await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.cad-tool-palette--compact [aria-pressed=true]').count(),1);
  }
  if(await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).count())await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).click();
  await page.getByRole('button',{name:'Tümünü göster',exact:true}).click();
  await page.getByLabel('Üst çene görünürlük yüzdesi').fill('35');
  assert.equal(await page.getByLabel('Üst çene görünürlük yüzdesi').inputValue(),'35');
  await page.getByLabel('Alt çene görünür',{exact:true}).uncheck();assert.equal(await page.locator('[data-layer=lower]').getAttribute('data-visible'),'false');
  await page.getByLabel('Alt çene görünür',{exact:true}).check();
  await page.getByRole('button',{name:'Restorasyon tek başına göster',exact:true}).click();
  assert.equal(await page.getByLabel('Taramalar görünür',{exact:true}).isChecked(),false);
  await page.getByLabel('Üst çene görünür',{exact:true}).check();
  assert.equal(await page.getByLabel('Taramalar görünür',{exact:true}).isChecked(),true);
  await page.getByRole('button',{name:'Tümünü göster',exact:true}).click();
  await page.getByRole('tab',{name:'Serbest',exact:true}).click();
  await page.locator('.cad-tool-palette--compact [data-cad-tool=add]').click();
  await page.getByLabel('Fırça yarıçapı sayısal değer').fill('2.8');await page.getByLabel('Fırça yarıçapı sayısal değer').press('Enter');
  assert.equal(await page.getByLabel('Fırça yarıçapı sürgüsü').inputValue(),'2.8');
  await page.locator('#cad-tool-content .cad-advanced-parameters>summary').click();
  await page.getByRole('button',{name:'Sivri',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Sivri',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.cad-floating-panel').getAttribute('data-docked'),'true');
  const dockedCanvas=await page.locator('canvas').boundingBox();
  await page.evaluate(()=>{window.__cadExpertDockCanvas=document.querySelector('canvas');});
  const handle=page.getByRole('button',{name:'Araç panelini taşı'}),before=await handle.boundingBox();
  await page.mouse.move(before.x+60,before.y+15);await page.mouse.down();await page.mouse.move(before.x+240,before.y-55,{steps:8});await page.mouse.up();
  const moved=await handle.boundingBox();assert.ok(moved.x>before.x+150);assert.ok(moved.y>=(await page.locator('.cad-viewport-frame').boundingBox()).y+7);
  assert.equal(await page.locator('.cad-floating-panel').getAttribute('data-docked'),'false');
  assert.ok((await page.locator('canvas').boundingBox()).width>=dockedCanvas.width-2,'Detaching the left inspector preserves the real scene area');
  assert.equal(await page.evaluate(()=>window.__cadExpertDockCanvas===document.querySelector('canvas')),true,'Detaching preserves the existing WebGL canvas');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:cad-floating-panel-v3')));
  const panelBounds=await page.locator('.cad-floating-panel').boundingBox();assert.ok(Math.abs(stored.x-panelBounds.x)<2);

  await handle.focus();await handle.press('Shift+ArrowRight');assert.ok((await handle.boundingBox()).x>moved.x+35);
  // Dragged or restored panels must leave the command rail and bottom controls accessible.
  for(let n=0;n<36;n++)await handle.press('Shift+ArrowRight');
  for(let n=0;n<22;n++)await handle.press('Shift+ArrowDown');
  const floatingBounds=await page.locator('.cad-floating-panel').boundingBox(),railBounds=await page.locator('.cad-main-header').boundingBox();
  assert.ok(floatingBounds.x+floatingBounds.width<=railBounds.x-7,'Floating inspector stays clear of the right command rail');
  assert.ok(floatingBounds.y+floatingBounds.height<=1000-25,'Floating inspector fits vertically with its real rendered height');
  assert.ok(await page.getByRole('button',{name:'Araç panelini gizle',exact:true}).isVisible());
  await appAction('Panel konumunu sıfırla');
  let scene=await page.locator('canvas').boundingBox();const cx=scene.x+scene.width*.43,cy=scene.y+scene.height*.5;
  await page.mouse.click(cx,cy,{button:'right'});await page.getByRole('menu',{name:'CAD sağ tık araçları'}).waitFor();
  await page.getByRole('menuitem',{name:'Yumuşat',exact:true}).click();assert.equal(await page.locator('.cad-tool-palette--compact [data-cad-tool=smooth]').getAttribute('aria-pressed'),'true');
  await page.mouse.move(cx,cy);await page.mouse.down({button:'right'});await page.mouse.move(cx+80,cy+40,{steps:8});await page.mouse.up({button:'right'});assert.equal(await page.getByRole('menu').count(),0);
  await page.mouse.click(cx,cy,{button:'right'});await page.getByRole('menu').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('menu').count(),0);
  await page.getByRole('button',{name:'Araç panelini gizle',exact:true}).click();assert.equal(await page.locator('.cad-floating-panel').count(),0);
  await page.getByRole('button',{name:'Tasarım paneli',exact:true}).click();await handle.waitFor();
  await appAction('Panel konumunu sıfırla');
  assert.equal(await page.locator('.cad-floating-panel').getAttribute('data-docked'),'true');
  scene=await page.locator('canvas').boundingBox();
  assert.ok(Math.abs(scene.width-dockedCanvas.width)<2,'Reset redocks the inspector and restores the scene width');
  assert.equal(await page.evaluate(()=>window.__cadExpertDockCanvas===document.querySelector('canvas')),true,'Reset keeps the same WebGL scene');
  // Sculpt the actual restoration, then verify geometry history and hidden-target protection.
  await page.getByRole('button',{name:'Restorasyon tek başına göster',exact:true}).click();
  await page.keyboard.press('Numpad8');
  await page.keyboard.press('Numpad5');
  await page.evaluate(async()=>{for(let n=0;n<35;n++)await new Promise(requestAnimationFrame);});
  scene=await page.locator('canvas').boundingBox();
  await page.locator('.cad-tool-palette--compact [data-cad-tool=add]').click();
  let hit=false;
  for(const [dx,dy] of [[0,0],[0,-30],[-25,0],[25,0],[0,30]]){
    await page.mouse.move(scene.x+scene.width/2+dx,scene.y+scene.height/2+dy);
    await page.mouse.down();await page.mouse.move(scene.x+scene.width/2+dx+8,scene.y+scene.height/2+dy+5,{steps:5});await page.mouse.up();
    if(await page.locator('.cad-history-actions button[aria-label="Geri al"]').isEnabled()){hit=true;break;}
  }
  assert.ok(hit,'A manual stroke must modify the visible restoration');
  const counts=()=>page.locator('.cad-history-count').textContent();
  const afterStroke=await counts();
  await page.locator('.cad-history-actions button[aria-label="Geri al"]').click();
  assert.notEqual(await counts(),afterStroke);assert.ok(await page.locator('.cad-history-actions button[aria-label="Yinele"]').isEnabled());
  await page.locator('.cad-history-actions button[aria-label="Yinele"]').click();assert.equal(await counts(),afterStroke);
  console.log('PASS: manual morphology edit and undo/redo.');
  await page.getByLabel('Restorasyon görünür',{exact:true}).uncheck();
  const hiddenHistory=await counts();await page.mouse.click(scene.x+scene.width/2,scene.y+scene.height/2);assert.equal(await counts(),hiddenHistory);
  await page.getByLabel('Restorasyon görünür',{exact:true}).check();await page.getByRole('button',{name:'Tümünü göster',exact:true}).click();
  await page.getByRole('button',{name:'Diş 47',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Diş 47',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Diş 46',exact:true}).click();
  await page.getByRole('tab',{name:'Anatomi',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Serbest şekillendirme'}).count(),0);
  await page.getByRole('tab',{name:'Kontrol',exact:true}).click();await page.getByRole('button',{name:'CAD Kernel QC çalıştır',exact:true}).click();
  await page.getByRole('tab',{name:'Serbest',exact:true}).click();
  await page.locator('.cad-main-header').getByRole('button',{name:'Kaydet',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.cad-status-bar')?.textContent?.includes('kaydedildi'));assert.ok(writes.length>0);assert.equal(savedProject.settings.job_setup.active_unit_id,'unit-46-0');
  await page.keyboard.press('Numpad8');await page.keyboard.press('Numpad5');
  // A real locale change must update labels without rebuilding the scene or losing CAD state.
  await page.evaluate(()=>{window.__cadLocaleCanvas=document.querySelector('canvas');});
  await appMenu();
  const languageSelect=page.locator('.cad-app-menu .language-select--compact select');
  const activeBefore=await page.locator('.cad-unit-selector button[aria-pressed=true]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('b')?.textContent));
  assert.deepEqual(activeBefore,['46']);
  const historyBeforeLocale=await counts();
  const positionBeforeLocale=await page.evaluate(()=>localStorage.getItem('dentaya:cad-floating-panel-v3'));
  for(const locale of ['en','de','ar','tr']){
    await languageSelect.selectOption(locale);
    await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
    await page.waitForFunction(()=>!document.querySelector('.cad-app-menu .language-select--compact select')?.disabled);
    assert.equal(await page.evaluate(()=>window.__cadLocaleCanvas===document.querySelector('canvas')),true);
    assert.equal(await counts(),historyBeforeLocale);
    assert.deepEqual(await page.locator('.cad-unit-selector button[aria-pressed=true]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('b')?.textContent)),activeBefore);
    assert.equal(await page.evaluate(()=>localStorage.getItem('dentaya:cad-floating-panel-v3')),positionBeforeLocale);
    assert.equal(await page.locator('.cad-tool-palette--compact [data-cad-tool]').count(),8);
    if(locale==='en')assert.equal(await page.locator('.cad-main-header').getByRole('button',{name:'Save',exact:true}).count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.dir),locale==='ar'?'rtl':'ltr');
  }
  await page.setViewportSize({width:1280,height:800});await appAction('Panel konumunu sıfırla');
  await page.waitForFunction(()=>{const r=document.querySelector('.cad-floating-panel')?.getBoundingClientRect(),frame=document.querySelector('.cad-viewport-frame')?.getBoundingClientRect();return r&&frame&&r.x>=0&&r.right<=innerWidth&&r.y>=frame.top&&r.bottom<=innerHeight;},{},{timeout:5000});
  const bounds=await page.locator('.cad-floating-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=1280);assert.ok(bounds.y>=(await page.locator('.cad-viewport-frame').boundingBox()).y&&bounds.y+bounds.height<=800);
  await appAction('Görünüm ve ses ayarları');
  await page.getByRole('dialog').waitFor();
  const paletteSelect=page.locator('dialog[open] .appearance-palette select');
  const clearColors=[];
  for(const [palette,bg] of [['style:old-money','#ede9de'],['theme:ocean','#071520'],['palette:carbon','#101215']]) {
    await paletteSelect.selectOption(palette);
    await page.waitForFunction(bg=>document.documentElement.style.getPropertyValue('--dy-bg')===bg,bg);
    // Wait for the actual rendered background, rather than racing software WebGL frames.
    await page.waitForFunction(bg=>{
      const gl=document.querySelector('canvas')?.getContext('webgl2');
      if(!gl)return false;
      const actual=Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE));
      return [1,3,5].every((offset,index)=>Math.abs(actual[index]-parseInt(bg.slice(offset,offset+2),16)/255)<.002);
    },bg,{timeout:10000});
    assert.equal(await page.evaluate(()=>window.__cadLocaleCanvas===document.querySelector('canvas')),true,'Palette changes must preserve the existing CAD canvas');
    assert.equal(await counts(),historyBeforeLocale);
    assert.deepEqual(await page.locator('.cad-unit-selector button[aria-pressed=true]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('b')?.textContent)),activeBefore);
    const workspace=await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:cad-workspace:v1')));assert.equal(workspace.background,'theme');
    clearColors.push(await page.locator('canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2');return Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE));}));
  }
  assert.notDeepEqual(clearColors[0],clearColors[1],'The real CAD background must follow the palette');
  assert.notDeepEqual(clearColors[1],clearColors[2]);
  await page.getByRole('button',{name:'Ayarları kapat',exact:true}).click();
  await page.getByRole('tab',{name:'Serbest',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Anatomi',exact:true}).getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');assert.equal(await page.getByRole('tab',{name:'Serbest',exact:true}).getAttribute('aria-selected'),'true');
  await page.setViewportSize({width:390,height:844});await appAction('Panel konumunu sıfırla');
  await page.waitForFunction(()=>{const r=document.querySelector('.cad-floating-panel')?.getBoundingClientRect();return r&&r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight;},{},{timeout:5000});
  const mobile=await page.locator('.cad-floating-panel').boundingBox();assert.ok(mobile.x>=0&&mobile.x+mobile.width<=390);assert.ok(mobile.y>=0&&mobile.y+mobile.height<=844);
  await page.getByRole('button',{name:'Araç panelini gizle',exact:true}).click();await page.getByRole('button',{name:'Nesne panelini daralt',exact:true}).click();
  assert.ok((await page.locator('.cad-object-panel').boundingBox()).width<50);assert.equal(await page.locator('.cad-floating-panel').count(),0);
  assert.ok(await page.getByRole('button',{name:'Tasarım paneli',exact:true}).isVisible());
  if(screenshotDir){
    await fs.mkdir(screenshotDir,{recursive:true});
    // Capture only after functional assertions; software WebGL captures can stall.
    try {
      await page.setViewportSize({width:1600,height:1000});
      if(await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).count())await page.getByRole('button',{name:'Nesne panelini aç',exact:true}).click();
      await appAction('Panel konumunu sıfırla');
      await page.keyboard.press('Numpad5');
      await page.evaluate(async()=>{for(let n=0;n<35;n++)await new Promise(requestAnimationFrame);});
      await page.waitForFunction(()=>{const r=document.querySelector('.cad-floating-panel')?.getBoundingClientRect();return r&&r.right<=innerWidth&&r.bottom<=innerHeight;},{},{timeout:5000});
      await page.screenshot({path:path.join(screenshotDir,'DentAYA_RC52_CAD_Expert.png'),timeout:15000,animations:'disabled',caret:'initial',style:'nextjs-portal{visibility:hidden!important}'});
    } catch(error) { console.warn('Optional CAD screenshot unavailable:',error.message); }
  }

  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,realEditor:true,realWebGL:true,legacyCadPresets:6,cancelledFamiliesAbsent:true,perUnitMorphology:true,morphologyReloadPreserved:true,defaultGuided:true,expertRequiresExplicitSelection:true,onePrimaryToolSelector:true,localeChangesPreserveScene:true,paletteChangesPreserveScene:true,paletteChangesPreserveUndoHistory:true,actualCadBackgroundFollowsPalette:true,publicScanModels:2,backend:'intercepted fixture, no production data',expertTabs:8,manualTools:8,objectControls:true,numericBrush:true,sculptUndoRedo:true,hiddenTargetProtection:true,panelDragKeyboardBounds:true,positionSaved:true,modelLoadingGuard:true,allToolSelections:true,tabKeyboard:true,mobilePanels:true,preferencesDialog:true,rightClickAndOrbit:true,activeUnit:true,save:true},null,2));
} catch(error){console.error(logs);if(browser&&screenshotDir){const pages=browser.contexts().flatMap(c=>c.pages());for(const page of pages)await page.screenshot({path:path.join(screenshotDir,'RC36-expert-failure.png'),timeout:5000}).catch(()=>{});}throw error;}
finally {await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}}
