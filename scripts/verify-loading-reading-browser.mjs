import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const url='http://127.0.0.1:3052',userId='11111111-1111-4111-8111-111111111111';
let server,browser,logs='';const errors=[],timings=[];
try{
 const standalone=path.join(project,'.next/standalone');
 for(const [source,destination] of [[path.join(project,'public'),path.join(standalone,'public')],[path.join(project,'.next/static'),path.join(standalone,'.next/static')]]){
  await fs.mkdir(path.dirname(destination),{recursive:true});try{await fs.symlink(source,destination,'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
 }
 server=spawn(process.execPath,['server.js'],{cwd:standalone,env:{...process.env,HOSTNAME:'127.0.0.1',PORT:'3052',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-16000);});
 const startupDeadline=Date.now()+30_000;
 while(Date.now()<startupDeadline){try{if((await fetch(url+'/cad-library')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function page({auth=false,mobile=false}={}){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(12_000);p.on('pageerror',e=>errors.push(e.message));
  // Deliberately use real wall time. Advancing a fake clock cannot prove that the
  // user actually returns to their module after the five-second budget.
  if(auth)await p.addInitScript(({userId})=>{
   const exp=Math.floor(Date.now()/1000)-60,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
   localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`,refresh_token:'fixture',token_type:'bearer',expires_in:3600,expires_at:exp,user:{id:userId,email:'reading@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  },{userId});
  return p;
 }
 async function gated(){
  const p=await page({auth:true});let resolve,released=false,waiting=false;const gate=new Promise(r=>{resolve=r;});
  const release=()=>{released=true;resolve();};
  await p.route('http://127.0.0.1:54321/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;let data=[];
   if(pathname.includes('/auth/')){
    waiting=true;await gate;const exp=Math.floor(Date.now()/1000)+86400;
    data={access_token:`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'})).toString('base64')}.fixture`,refresh_token:'fixture',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'reading@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}};
   }
   await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
  });
  await p.goto(url+'/cad-library');await p.locator('.cad-library-page [data-dental-fact]:not([data-dental-fact=""])').waitFor();assert.ok(waiting,'A real authentication request is held');
  return {p,release,isReleased:()=>released};
 }
 async function deadlineOf(locator){const until=Number(await locator.getAttribute('data-loading-deadline'));assert.ok(until>Date.now(),'A new loader has a future deadline');assert.ok(until-Date.now()<=5_000,'The total budget cannot exceed five seconds');return until;}
 async function assertEndedOnTime(p,until,label){
  const endedAt=await p.evaluate(()=>Date.now()),elapsed=endedAt-(until-5_000);timings.push({scenario:label,elapsedMs:elapsed});
  assert.ok(elapsed>=4_900,`${label}: automatic transition cannot fire early (${elapsed}ms)`);
  assert.ok(elapsed<=6_200,`${label}: transition must follow the five-second deadline without another stage delay (${elapsed}ms)`);
 }
 const fast=await page({mobile:true});await fast.goto(url+'/cad-library');const reading=fast.locator('[data-loading-reading]');await reading.waitFor();const until=await deadlineOf(reading),fact=await reading.locator('.dental-facts').getAttribute('data-dental-fact');assert.ok(fact);
 assert.equal(await fast.locator('.cad-library-page a[href="/workspace"]').count(),1,'The requested module is already ready underneath');
 assert.equal(await reading.locator('.dy-loading-line').count(),0,'A finished request must not show an active spinner');
 const bounds=await reading.getByRole('button',{name:'Çalışmaya geç',exact:false}).boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844);
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await fast.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC48_Reading_Mobile.png')});}
 await reading.getByRole('button',{name:'Mini oyunları aç',exact:true}).click({force:true});await fast.getByRole('dialog',{name:'Mini oyunlar',exact:true}).waitFor();
 assert.equal(await reading.locator('.dental-facts').getAttribute('data-dental-fact'),fact);
 await reading.waitFor({state:'detached',timeout:7_000});await assertEndedOnTime(fast,until,'fast');
 assert.equal(await fast.getByRole('dialog',{name:'Mini oyunlar',exact:true}).count(),1,'The game remains open after the interlude ends');await fast.locator('.dental-break-sheet .kusp-cusp').first().focus();await fast.keyboard.press('Escape');assert.equal(await fast.locator('.dental-break-sheet').count(),0);await fast.context().close();
 const short=await gated(),sourceFact=await short.p.locator('.cad-library-page .dental-facts').getAttribute('data-dental-fact');await short.p.waitForTimeout(750);short.release();await short.p.locator('[data-loading-reading]').waitFor();assert.equal(await short.p.locator('[data-loading-reading] .dental-facts').getAttribute('data-dental-fact'),sourceFact,'Keep the sentence after the data becomes ready');
 await short.p.getByRole('button',{name:'Çalışmaya geç',exact:false}).click({force:true});assert.equal(await short.p.locator('[data-loading-reading]').count(),0);assert.equal(await short.p.evaluate(()=>document.activeElement?.id),'main-content');await short.p.context().close();
 const slow=await gated(),slowUntil=await deadlineOf(slow.p.locator('.cad-library-page .dy-loading-surface'));
 assert.equal(await slow.p.locator('.dy-loading-line').evaluate(e=>getComputedStyle(e,'::after').animationName),'none','Reduced motion does not animate the loading line');
 await slow.p.locator('[data-loading-pending]').waitFor({timeout:7_000});await assertEndedOnTime(slow.p,slowUntil,'slow');assert.equal(slow.isReleased(),false,'The deadline does not abort or fabricate the pending request');assert.equal(await slow.p.locator('.dy-loading-surface,[data-loading-reading]').count(),0,'The full branded experience ends even if real data is slow');
 await slow.p.waitForTimeout(600);slow.release();await slow.p.locator('.cad-form-library').waitFor();assert.equal(await slow.p.locator('[data-loading-pending],[data-loading-reading]').count(),0,'Completing a slow request cannot add another reading delay');await slow.p.context().close();
 const chain=await gated(),chainSurface=chain.p.locator('.cad-library-page .dy-loading-surface'),chainUntil=await deadlineOf(chainSurface),chainSession=await chainSurface.getAttribute('data-loading-session');
 await chain.p.waitForTimeout(750);await chain.p.locator('.cad-library-page header a[href="/lab"]').click({force:true});await chain.p.waitForURL('**/lab');
 const nextStage=chain.p.locator('.dy-loading-surface');await nextStage.waitFor();assert.equal(await nextStage.getAttribute('data-loading-deadline'),String(chainUntil),'Consecutive page loaders cannot restart the clock');assert.equal(await nextStage.getAttribute('data-loading-session'),chainSession);
 await chain.p.locator('[data-loading-pending]').waitFor({timeout:7_000});await assertEndedOnTime(chain.p,chainUntil,'consecutive');chain.release();await chain.p.locator('[data-loading-pending]').waitFor({state:'detached'});assert.equal(await chain.p.locator('[data-loading-reading]').count(),0);await chain.p.context().close();
 const cancelled=await gated(),cancelledSurface=cancelled.p.locator('.cad-library-page .dy-loading-surface'),cancelledUntil=await deadlineOf(cancelledSurface),cancelledSession=await cancelledSurface.getAttribute('data-loading-session');await cancelled.p.locator('.cad-library-page header a[href="/lab"]').click({force:true});await cancelled.p.waitForURL('**/lab');await cancelled.p.locator('.module-nav-foot a[href="/ai"]').click();await cancelled.p.waitForURL('**/ai');const cancelledResponse=cancelled.p.waitForResponse(response=>new URL(response.url()).pathname.startsWith('/auth/'));cancelled.release();await cancelledResponse;
 await cancelled.p.locator('#aya-local-message').waitFor();await cancelled.p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await cancelled.p.waitForTimeout(150);const navigationReading=cancelled.p.locator('[data-loading-reading]');if(await navigationReading.count()){assert.equal(await navigationReading.getAttribute('data-loading-deadline'),String(cancelledUntil),'The new route fallback must share the original deadline');assert.equal(await navigationReading.getAttribute('data-loading-session'),cancelledSession,'Navigation and late work cannot create a new reading window');await navigationReading.waitFor({state:'detached',timeout:6200});await assertEndedOnTime(cancelled.p,cancelledUntil,'navigation');}assert.equal(await cancelled.p.locator('[data-loading-reading]').count(),0,'No stale reading window remains after navigation');assert.equal(await cancelled.p.locator('#aya-local-message').isDisabled(),false);if(process.env.DENTAYA_SCREENSHOT_DIR)await cancelled.p.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC48_AYA_Production.png'),animations:'disabled'});await cancelled.p.context().close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,productionStandalone:true,readingSeconds:5,timing:'real wall clock; 1200ms scheduling tolerance',timings,sameSentence:true,automaticCloseAtFiveSeconds:true,readyPageInBackground:true,earlyContinue:true,focusRestored:true,pendingDataGuardPreserved:true,consecutiveLoadersShareDeadline:true,noExtraDelayAfterLongLoad:true,navigationFallbackSharesDeadline:true,cancelledNavigationLeavesNoOverlay:true,reducedMotion:true,gameSurvivesReading:true,mobileBounds:true,pageErrors:0,backend:'intercepted test fixture, no production data'},null,2));
}catch(e){console.error(logs);console.error('Completed timing measurements',JSON.stringify(timings));if(process.env.DENTAYA_SCREENSHOT_DIR&&browser){const pages=browser.contexts().flatMap(context=>context.pages());for(const [index,p] of pages.entries()){console.error('Loading page failure',p.url());await p.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'loading-failure-'+index+'.png')}).catch(()=>{});}}throw e;}finally{await browser?.close();server?.kill('SIGTERM');}
