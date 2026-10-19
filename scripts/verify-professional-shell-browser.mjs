import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(project,'src/app/professional-shell-preview'),marker='Professional shell browser verification fixture';
const base='http://127.0.0.1:3055';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222',patientId='33333333-3333-4333-8333-333333333333';
const errors=[],mutations=[];
let server,browser,logs='',exitCode=null,createdRoute=false;
try{
 // Refuse to replace a user route. Test-only routes are removed even on failure.
 try{const previous=await fs.readFile(path.join(route,'layout.tsx'),'utf8');if(!previous.includes(marker))throw Error('A user route already exists at /professional-shell-preview');await fs.rm(route,{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(path.join(route,'next'),{recursive:true});createdRoute=true;
 await fs.writeFile(path.join(route,'layout.tsx'),`// ${marker}\nimport ProfessionalShellFixture from '../../../scripts/fixtures/professional-shell';\nimport type {ReactNode} from 'react';\nexport default function Layout({children}:{children:ReactNode}){return <ProfessionalShellFixture>{children}</ProfessionalShellFixture>;}\n`);
 await fs.writeFile(path.join(route,'page.tsx'),`// ${marker}\nexport default function Page(){return <p data-fixture-route="first">First route</p>;}\n`);
 await fs.writeFile(path.join(route,'next/page.tsx'),`// ${marker}\nexport default function Page(){return <p data-fixture-route="next">Next route</p>;}\n`);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3055'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'professional-shell-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-20000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+65_000;
 while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(base+'/professional-shell-preview')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(20_000);
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/hydration|Maximum update depth|unique "key"|useEffect must not return|destroy is not a function/i.test(message.text()))errors.push(message.text());});
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1);
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'};
  if(request.method()==='OPTIONS'){await route.fulfill({status:200,headers,body:'{}'});return;}
  if(!['GET','HEAD'].includes(request.method())&&!url.pathname.startsWith('/auth/'))mutations.push({table,method:request.method()});
  const user={id:userId,email:'shell@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  let body=[];
  if(url.pathname.startsWith('/auth/'))body={user};
  else if(table==='memberships')body=[{id:'shell-membership',organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
  else if(table==='organizations')body=[{id:orgId,name:'Sentetik Shell Kliniği',org_type:'clinic',demo_mode:false,country:'TR'}];
  else if(table==='profiles')body=[{id:userId,full_name:'Shell Test',email:user.email,phone:''}];
  else if(table==='user_preferences')body=[{theme:'midnight',motion_level:'none',compact_mode:false,surface_style:'soft',font_scale:'normal'}];
  else if(table==='patients')body=[{id:patientId,external_ref:'SHELL-ONLY',first_name:'Sentetik',last_name:'Hasta',date_of_birth:null,sex:null,phone:null,email:null,blood_group:null,allergy_notes:null,medical_notes:null,dental_notes:null,consent_status:'pending',demo_mode:false,created_at:'2026-01-01T00:00:00Z'}];
  if(request.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
  await route.fulfill({status:200,headers,body:JSON.stringify(body)});
 });
 await page.addInitScript(({userId})=>{
  const exp=Math.floor(Date.now()/1000)+86400,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'shell@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  localStorage.setItem('dentaya:workspace-chrome-v1',JSON.stringify({compact:true,navigation:true,reducedMotion:true}));
  localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
 },{userId});
 const trigger=()=>page.locator('[data-dentaya-launcher="true"]'),dialog=()=>page.getByRole('dialog',{name:'DentAYA hızlı navigasyon',exact:true});
 const waitOwner=async owner=>{await page.locator(`[data-launcher-instance="${owner}"] [data-dentaya-launcher="true"]`).waitFor();assert.equal(await trigger().count(),1,'Exactly one live owner may expose navigation');};
 const open=async()=>{await trigger().click();await dialog().waitFor();assert.equal(await dialog().evaluate(node=>node.matches(':modal')),true,'Navigation uses the browser modal layer');await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='combobox');return dialog().getByRole('combobox');};
 await page.goto(base+'/professional-shell-preview');await page.waitForFunction(()=>Boolean(window.professionalShellFixture));await waitOwner('primary');
 await page.locator('#shell-outside-focus').focus();await page.keyboard.press('Control+k');await dialog().waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='combobox');
 await page.keyboard.press('Shift+Tab');assert.equal(await dialog().evaluate(node=>node.contains(document.activeElement)),true,'Native modal focus stays inside navigation');await page.keyboard.press('Escape');await dialog().waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement?.id),'shell-outside-focus','Escape restores the element that launched the modal');
 await open();await page.evaluate(()=>window.professionalShellFixture.removePrimary());await waitOwner('secondary');assert.equal(await page.locator('.workspace-launcher-dialog[open]').count(),0,'Unmounting an open owner cannot leave its modal behind');
 await page.evaluate(()=>window.professionalShellFixture.mountThird());await waitOwner('secondary');assert.equal(await page.locator('[data-launcher-instance="third"] [data-dentaya-launcher]').count(),0,'A new mount cannot steal ownership from an existing owner');
 await page.evaluate(()=>window.professionalShellFixture.removeSecondary());await waitOwner('third');
 await open();const persistentTrigger=await trigger().elementHandle();await page.evaluate(()=>window.professionalShellFixture.navigateNext());await page.waitForURL('**/professional-shell-preview/next');await page.locator('[data-fixture-route="next"]').waitFor();await dialog().waitFor({state:'hidden'});assert.equal(await persistentTrigger.evaluate(node=>node.isConnected),true,'The same owner survives a route change in its layout');assert.equal(await persistentTrigger.evaluate(node=>node===document.activeElement),true,'Closing on a path change restores focus to the surviving trigger');assert.equal(await page.locator('.workspace-launcher-dialog[open]').count(),0,'A pathname change closes an existing palette');
 const input=await open(),options=dialog().getByRole('option');assert.ok(await options.count()>8);
 const selected=()=>dialog().locator('[role="option"][aria-selected="true"]');
 const firstId=await selected().getAttribute('id');await input.press('ArrowUp');assert.equal(await selected().getAttribute('id'),await options.last().getAttribute('id'),'ArrowUp wraps to the last result');await input.press('ArrowDown');assert.equal(await selected().getAttribute('id'),firstId,'ArrowDown wraps to the first result');await input.press('ArrowDown');assert.match(await selected().textContent(),/Hastalar/);assert.equal(await input.getAttribute('aria-activedescendant'),await selected().getAttribute('id'),'Assistive technology follows the selected result');await input.press('Enter');await page.waitForURL('**/patients');
 async function moduleReady(name){await page.locator('.module-content h1').filter({hasText:name}).waitFor();await trigger().waitFor();const continueButton=page.getByRole('button',{name:'Çalışmaya geç',exact:false});if(await continueButton.count())await continueButton.click({force:true});assert.equal(await page.locator('h1').count(),1,`${name} has one page title`);assert.equal(await page.locator('.module-header h1').count(),0,'The shell does not duplicate a module title');assert.equal(await trigger().count(),1);}
 await moduleReady('Hastalar');assert.match(await page.locator('.patient-card').textContent(),/Sentetik\s+Hasta/);assert.equal(await page.locator('.workspace-launcher-dialog[open]').count(),0,'Opening a result dismisses navigation');
 const card=page.locator('.module-workcard');assert.equal(await card.getAttribute('open'),null,'Personal checklists start collapsed');assert.equal(await card.evaluate(node=>node.parentElement.lastElementChild===node),true,'The actual module comes before its personal checklist');
 const system=page.locator('.module-system-tools');assert.equal(await system.getAttribute('open'),null,'System and pilot navigation is collapsed in daily work');await page.locator('.module-navigation input[type="search"]').fill('Kontrol');assert.notEqual(await system.getAttribute('open'),null,'Searching reveals matching system tools');await page.locator('.module-navigation input[type="search"]').fill('');assert.equal(await system.getAttribute('open'),null);
 await card.locator('summary').click();await card.locator('input[type="checkbox"]').first().check();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:workcard:patients'))),[0]);assert.equal(mutations.length,0,'A personal checklist does not change case or team records');
 await page.locator('.module-navigation a[href="/appointments"]').click();await page.waitForURL('**/appointments');await moduleReady('Randevular');assert.equal(await page.locator('.module-workcard input:checked').count(),0,'Personal checklists are scoped to their module');assert.equal(await page.locator('.planner-week>button').count(),7,'The real appointment planner is available');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'The module shell fits a small screen');assert.equal(await page.locator('.module-body').evaluate(node=>node.getBoundingClientRect().right<=innerWidth+1),true,'Module content remains inside the viewport');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'DentAYA_Professional_shell_mobile.png'),animations:'disabled'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,launcherSingleOwner:true,unmountedOwnerTakeover:true,newMountDoesNotStealOwner:true,nativeModal:true,keyboardWrapAndEnter:true,activeDescendant:true,escapeRestoresFocus:true,routeClosesPersistentPalette:true,realModules:['patients','appointments'],oneH1PerModule:true,moduleBeforePersonalChecklist:true,systemToolsCollapsedAndSearchable:true,personalChecklistScopedAndLocal:true,sevenDayPlanner:true,mobileFits:true,backend:'intercepted synthetic fixture; no production data',pageErrors:0},null,2));
}catch(error){console.error(logs);throw error;}finally{
 await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}
 if(createdRoute)await fs.rm(route,{recursive:true,force:true});
 // Dev-generated validators reference the temporary route removed above.
 if(createdRoute)await fs.rm(path.join(project,'.next/dev/types'),{recursive:true,force:true});
}
