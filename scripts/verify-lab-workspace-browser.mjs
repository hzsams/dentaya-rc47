import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base='http://127.0.0.1:3071';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,userId=id(1),orgId=id(2),nextUserId=id(10),nextOrgId=id(11);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),stamp=new Date().toISOString();
const statuses=['new','accepted','design','approval','production','qc','ready','shipped','delivered','cancelled'];
const cases=Array.from({length:97},(_,i)=>({id:id(100+i),lab_org_id:i<90?orgId:id(999),clinic_org_id:id(3),case_number:'LAB-CASE-'+String(i).padStart(3,'0'),title:'Sentetik laboratuvar işi '+i,patient_reference:'SYNTHETIC-'+i,status:statuses[i%10],priority:i%7===0?'urgent':i%4===0?'high':'normal',due_date:i%4===0?'2026-01-01':i%4===1?today:i%4===2?'2099-01-01':null,updated_at:stamp,case_type:'crown',tooth_codes:['46'],material:'Zirkonya',shade:'A2'}));
const own=cases.filter(c=>c.lab_org_id===orgId),active=own.filter(c=>!['delivered','cancelled'].includes(c.status)),errors=[],writes=[];
let server,browser,serverExit=null,logs='',role='owner',kind='laboratory',failCases=false,failDesign=false,holdCases=false,holdMemberships=false,signedInUserId=userId,authLogouts=0,authSignins=0;
const heldCases=[],heldMemberships=[];
function fixtureUser(id){return {id,email:id===userId?'lab-fixture@example.invalid':'next-lab-fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:stamp};}
function fixtureSession(id){const exp=Math.floor(Date.now()/1000)+86400,payload=Buffer.from(JSON.stringify({sub:id,exp,aud:'authenticated',role:'authenticated'})).toString('base64url');return {access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`,refresh_token:'synthetic-'+id,token_type:'bearer',expires_in:86400,expires_at:exp,user:fixtureUser(id)};}
function releaseHeld(held){for(const resolve of held.splice(0))resolve();}
async function fixture(context){
 await context.route(/\/(?:auth|rest)\/v1\//,async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1),method=req.method(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range','content-type':'application/json'};
  if(method==='OPTIONS'){await route.fulfill({status:200,headers,body:'{}'});return;}
  let rows=[];
  if(url.pathname.startsWith('/auth/')){
   if(table==='logout'){authLogouts++;await route.fulfill({status:204,headers});return;}
   if(table==='token'){signedInUserId=req.postDataJSON()?.email==='next-lab-fixture@example.invalid'?nextUserId:userId;authSignins++;rows=fixtureSession(signedInUserId);}
   else rows={user:fixtureUser(signedInUserId)};
  }
  else{
   if(!['GET','HEAD'].includes(method))writes.push({table,method});
   if(table==='cases'){
    if(failCases||(failDesign&&method==='GET'&&url.searchParams.getAll('status').includes('eq.design'))){await route.fulfill({status:503,headers,body:JSON.stringify({message:'Synthetic offline failure'})});return;}
    if(holdCases&&method==='GET')await new Promise(resolve=>heldCases.push(resolve));
    rows=[...cases];
   }else if(table==='memberships'){if(holdMemberships)await new Promise(resolve=>heldMemberships.push(resolve));rows=[{id:id(4),organization_id:orgId,user_id:userId,role,status:'active'},{id:id(12),organization_id:nextOrgId,user_id:nextUserId,role:'owner',status:'active'}];}
   else if(table==='organizations')rows=[{id:orgId,name:'Sentetik Lab Çalışma Alanı',org_type:kind,demo_mode:false,country:'TR'},{id:nextOrgId,name:'İkinci Kullanıcı Laboratuvarı',org_type:'laboratory',demo_mode:false,country:'TR'}];
   else if(table==='profiles')rows=[{id:userId,full_name:'Lab Test',email:'lab-fixture@example.invalid'},{id:nextUserId,full_name:'İkinci Kullanıcı',email:'next-lab-fixture@example.invalid'}];
   else if(table==='user_preferences')rows=[{theme:'midnight',motion_level:'reduced',compact_mode:false,surface_style:'soft',font_scale:'normal'}];
   else if(table==='user_onboarding')rows=[{user_id:userId,organization_id:orgId,completed:true,dismissed:true,current_step:1}];
   if(Array.isArray(rows)){
    for(const [key,value] of url.searchParams){
     if(['select','order','offset','limit'].includes(key))continue;
     if(value.startsWith('eq.'))rows=rows.filter(r=>r[key]===value.slice(3));
     else if(value.startsWith('neq.'))rows=rows.filter(r=>r[key]!==value.slice(4));
     else if(value.startsWith('not.in.')){const values=value.slice(8,-1).split(',');rows=rows.filter(r=>!values.includes(r[key]));}
     else if(value.startsWith('in.')){const values=value.slice(4,-1).split(',');rows=rows.filter(r=>values.includes(r[key]));}
     else if(value.startsWith('lt.'))rows=rows.filter(r=>r[key]!==null&&r[key]<value.slice(3));
    }
    const total=rows.length,orders=(url.searchParams.get('order')??'').split(',').filter(Boolean).map(s=>s.split('.'));
    rows.sort((a,b)=>{for(const [key,dir,nulls] of orders){if(a[key]===b[key])continue;if(a[key]==null)return nulls==='nullsfirst'?-1:1;if(b[key]==null)return nulls==='nullsfirst'?1:-1;return String(a[key]).localeCompare(String(b[key]))*(dir==='desc'?-1:1);}return 0;});
    const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??rows.length);rows=rows.slice(offset,offset+limit);headers['content-range']=rows.length?`${offset}-${offset+rows.length-1}/${total}`:`*/${total}`;
   }
  }
  if(req.headers().accept?.includes('application/vnd.pgrst.object+json'))rows=Array.isArray(rows)?rows[0]??null:rows;
  await route.fulfill({status:200,headers,body:method==='HEAD'?'':JSON.stringify(rows)});
 });
 await context.addInitScript(({userId,stamp})=>{
  const exp=Math.floor(Date.now()/1000)+86400,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
  if(!localStorage.getItem('dentaya:lab-fixture-seeded')){localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`,refresh_token:'synthetic',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'lab-fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:stamp}}));localStorage.setItem('dentaya:lab-fixture-seeded','1');}
  localStorage.setItem('dentaya:locale:v1','tr');localStorage.setItem('dentaya:preferences',JSON.stringify({theme:'midnight',motion_level:'reduced',compact_mode:false,surface_style:'soft',font_scale:'normal'}));localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
 },{userId,stamp});
}
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3071'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'lab-workspace-test-placeholder'},stdio:['ignore','pipe','pipe']});for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-20000);});server.on('exit',code=>{serverExit=code;});
 const deadline=Date.now()+65000;while(Date.now()<deadline){if(serverExit!==null)throw Error(logs);try{if((await fetch(base+'/workspace')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Europe/Istanbul'});await fixture(context);const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 async function shot(name){if(!process.env.DENTAYA_SCREENSHOT_DIR)return;await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,name),animations:'disabled',style:'nextjs-portal{visibility:hidden!important}'});}
 async function idle(){await page.waitForFunction(()=>document.querySelector('main[aria-busy]')?.getAttribute('aria-busy')==='false');}
 await page.goto(base+'/workspace');await page.locator('.desktop-lab-manager').waitFor();await idle();
 const manager=page.getByRole('complementary',{name:'Lab Yöneticisi',exact:true});assert.equal(await manager.count(),1);
 assert.equal(Number(await manager.getByRole('button',{name:/Açık işler/}).locator('b').textContent()),active.length,'Home lab counts cover the organization beyond previews');
 const positions=await page.evaluate(()=>{const a=document.querySelector('.desktop-lab-manager').getBoundingClientRect(),b=document.querySelector('.desktop-home-records').getBoundingClientRect();return {left:a.right,records:b.left,width:document.documentElement.scrollWidth,viewport:innerWidth};});assert.ok(positions.left<=positions.records);assert.ok(positions.width<=positions.viewport+1);
 await manager.getByRole('button',{name:/Onay bekleyen/}).click();const homeStates=await page.locator('.desktop-home-table tbody tr .desktop-home-status').allTextContents();assert.ok(homeStates.length&&homeStates.every(s=>s==='Onay'));
 assert.equal(await manager.locator('a[href="/team"]').count(),1);await shot('RC56_Home_Lab_Manager.png');
 await manager.locator('a[href="/lab"]').click();await page.waitForURL('**/lab');await page.locator('.lab-queue-table tbody tr').first().waitFor();await idle();
 const queue=page.locator('.lab-queue-records'),filters=queue.getByRole('group',{name:'Kuyruk görünümü',exact:true});assert.equal(await queue.locator('tbody tr').count(),40);assert.match(await page.locator('.lab-queue-pagination').textContent(),new RegExp('Toplam kayıt: '+active.length));
 const firstIds=await queue.locator('[data-lab-case]').evaluateAll(nodes=>nodes.map(n=>n.dataset.labCase));await page.getByRole('button',{name:'Sonraki sayfa',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lab-queue-pagination')?.textContent?.includes('Sayfa 2'));await idle();const secondIds=await queue.locator('[data-lab-case]').evaluateAll(nodes=>nodes.map(n=>n.dataset.labCase));assert.ok(secondIds.length&&secondIds.every(id=>!firstIds.includes(id)));
 failDesign=true;await filters.getByRole('button',{name:/^Tasarım/}).click();const queueError=page.getByRole('alert').filter({hasText:'Laboratuvar kuyruğu güncellenemedi'});await queueError.waitFor();await idle();assert.deepEqual(await queue.locator('[data-lab-case]').evaluateAll(nodes=>nodes.map(n=>n.dataset.labCase)),secondIds,'A failed filter transition keeps the displayed page');
 await page.getByRole('button',{name:'Önceki sayfa',exact:true}).click();await queueError.waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('.lab-queue-pagination')?.textContent?.includes('Sayfa 1'));await idle();assert.deepEqual(await queue.locator('[data-lab-case]').evaluateAll(nodes=>nodes.map(n=>n.dataset.labCase)),firstIds,'Pagination after a failed filter transition stays in the displayed queue');
 await filters.getByRole('button',{name:/^Tasarım/}).click();await queueError.waitFor();await idle();failDesign=false;
 await filters.getByRole('button',{name:/^Tasarım/}).click();await page.waitForFunction(()=>document.querySelector('.lab-queue-records [aria-pressed=true]')?.textContent?.startsWith('Tasarım'));await idle();assert.ok((await queue.locator('tbody .desktop-home-status').allTextContents()).every(s=>s==='Tasarım'));assert.ok(await queue.locator('a[href^="/design?case="]').count()>0);
 const search=page.getByRole('searchbox',{name:'Bu sayfada vaka ara',exact:true});await search.fill('impossible synthetic search');await queue.getByRole('status').waitFor();assert.equal(await queue.locator('tbody tr').count(),0);await search.fill('');await queue.locator('tbody tr').first().waitFor();
 const before=await queue.locator('[data-lab-case]').evaluateAll(nodes=>nodes.map(n=>n.dataset.labCase));failCases=true;await page.getByRole('button',{name:'Yenile',exact:true}).click();await page.getByRole('alert').filter({hasText:'Laboratuvar kuyruğu güncellenemedi'}).waitFor();assert.deepEqual(await queue.locator('[data-lab-case]').evaluateAll(nodes=>nodes.map(n=>n.dataset.labCase)),before,'A failed refresh preserves the prior successful queue');failCases=false;await page.getByRole('button',{name:'Tekrar dene',exact:true}).click();await page.getByRole('alert').filter({hasText:'Laboratuvar kuyruğu güncellenemedi'}).waitFor({state:'hidden'});await idle();
 await shot('RC56_Lab_Work_Queue.png');
 role='technician';await page.reload();await queue.locator('tbody tr').first().waitFor();await idle();assert.equal(await page.locator('.desktop-lab-manager a[href="/team"]').count(),0,'Team management remains restricted to owner/admin');
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.desktop-lab-manager-toggle')?.getAttribute('aria-expanded')==='false');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await manager.getByRole('button',{name:'Lab Yöneticisi',exact:false}).click();assert.equal(await manager.locator('.desktop-lab-manager-body').isVisible(),true);await shot('RC56_Lab_Work_Queue_Mobile.png');
 kind='clinic';await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/workspace');await page.locator('.desktop-home-records').waitFor();await idle();assert.equal(await page.locator('.desktop-lab-manager').count(),0,'Clinic workspace does not inherit laboratory controls');
 // Use the real account UI and Supabase cross-tab auth notifications. No auth callback is invoked by the fixture.
 kind='laboratory';role='owner';await page.goto(base+'/lab');await queue.locator('tbody tr').first().waitFor();await idle();
 const actor=await context.newPage();actor.setDefaultTimeout(30000);actor.on('pageerror',error=>errors.push(error.message));await actor.goto(base+'/workspace');await actor.locator('.desktop-lab-manager').waitFor();
 async function signOut(target){await target.locator('.desktop-home-account-menu > summary').click();await target.getByRole('button',{name:'Çıkış yap',exact:true}).click();await target.getByRole('button',{name:'Giriş Yap',exact:true}).waitFor();}
 async function signIn(target,email){await target.getByLabel('E-posta',{exact:true}).fill(email);await target.getByLabel('Şifre',{exact:true}).fill('synthetic-password');await target.getByRole('button',{name:'Giriş Yap',exact:true}).click();}
 holdCases=true;await page.getByRole('button',{name:'Yenile',exact:true}).click();await page.waitForFunction(()=>document.querySelector('main[aria-busy]')?.getAttribute('aria-busy')==='true');const casesDeadline=Date.now()+10000;while(!heldCases.length&&Date.now()<casesDeadline)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(heldCases.length,'The queue read is held before sign-out');
 await signOut(actor);await page.waitForURL('**/workspace');await page.getByRole('button',{name:'Giriş Yap',exact:true}).waitFor();assert.equal(await page.locator('[data-lab-case],.desktop-lab-manager').count(),0,'Cross-tab sign-out immediately removes the old lab snapshot');holdCases=false;releaseHeld(heldCases);await page.waitForTimeout(200);assert.equal(await page.locator('.desktop-lab-manager').count(),0,'A late queue response cannot restore a signed-out organization');
 await signIn(actor,'lab-fixture@example.invalid');await actor.locator('.desktop-lab-manager').waitFor();
 holdMemberships=true;const staleHome=await context.newPage();staleHome.setDefaultTimeout(30000);staleHome.on('pageerror',error=>errors.push(error.message));await staleHome.goto(base+'/workspace');const holdDeadline=Date.now()+10000;while(!heldMemberships.length&&Date.now()<holdDeadline)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(heldMemberships.length,'A prior user membership read is deliberately held');
 await signOut(actor);await staleHome.getByRole('button',{name:'Giriş Yap',exact:true}).waitFor();holdMemberships=false;await signIn(actor,'next-lab-fixture@example.invalid');
 for(const target of [actor,page,staleHome])await target.locator('.desktop-home-heading').filter({hasText:'İkinci Kullanıcı Laboratuvarı'}).waitFor();releaseHeld(heldMemberships);await page.waitForTimeout(200);
 for(const target of [actor,page,staleHome]){assert.equal(await target.getByText('Sentetik Lab Çalışma Alanı',{exact:true}).count(),0,'A delayed membership response cannot restore the previous user organization');assert.equal(await target.locator('.desktop-home-table tbody tr').count(),0,'The new user never inherits patient references');}
 assert.ok(authLogouts>=2&&authSignins>=2,'Auth regression uses actual public sign-out/sign-in requests');await staleHome.close();await actor.close();
 assert.deepEqual(writes.filter(w=>['cases','design_projects','shipments'].includes(w.table)),[],'Navigating and filtering never writes case/CAD/delivery records');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,realRoutes:['/workspace','/lab'],leftLabManager:true,exactCounts:true,queueFilters:true,paginationBeyondPreview:true,contextualCadLink:true,currentPageSearch:true,failedRefreshRetainsRecords:true,failedFilterCanRetry:true,paginationUsesDisplayedQueue:true,crossTabSignoutClearsLab:true,lateMembershipCannotRestorePriorUser:true,authRequests:{signIns:authSignins,signOuts:authLogouts},roleGatedTeam:true,mobileCollapsedAndFits:true,clinicUnaffected:true,noCaseWrites:true,backend:'intercepted synthetic fixture; no production data'},null,2));
}catch(error){console.error(logs);throw error;}finally{releaseHeld(heldCases);releaseHeld(heldMemberships);await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{server.kill('SIGKILL');resolve();},5000);server.once('exit',()=>{clearTimeout(timer);resolve();});});}}
