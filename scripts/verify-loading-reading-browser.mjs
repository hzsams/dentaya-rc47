import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const url='http://127.0.0.1:3052',stamp=new Date('2026-10-15T19:00:00Z'),userId='11111111-1111-4111-8111-111111111111';
let server,browser,logs='';const errors=[];
try{
 const standalone=path.join(project,'.next/standalone');
 for(const [source,destination] of [[path.join(project,'public'),path.join(standalone,'public')],[path.join(project,'.next/static'),path.join(standalone,'.next/static')]]){
  await fs.mkdir(path.dirname(destination),{recursive:true});try{await fs.symlink(source,destination,'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
 }
 server=spawn(process.execPath,['server.js'],{cwd:standalone,env:{...process.env,HOSTNAME:'127.0.0.1',PORT:'3052',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-16000);});
 const deadline=Date.now()+30_000;
 while(Date.now()<deadline){try{if((await fetch(url+'/cad-library')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 async function page({auth=false,mobile=false}={}){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(12_000);p.on('pageerror',e=>errors.push(e.message));
  await p.clock.install({time:stamp});await p.clock.pauseAt(new Date(stamp.getTime()+1));
  if(auth)await p.addInitScript(({userId})=>{
   const exp=Math.floor(Date.now()/1000)-60,payload=btoa(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'}));
   localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`,refresh_token:'fixture',token_type:'bearer',expires_in:3600,expires_at:exp,user:{id:userId,email:'reading@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
  },{userId});
  return p;
 }
 async function gated(){
  const p=await page({auth:true});let release;const gate=new Promise(r=>{release=r;});let waiting=false;
  await p.route('http://127.0.0.1:54321/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;let data=[];
   if(pathname.includes('/auth/')){
    waiting=true;await gate;const exp=Math.floor(stamp.getTime()/1000)+86400;
    data={access_token:`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:userId,exp,aud:'authenticated',role:'authenticated'})).toString('base64')}.fixture`,refresh_token:'fixture',token_type:'bearer',expires_in:86400,expires_at:exp,user:{id:userId,email:'reading@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}};
   }
   await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
  });
  await p.goto(url+'/cad-library');await p.locator('.cad-library-page [data-dental-fact]:not([data-dental-fact=""])').waitFor();assert.ok(waiting,'A real authentication request is held');
  return {p,release};
 }
 const fast=await page({mobile:true});await fast.goto(url+'/cad-library');const reading=fast.locator('[data-loading-reading]');await reading.waitFor();const fact=await reading.locator('.dental-facts').getAttribute('data-dental-fact');assert.ok(fact);
 assert.equal(await fast.locator('.cad-library-page a[href="/workspace"]').count(),1,'The page is already ready underneath the reading screen');
 assert.equal(await fast.locator('.dy-loading-reading .dy-loading-line').count(),0,'Do not claim a completed load is still working');
 const bounds=await reading.getByRole('button',{name:'Çalışmaya geç',exact:false}).boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844);
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await fast.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC44_Reading_Mobile.png')});}
 await reading.getByRole('button',{name:'Mini oyunları aç',exact:true}).click({force:true});await fast.getByRole('dialog',{name:'Mini oyunlar',exact:true}).waitFor();
 await fast.clock.runFor(9000);assert.equal(await reading.count(),1);assert.equal(await reading.locator('.dental-facts').getAttribute('data-dental-fact'),fact);
 await fast.clock.runFor(999);assert.equal(await reading.count(),1,'Read for the full ten-second window');await fast.clock.runFor(2);assert.equal(await reading.count(),0,'Reading must finish at ten seconds');
 assert.equal(await fast.getByRole('dialog',{name:'Mini oyunlar',exact:true}).count(),1,'The game remains open after reading ends');await fast.locator('.dental-break-sheet .kusp-cusp').first().focus();await fast.keyboard.press('Escape');assert.equal(await fast.locator('.dental-break-sheet').count(),0);await fast.context().close();
 const short=await gated();const sourceFact=await short.p.locator('.cad-library-page .dental-facts').getAttribute('data-dental-fact');await short.p.clock.runFor(2000);short.release();await short.p.locator('[data-loading-reading]').waitFor();assert.equal(await short.p.locator('[data-loading-reading] .dental-facts').getAttribute('data-dental-fact'),sourceFact,'Keep the sentence after data becomes ready');
 await short.p.getByRole('button',{name:'Çalışmaya geç',exact:false}).click({force:true});assert.equal(await short.p.locator('[data-loading-reading]').count(),0);assert.equal(await short.p.evaluate(()=>document.activeElement?.id),'main-content');await short.p.clock.runFor(10_000);assert.equal(await short.p.locator('[data-loading-reading]').count(),0);await short.p.context().close();
 const slow=await gated();await slow.p.clock.runFor(15_000);assert.equal(await slow.p.locator('.cad-library-page .dy-loading-surface').count(),1,'Real pending data stays protected after ten seconds');assert.equal(await slow.p.locator('[data-loading-reading]').count(),0);slow.release();await slow.p.locator('.cad-library-page .dy-loading-surface').waitFor({state:'detached'});assert.equal(await slow.p.locator('[data-loading-reading]').count(),0,'Never add another reading delay after a long load');await slow.p.context().close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,productionStandalone:true,readingSeconds:10,sameSentence:true,automaticCloseAtTenSeconds:true,readyPageInBackground:true,earlyContinue:true,focusRestored:true,longLoadNotInterrupted:true,noExtraDelayAfterLongLoad:true,gameSurvivesReading:true,mobileBounds:true,pageErrors:0,backend:'intercepted test fixture, no production data'},null,2));
}catch(e){console.error(logs);throw e;}finally{await browser?.close();server?.kill('SIGTERM');}
