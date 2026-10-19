import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222',caseId='33333333-3333-4333-8333-333333333333';
const screenshotDir=process.env.DENTAYA_SCREENSHOT_DIR;
let server,browser,logs='',exitCode=null,orgType='clinic',role='owner',missingSchema=false,recordCount=0;
const runs=[],writes=[],errors=[],layout=[],languages=[],pages=[];
try {
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3048'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-layout-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const s of [server.stdout,server.stderr])s.on('data',d=>{logs=(logs+d).slice(-24000);});server.on('exit',c=>{exitCode=c;});
 const base='http://127.0.0.1:3048',deadline=Date.now()+65000;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(base+'/pilot-flow')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/unique "key"|hydration|Maximum update depth/i.test(m.text()))errors.push(m.text());});
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1),method=req.method();
  let body=[];
  const user={id:userId,email:'layout-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  if(method==='OPTIONS'){await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});return;}
  if(url.pathname.startsWith('/auth/'))body={user};
  else if(table==='memberships')body=[{id:'membership-test',organization_id:orgId,user_id:userId,role,status:'active',created_at:'2026-01-01T00:00:00Z',organization:{id:orgId,name:'Yerleşim Test Kurumu',org_type:orgType}}];
  else if(table==='organizations')body=[{id:orgId,name:'Yerleşim Test Kurumu',org_type:orgType,slug:'test',demo_mode:false,country:'TR',directory_visible:true,accepts_new_cases:true,created_by:userId}];
  else if(table==='profiles')body=[{id:userId,full_name:'Test Kullanıcısı',display_name:'Test Kullanıcısı',email:'layout-test@example.invalid',avatar_url:null}];
  else if(table==='cases')body=[{id:caseId,case_number:'CASE-TEST-001',patient_reference:'TEST',title:'Kaydet örnek vaka',status:'accepted',priority:'normal',due_date:null,clinic_org_id:orgId,lab_org_id:orgId,updated_at:'2026-10-11T09:00:00Z',created_at:'2026-10-11T08:00:00Z',tooth_codes:['46','47'],material:'Zirkonya',shade:'A2',case_type:'Kron'}];
  else if(table==='validation_runs'){
   if(missingSchema){await route.fulfill({status:404,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({code:'PGRST205',message:'Missing test schema'})});return;}
   body=[...runs].reverse();
  } else if(table==='dentaya_record_validation_run'){
   const args=req.postDataJSON();writes.push(args);
   const id='66666666-6666-4666-8666-'+String(++recordCount).padStart(12,'0');
   const row=Object.fromEntries(Object.entries(args).map(([k,v])=>[k.slice(2),v]));
   runs.push({...row,id,created_by:userId,created_at:new Date().toISOString()});body=id;
  }
  if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','content-range':'0-0/1'},body:JSON.stringify(body)});
 });
 await page.route('**/api/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ready',checks:{supabase:true,mapsEmbed:false,mapsGeocoding:false,mapsRoutes:false}})}));
 await page.addInitScript(({userId})=>{
  const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'}));
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:{id:userId,email:'layout-test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
 },{userId});
 async function goto(route){await page.goto(base+route);await page.locator('main').first().waitFor();await page.waitForTimeout(600);pages.push(route);}
 async function checkStacks(route){
  const rows=await page.locator('[data-dy-copy-stack],.dy-title-detail').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width&&n.children.length===2&&n.children[0].tagName==='STRONG').map(n=>{const a=n.children[0].getBoundingClientRect(),b=n.children[1].getBoundingClientRect();return {title:n.children[0].textContent.slice(0,90),gap:Math.round((b.top-a.bottom)*10)/10,within:b.right<=innerWidth+1};}));
  for(const row of rows){assert.ok(row.gap>=-1,route+' joined title: '+JSON.stringify(row));assert.ok(row.within,route+' clipped detail: '+JSON.stringify(row));}
  layout.push({route,width:page.viewportSize().width,pairs:rows.length});
 }
 await goto('/pilot-flow');await page.locator('.validation-center').waitFor();await page.getByRole('button',{name:'D-04',exact:false}).click();
 await page.getByLabel('Protokol referansı',{exact:true}).fill('PROTOCOL-TEST/r1');
 await page.getByLabel('Kabul ölçütü',{exact:true}).fill('Kaydet özel ölçüt - coordinates must remain unchanged');
 await page.getByLabel('Gözlenen sonuç',{exact:true}).fill('Kaydet özel sonuç - measured geometry remained unchanged');
 await page.getByLabel('Kanıt referansı',{exact:true}).fill('report://CAD-TEST-001');
 await page.getByLabel('Sonuç',{exact:true}).selectOption('passed');
 await page.getByLabel('Bulgu önem derecesi',{exact:true}).selectOption('critical');
 await page.locator('.validation-save').click();assert.equal(writes.length,0);assert.match(await page.locator('.validation-editor [role=status]').textContent(),/kritik/i);
 await page.getByLabel('Bulgu önem derecesi',{exact:true}).selectOption('none');
 await page.locator('.validation-save').click();await page.waitForFunction(()=>document.querySelector('.validation-metrics strong')?.textContent==='1 / 12');
 assert.equal(writes.length,1);assert.equal(writes[0].p_requirement_id,'D-04');assert.equal(writes[0].p_case_id,caseId);assert.equal(Object.hasOwn(writes[0],'p_created_by'),false);
 await page.getByLabel('Kabul ölçütü',{exact:true}).fill('Kaydet özel ölçüt - review before the next release');
 await page.getByLabel('Gözlenen sonuç',{exact:true}).fill('Calibration review is required before acceptance');
 await page.getByLabel('Kanıt referansı',{exact:true}).fill('report://CAD-TEST-002');
 await page.getByLabel('Düzeltme ve yeniden test planı',{exact:true}).fill('Repeat the test after calibration review');
 await page.locator('.validation-save').click();await page.waitForFunction(()=>document.querySelector('.validation-metrics strong')?.textContent==='0 / 12');assert.equal(writes.length,2);assert.equal(writes[1].p_supersedes,runs[0].id);assert.equal(runs.length,2);
 await page.getByLabel('Ürün sürümü',{exact:true}).fill('1.0.0-rc.32');assert.equal(await page.locator('.validation-metrics strong').first().textContent(),'0 / 12');
 await page.getByLabel('Ürün sürümü',{exact:true}).fill('1.0.0-rc.33');
 await page.getByLabel('Kabul ölçütü',{exact:true}).fill('Kaydet değişmeyecek kullanıcı ölçütü');
 await page.getByLabel('Gözlenen sonuç',{exact:true}).fill('Kaydet değişmeyecek kullanıcı sonucu');
 const localeCodes=['en','de','fr','es','it','pt','nl','pl','ro','ru','uk','ar','zh','ja','sv','da','el','cs','ko','bg','hr','et','fi','hu','ga','lv','lt','mt','sk','sl','tr'];
 for(const code of localeCodes){await page.locator('.language-select--compact select').selectOption(code);await page.waitForFunction(code=>document.documentElement.lang===code,code);await page.waitForTimeout(60);assert.equal(await page.locator('.validation-context input').nth(1).inputValue(),'PROTOCOL-TEST/r1');assert.equal(await page.locator('.validation-editor textarea').first().inputValue(),'Kaydet değişmeyecek kullanıcı ölçütü');assert.equal(await page.locator('.validation-requirements [aria-pressed=true] .validation-id').textContent(),'D-04');assert.ok((await page.locator('#validation-title').textContent()).trim());await checkStacks('pilot-'+code);languages.push(code);}
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'JSON raporu',exact:true}).click();const reportDownload=await download;const file=await reportDownload.path();const report=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(report.records.length,2);assert.equal(report.clinical_validation_verified,false);assert.equal(report.regulatory_approval_verified,false);assert.equal(report.records.find(r=>r.id===runs[1].id).supersedes,runs[0].id);
 if(screenshotDir){await fs.mkdir(screenshotDir,{recursive:true});await page.locator('.validation-center').screenshot({path:path.join(screenshotDir,'RC33_validation_desktop.png')});}
 await page.setViewportSize({width:390,height:844});await checkStacks('pilot-mobile');assert.ok(await page.locator('.validation-center').evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));if(screenshotDir)await page.locator('.validation-center').screenshot({path:path.join(screenshotDir,'RC33_validation_mobile.png')});
 await page.setViewportSize({width:1600,height:1100});
 for(const route of ['/operations','/settings','/clinic','/cases','/patients','/appointments','/scans','/team','/messages','/finance','/logistics','/pilot-check','/ops-health']){await goto(route);await checkStacks(route);}
 await goto('/operations');assert.equal(await page.locator('.module-quick-link').count(),4);await checkStacks('/operations-links');
 if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,'RC33_operations.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});for(const route of ['/operations','/settings','/clinic','/pilot-check']){await goto(route);await checkStacks(route+'-mobile');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' has horizontal overflow');}
 await page.setViewportSize({width:1600,height:1100});orgType='laboratory';await goto('/lab');await checkStacks('/lab');
 role='assistant';await goto('/pilot-flow');await page.locator('.validation-center').waitFor();assert.equal(await page.locator('.validation-save').count(),0);assert.equal(writes.length,2);
 role='owner';missingSchema=true;await goto('/pilot-flow');await page.locator('.validation-center [role=alert]').waitFor();assert.ok(await page.locator('.validation-save').isDisabled());assert.equal(await page.locator('.validation-center a[download]').getAttribute('href'),'/setup/DentAYA_RC33_Dogrulama.sql');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'pass',languages,pages,layout,records:2,correctionHistory:true,versionIsolation:true,rawDraftsPreserved:true,readOnlyRole:true,missingSchemaHandled:true,mockBackend:true,clinicalApprovalNotInferred:true},null,2));
} catch(error){console.error(logs);throw error;} finally {await browser?.close();server?.kill('SIGTERM');}
