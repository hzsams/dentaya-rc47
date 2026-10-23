import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222';
const catalog=JSON.parse(await fs.readFile(path.join(project,'electron/brand-catalog.json'),'utf8'));
const ids=catalog.logos.map(logo=>logo.id);
const version=catalog.version;
// Previously aliased IDs now retain their own restored, distinct marks.
const compatibleIds=['04','05','07','08','10','11','14','15','16','17'];
const errors=[];
let server,browser,logs='',serverExit=null;
try {
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3053'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'brand-test-placeholder'},stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-18000);});server.on('exit',code=>{serverExit=code;});
  const url='http://127.0.0.1:3053/settings',deadline=Date.now()+55000;
  while(Date.now()<deadline){if(serverExit!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}
  browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1440,height:1040}});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/hydration|Maximum update depth|unique "key"/i.test(message.text()))errors.push(message.text());});
  await page.route('http://127.0.0.1:54321/**',async route=>{
    const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1);
    if(request.method()==='OPTIONS'){await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});return;}
    const user={id:userId,email:'brand@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    let body=[];
    if(url.pathname.startsWith('/auth/'))body={user};
    else if(table==='memberships')body=[{id:'brand-test-membership',organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
    else if(table==='organizations')body=[{id:orgId,name:'Logo Test Kurumu',org_type:'clinic',demo_mode:false,country:'TR'}];
    else if(table==='profiles')body=[{id:userId,full_name:'Logo Test',email:user.email,phone:''}];
    else if(table==='user_preferences')body=[{theme:'midnight',motion_level:'none',compact_mode:false,surface_style:'soft',font_scale:'normal'}];
    if(request.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
    await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
  });
  await page.route('**/api/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ready'})}));
  await page.addInitScript(({userId})=>{
    const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'}));
    localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:{id:userId,email:'brand@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
    if(!localStorage.getItem('brand-test-seeded')){localStorage.setItem('dentaya-logo-choice','16');localStorage.setItem('brand-test-seeded','true');}
    addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='nextjs-portal{visibility:hidden!important}';document.head.appendChild(style);});
  },{userId});
  async function openSettings(){await page.goto(url);await page.locator('.settings-nav button').filter({hasText:'Görünüm'}).click();await page.locator('.logo-choice').first().waitFor();}
  const choices=()=>page.locator('.logo-choice');
  const preview=()=>page.locator('.logo-live-preview img:visible');
  const mode=()=>page.locator('.customize-panel:visible select:has(option[value="word"])');
  const preset=()=>page.locator('.appearance-palette:visible select');
  const stored=()=>page.evaluate(()=>localStorage.getItem('dentaya-logo-choice'));
  async function expectFile(id,display='full'){
    await page.locator('.logo-live-preview').scrollIntoViewIfNeeded();
    await page.waitForFunction(({id,display})=>{
      const imgs=[...document.querySelectorAll('.logo-live-preview img')].filter(img=>getComputedStyle(img).display!=='none');
      return imgs.length===1&&imgs[0].complete&&imgs[0].naturalWidth>0&&imgs[0].getAttribute('src').includes('/'+id+'_')&&document.querySelector('.logo-live-preview .brand-lockup').dataset.logoMode===display;
    },{id,display});
    assert.equal(await preview().getAttribute('alt'),'DENTAYA');
    const src=await preview().getAttribute('src');assert.ok(src.includes(`brand=${version}`));
    const favicon=await page.locator('link[rel="icon"]').first().getAttribute('href');assert.ok(favicon.includes('/'+id+'_')&&favicon.includes(`_icon.svg?brand=${version}`));
    assert.ok(display==='icon'?src.includes('_icon.svg'):display==='word'?src.includes('_word'):!src.includes('_word')&&!src.includes('_icon'));
  }
  await openSettings();assert.equal(await choices().count(),ids.length);assert.equal(await stored(),'16');await expectFile('16');
  await page.waitForFunction(()=>{const artwork=document.querySelector('.brand-premium-artwork');return artwork?.complete&&artwork.naturalWidth>0;});
  for(const theme of ['theme:navy','theme:light']){
    await preset().selectOption(theme);
    await page.waitForFunction(theme=>document.documentElement.dataset.dyColorFamily===(theme==='theme:light'?'light':'dark'),theme);
    for(const [index,id] of ids.entries()){
      await choices().nth(index).click();assert.equal(await stored(),id);
      assert.equal(await page.locator('.logo-choice[aria-pressed="true"]').count(),1);
      for(const display of ['full','word','icon']){await mode().selectOption(display);await expectFile(id,display);}
      await mode().selectOption('full');
      const src=await preview().getAttribute('src');assert.equal(src.includes('_light.svg'),theme==='theme:light');
    }
  }
  await choices().first().click();await mode().selectOption('full');await expectFile('01');
  const scale=page.locator('.customize-panel:visible input[type="range"][min="80"][max="125"]');
  for(const value of [80,125]){
    await scale.evaluate((input,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));},value);
    await page.waitForFunction(value=>document.querySelector('.logo-live-preview img').getAttribute('width')===String(Math.round(250*value/100)),value);
  }
  await page.reload();await page.locator('.settings-nav button').filter({hasText:'Görünüm'}).click();await expectFile('01');assert.equal(await scale.inputValue(),'125');
  for(const id of compatibleIds){
    await page.evaluate(id=>{localStorage.setItem('dentaya-logo-choice',id);window.dispatchEvent(new StorageEvent('storage',{key:'dentaya-logo-choice',newValue:id}));},id);await expectFile(id);
  }
  await choices().first().click();
  await page.locator('.logo-search input').fill('CAD');assert.equal(await choices().count(),catalog.logos.filter(logo=>`${logo.name.tr} ${logo.description.tr} ${catalog.materials[logo.material].tr}`.toLocaleLowerCase('tr').includes('cad')).length);
  await page.locator('.logo-search input').fill('Titanyum');assert.equal(await choices().count(),catalog.logos.filter(logo=>logo.material==='titanium').length);
  await page.locator('.logo-search input').fill('no-matching-brand');assert.equal(await choices().count(),0);assert.equal(await page.locator('.brand-premium-empty').count(),1);
  await page.locator('.logo-search input').fill('');assert.equal(await choices().count(),ids.length);
  const download=page.waitForEvent('download');await page.locator('.customize-panel:visible').getByRole('button',{name:'Ek ayarları dışa aktar',exact:true}).click();
  const exported=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));assert.equal(exported.logo,'01');assert.equal(exported.version,2);
  const importFile=page.locator('.customize-panel:visible input[type="file"]');
  await importFile.setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,logo:'17',customization:exported.customization}))});await expectFile('17');assert.equal(await stored(),'17');
  await importFile.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,logo:'../../escape'}))});assert.equal(await stored(),'17');
  await importFile.setInputFiles({name:'hundred.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,logo:'100'}))});await expectFile('100');assert.equal(await stored(),'100');
  await page.reload();await page.locator('.settings-nav button').filter({hasText:'Görünüm'}).click();await expectFile('100');
  await importFile.setInputFiles({name:'atelier-120.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,logo:'120'}))});await expectFile('120');assert.equal(await stored(),'120');
  await page.reload();await page.locator('.settings-nav button').filter({hasText:'Görünüm'}).click();await expectFile('120');
  await importFile.setInputFiles({name:'current.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await expectFile('01');
  await page.evaluate(()=>{window.rc38SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dentaya-logo-choice')throw Error('blocked');return window.rc38SetItem.call(this,key,value);};});
  await choices().nth(2).click();await expectFile('03');assert.match(await page.locator('p[role="status"]').filter({hasText:'CAD Geometry uygulandı.'}).textContent(),/Cihaz kaydı kullanılamıyor/);
  await page.evaluate(()=>{Storage.prototype.setItem=window.rc38SetItem;delete window.rc38SetItem;});await choices().first().click();
  await page.evaluate(()=>{window.rc38DesktopCalls=[];window.dentayaDesktop={updateDesktopIcon:async logo=>{window.rc38DesktopCalls.push(logo);return {ok:true,message:'DentAYA masaüstü simgesi güncellendi. Eski görünürse masaüstünde F5 tuşuna basın.'};}};});
  await choices().last().click();await expectFile('120');await page.locator('.desktop-logo-button').click();await page.waitForFunction(()=>window.rc38DesktopCalls.length===1);assert.deepEqual(await page.evaluate(()=>window.rc38DesktopCalls),[catalog.logos.at(-1).file]);
  await choices().first().click();await page.locator('.desktop-logo-button').click();await page.waitForFunction(()=>window.rc38DesktopCalls.length===2);assert.deepEqual(await page.evaluate(()=>window.rc38DesktopCalls),[catalog.logos.at(-1).file,'01_dental_form']);await page.evaluate(()=>{delete window.dentayaDesktop;});
  const locales=['tr',...((await fs.readdir(path.join(project,'src/lib/i18n/packs'))).filter(name=>name.endsWith('.json')).map(name=>name.replace('.json','')))];
  for(const locale of locales){await page.locator('.language-select--compact select').selectOption(locale);await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);await expectFile('01');assert.equal(await stored(),'01');}
  await page.locator('.language-select--compact select').selectOption('en');
  for(const query of ['incisor','infinity']){
    await page.locator('.logo-search input').fill(query);
    assert.ok(await choices().count()>0,'English lowercase search finds '+query);
  }
  await page.locator('.logo-search input').fill('');
  await page.locator('.language-select--compact select').selectOption('tr');
  await page.setViewportSize({width:390,height:844});await page.locator('.logo-choice-grid').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('.logo-choice-grid').evaluate(node=>node.getBoundingClientRect().right<=innerWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.DENTAYA_SCREENSHOT_DIR){
    await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});
    // Settings has its own scrolling surface. A full-height locator screenshot
    // would include clipped blank regions below the viewport, so capture the UI.
    await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'DentAYA_Premium_logos_mobile.png')});
    await page.setViewportSize({width:1440,height:1040});await page.locator('.logo-choice-grid').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'DentAYA_Premium_logos_desktop.png')});
    await page.locator('.logo-live-preview').screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'DentAYA_Premium_main_logo.png')});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,logos:ids.length,themes:2,displayModes:3,logoThemeModeCombinations:ids.length*2*3,compatibleIds:10,restoredIdPreserved:true,artworkLoaded:true,searchAndEmptyState:true,reloadAndScale:true,legacyAndCurrentImports:true,hundredthChoiceImportAndReload:true,newestChoiceImportReloadAndDesktop:true,invalidImportBlocked:true,storageFailureReported:true,desktopIpc:'mocked',locales:locales.length,brandSpelling:'DENTAYA',mobileFits:true,backend:'mocked; no production data'},null,2));
}catch(error){console.error(logs);throw error;}finally{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}await fs.rm(path.join(project,'.next/dev/types'),{recursive:true,force:true});}
