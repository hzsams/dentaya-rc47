import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const url=process.env.DENTAYA_LOADING_BASE_URL||'http://127.0.0.1:3052',userId='11111111-1111-4111-8111-111111111111';
let server,browser,logs='';const errors=[],timings=[];
try{
 if(!process.env.DENTAYA_LOADING_BASE_URL){
  const standalone=path.join(project,'.next/standalone');
  for(const [source,destination] of [[path.join(project,'public'),path.join(standalone,'public')],[path.join(project,'.next/static'),path.join(standalone,'.next/static')]]){
   await fs.mkdir(path.dirname(destination),{recursive:true});try{await fs.symlink(source,destination,'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  server=spawn(process.execPath,['server.js'],{cwd:standalone,env:{...process.env,HOSTNAME:'127.0.0.1',PORT:new URL(url).port,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-16000);});
 }
 const startupDeadline=Date.now()+30_000;let serverReady=false;
 while(Date.now()<startupDeadline){try{if((await fetch(url+'/cad-library')).ok){serverReady=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal(serverReady,true,'Production standalone server starts');
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function page({auth=false,mobile=false,locale='tr'}={}){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(12_000);p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(({userId,auth,locale})=>{
   localStorage.setItem('dentaya:locale:v1',locale);localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));
   if(auth){
    const exp=Math.floor(Date.now()/1000)-60,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
    localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`,refresh_token:'fixture',token_type:'bearer',expires_in:3600,expires_at:exp,user:{id:userId,email:'loading@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
   }
  },{userId,auth,locale});
  return p;
 }
 async function gated({routePath='/cad-library',failMembership=false,mobile=false}={}){
  const p=await page({auth:true,mobile});let resolve,released=false;const gate=new Promise(r=>{resolve=r;});
  const release=()=>{released=true;resolve();};
  await p.route(/\/(?:auth|rest)\/v1\//,async route=>{
   const pathname=new URL(route.request().url()).pathname,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'};
   if(route.request().method()==='OPTIONS'){await route.fulfill({status:200,headers,body:'{}'});return;}
   let data=[];
   if(pathname.includes('/auth/')){
    await gate;const exp=Math.floor(Date.now()/1000)+86400,user={id:userId,email:'loading@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    data=pathname.endsWith('/user')?{user}:{access_token:`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'})).toString('base64')}.fixture`,refresh_token:'fixture',token_type:'bearer',expires_in:86400,expires_at:exp,user};
   }
   if(failMembership&&pathname.endsWith('/memberships')){await route.fulfill({status:503,headers,body:JSON.stringify({message:'Sentetik kurum erişimi hatası',code:'LOADING_FIXTURE'})});return;}
   await route.fulfill({status:200,headers,body:JSON.stringify(data)});
  });
  const authRequested=p.waitForRequest(request=>new URL(request.url()).pathname.includes('/auth/')&&request.method()!=='OPTIONS');
  await p.goto(url+routePath);await authRequested;
  await p.locator('[data-loading-pending] [data-dental-fact]:not([data-dental-fact=""])').first().waitFor();
  return {p,release,isReleased:()=>released};
 }
 async function noReadingOverlay(p){assert.equal(await p.locator('[data-loading-reading],.dy-loading-reading,[data-loading-deadline]').count(),0,'Readiness never creates a reading overlay, countdown or deadline');}
 async function releaseAndReady(fixture,label){
  const started=Date.now();fixture.release();await fixture.p.locator('.cad-form-library').waitFor();timings.push({scenario:label,releaseToReadyMs:Date.now()-started});
  await noReadingOverlay(fixture.p);assert.equal(await fixture.p.locator('[data-loading-pending]').count(),0,'Real completion removes the loader immediately');
 }
 // Ready content is clickable without reading, skipping, or advancing a fake clock.
 const fast=await page({mobile:true});await fast.goto(url+'/cad-library');const signIn=fast.locator('.cad-library-page a[href="/workspace"]');await signIn.waitFor();await noReadingOverlay(fast);
 assert.equal(await fast.locator('[data-loading-pending]').count(),0);await signIn.click();await fast.waitForURL('**/workspace');await noReadingOverlay(fast);await fast.context().close();
 const short=await gated({mobile:true});await short.p.waitForTimeout(100);await releaseAndReady(short,'fast-authentication');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await short.p.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'loading-ready-mobile.png'),animations:'disabled'});}
 await short.p.context().close();
 // Real wall time exceeds the removed five-second limit while the HTTP request stays held.
 const slow=await gated(),slowLoader=slow.p.locator('[data-loading-pending]').first();assert.equal(await slowLoader.getAttribute('aria-busy'),'true');
 assert.equal(await slowLoader.locator('.dy-loading-line').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
 await slow.p.waitForTimeout(5_250);assert.equal(slow.isReleased(),false);assert.equal(await slowLoader.isVisible(),true,'Slow work remains pending beyond the removed deadline');await noReadingOverlay(slow.p);
 await slowLoader.getByRole('button',{name:'Mini oyunları aç',exact:true}).click();const game=slow.p.getByRole('dialog',{name:'Mini oyunlar',exact:true});await game.waitFor();
 assert.equal(await game.getAttribute('aria-modal'),null,'Optional games do not make the working screen modal');assert.match(await game.locator('.dental-break-status').textContent(),/arka planda/);
 await releaseAndReady(slow,'slow-authentication');assert.equal(await game.isVisible(),true,'A manually opened game survives completion');await game.locator('.dental-break-status.is-ready').waitFor();
 await game.getByRole('button',{name:'Oyunları kapat',exact:true}).click();assert.equal(await slow.p.locator('.dental-break-sheet').count(),0);await slow.p.context().close();
 // A real failure ends its pending state and exposes the existing error.
 const failure=await gated({routePath:'/lab',failMembership:true});failure.release();await failure.p.getByText('Laboratuvar çalışma alanı açılamadı.',{exact:true}).waitFor();
 assert.equal(await failure.p.locator('[data-loading-pending]').count(),0);await noReadingOverlay(failure.p);await failure.p.context().close();
 // Abandon the loading owner, then deliver a late response to the already interactive new route.
 const cancelled=await gated();await cancelled.p.locator('.studio-activity-dock a[href="/ai"]').click();await cancelled.p.waitForURL('**/ai');
 const composer=cancelled.p.locator('#aya-local-message');await composer.waitFor();await noReadingOverlay(cancelled.p);assert.equal(await composer.isEnabled(),true);await composer.fill('İptal edilen yüklemeden sonra yazabiliyorum.');
 const lateResponse=cancelled.p.waitForResponse(response=>new URL(response.url()).pathname.includes('/auth/')&&response.request().method()!=='OPTIONS');cancelled.release();await lateResponse;await cancelled.p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await cancelled.p.locator('[data-loading-pending]').count(),0);await noReadingOverlay(cancelled.p);assert.equal(await composer.inputValue(),'İptal edilen yüklemeden sonra yazabiliyorum.');await cancelled.p.context().close();
 // Optional facts, games, stored game selection, and locale remain available manually.
 const manual=await page({locale:'en'});await manual.goto(url+'/mini-game');const manualFacts=manual.locator('.dental-facts[data-dental-fact]:not([data-dental-fact=""])');await manualFacts.waitFor();
 assert.equal(await manualFacts.getAttribute('lang'),'en');const firstFact=await manualFacts.getAttribute('data-dental-fact');assert.ok(firstFact);
 await manualFacts.getByRole('button',{name:'Pause facts',exact:true}).click();assert.equal(await manualFacts.getByRole('button',{name:'Resume facts',exact:true}).getAttribute('aria-pressed'),'true');
 await manualFacts.getByRole('button',{name:'Another fact',exact:true}).click();assert.notEqual(await manualFacts.getAttribute('data-dental-fact'),firstFact);
 const gameTabs=manual.locator('.mini-game-tabs button');assert.ok(await gameTabs.count()>=3);await gameTabs.nth(1).click();const selectedName=await gameTabs.nth(1).textContent(),selectedGame=await manual.evaluate(()=>localStorage.getItem('dentaya:mini-game:v1'));assert.ok(selectedGame);
 await manual.reload();await manual.locator('.mini-game-tabs button[aria-selected="true"]').filter({hasText:selectedName}).waitFor();assert.equal(await manual.evaluate(()=>localStorage.getItem('dentaya:mini-game:v1')),selectedGame);await noReadingOverlay(manual);await manual.context().close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,productionStandalone:true,artificialDelayMs:0,timings,fastRouteImmediatelyInteractive:true,slowRealRequestRemainsPending:true,realErrorsVisible:true,completionHasNoReadingOverlay:true,navigationCancellationHasNoStaleOverlay:true,gameSurvivesLoading:true,manualFactsGamesLocaleAndSelectionPreserved:true,concurrentOwnership:'unit verify-loading-play',reducedMotion:true,pageErrors:0,backend:'intercepted synthetic HTTP fixture; no production data'},null,2));
}catch(e){console.error(logs);console.error('Completed timing measurements',JSON.stringify(timings));if(process.env.DENTAYA_SCREENSHOT_DIR&&browser){for(const [index,p] of browser.contexts().flatMap(context=>context.pages()).entries())await p.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'loading-failure-'+index+'.png')}).catch(()=>{});}throw e;}finally{await browser?.close();server?.kill('SIGTERM');}
