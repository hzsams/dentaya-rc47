import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',orgId='22222222-2222-4222-8222-222222222222';
const errors=[],writes=[],languages=[];
let browser,server,logs='',serverExit=null;
try {
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3049'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'palette-test-placeholder'},stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{logs=(logs+data).slice(-18000);});server.on('exit',code=>{serverExit=code;});
  const url='http://127.0.0.1:3049/settings',deadline=Date.now()+65000;
  while(Date.now()<deadline){if(serverExit!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1080}});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/unique "key"|hydration|Maximum update depth/i.test(message.text()))errors.push(message.text());});
  await page.route('http://127.0.0.1:54321/**',async route=>{
    const request=route.request(),table=new URL(request.url()).pathname.split('/').at(-1);
    const user={id:userId,email:'palette@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    let body=[];
    if(request.method()==='OPTIONS'){await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});return;}
    if(new URL(request.url()).pathname.startsWith('/auth/'))body={user};
    else if(table==='memberships')body=[{id:'test-membership',organization_id:orgId,user_id:userId,role:'owner',status:'active'}];
    else if(table==='organizations')body=[{id:orgId,name:'Palet Test Kurumu',org_type:'clinic',demo_mode:false,country:'TR'}];
    else if(table==='profiles')body=[{id:userId,full_name:'Palet Test Kullanıcısı',email:user.email,phone:''}];
    else if(table==='user_preferences')body=[{theme:'midnight',motion_level:'full',compact_mode:false,surface_style:'soft',font_scale:'normal',custom_accent:'#ff0000',use_custom_accent:true}];
    if(request.method()!=='GET')writes.push({table,data:request.postDataJSON()});
    if(request.headers().accept?.includes('application/vnd.pgrst.object+json'))body=Array.isArray(body)?body[0]??null:body;
    await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(body)});
  });
  await page.route('**/api/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ready'})}));
  await page.addInitScript(({userId})=>{
    document.addEventListener('DOMContentLoaded',()=>{
      const style=document.createElement('style');style.textContent='nextjs-portal{visibility:hidden!important}';document.head.appendChild(style);
    });
    const payload=btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+86400,aud:'authenticated',role:'authenticated'}));
    localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:{id:userId,email:'palette@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}}));
    if(!localStorage.getItem('palette-test-seeded')){
      localStorage.setItem('dentaya:customization-v1',JSON.stringify({palette:'lagoon',accent:null,background:null,panel:null}));
      localStorage.setItem('dentaya:cad-workspace:v1',JSON.stringify({background:'graphite',rotateSpeed:1.4,zoomSpeed:1.2}));
      localStorage.setItem('palette-test-seeded','true');
    }
  },{userId});
  async function openSettings(){await page.goto(url);await page.locator('.settings-nav button').filter({hasText:'Görünüm'}).click();await page.locator('.appearance-palette:visible select').waitFor();}
  const palette=()=>page.locator('.appearance-palette:visible').first(),select=()=>palette().getByRole('combobox');
  const colors=()=>page.evaluate(()=>['bg','surface','accent'].map(key=>document.documentElement.style.getPropertyValue('--dy-'+key).trim().toLowerCase()));
  async function expectColors(expected){await page.waitForFunction(expected=>['bg','surface','accent'].every((key,index)=>document.documentElement.style.getPropertyValue('--dy-'+key).trim().toLowerCase()===expected[index]),expected);}
  await openSettings();
  assert.equal(await page.locator('.appearance-palette:visible select').count(),1);
  assert.equal(await page.locator('.themes,.custom-accent-row,.interface-style-grid,.customize-palettes,.accent-swatches').count(),0);
  assert.equal(await page.locator('.cad-workspace-settings select').count(),0);
  assert.equal(await select().inputValue(),'palette:lagoon');
  await select().selectOption('theme:ocean');await expectColors(['#071520','#0b2634','#4cc9f0']);
  const legacy=await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:preferences')));assert.equal(legacy.custom_accent,null);assert.equal(legacy.use_custom_accent,false);
  const cad=await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:cad-workspace:v1')));assert.equal(cad.background,'theme');assert.equal(cad.rotateSpeed,1.4);assert.equal(cad.zoomSpeed,1.2);
  await page.getByRole('button',{name:'Tümünü Kaydet',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('kaydedildi'));
  assert.ok(writes.some(w=>w.table==='user_preferences'&&(Array.isArray(w.data)?w.data[0]:w.data).theme==='ocean'),'Save must use the current shared palette theme');
  const options=await select().locator('option:not([disabled])').evaluateAll(nodes=>nodes.map(node=>node.value));assert.equal(options.length,72);
  for(const option of options){await select().selectOption(option);assert.equal(await select().inputValue(),option);const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:customization-v1')));assert.equal(stored.appearancePreset,option);assert.deepEqual(await colors(),[stored.background,stored.panel,stored.accent].map(c=>c.toLowerCase()));}
  for(const [group,id] of [['Studio','studio-graphite'],['Mineral','mineral-jade'],['Heritage','heritage-oxford'],['Contrast','contrast-ivory']]){await palette().locator('.appearance-collection-tabs').getByRole('button',{name:group,exact:true}).click();await palette().locator(`[data-palette-card="palette:${id}"]`).click();assert.equal(await select().inputValue(),'palette:'+id);}
  const referencePalettes=[
    ['reference-midnight',['#121747','#1a2154','#00b9f2']],
    ['reference-graphite',['#0c0d0e','#2d2e33','#10adb1']],
    ['reference-turquoise',['#082a30','#103d45','#16cdb8']],
    ['reference-coral',['#2b1621','#422433','#ff7198']],
  ];
  const hexRgb=hex=>'rgb('+[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)).join(', ')+')';
  for(const [id,expected] of referencePalettes){
    await select().selectOption('palette:'+id);await expectColors(expected);
    const rendered=await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,panel:getComputedStyle(document.querySelector('.appearance-palette:has(select)')).backgroundColor,text:document.documentElement.style.getPropertyValue('--dy-text'),accentText:document.documentElement.style.getPropertyValue('--dy-accent-contrast'),family:document.documentElement.dataset.dyColorFamily}));
    assert.equal(rendered.background,hexRgb(expected[0]),'The actual application background follows the reference palette');assert.equal(rendered.panel,hexRgb(expected[1]));assert.equal(rendered.family,'dark');
    const luminance=hex=>{const c=[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
    const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    assert.ok(expected.slice(0,2).every(surface=>ratio(rendered.text,surface)>=4.5),'Body and panel text retain readable contrast');assert.ok(ratio(expected[2],expected[1])>=4.5,'Small accent labels remain readable');assert.ok(ratio(rendered.accentText,expected[2])>=4.5,'Accent buttons retain readable text');
    const workspace=await page.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:cad-workspace:v1')));assert.equal(workspace.background,'theme');assert.equal(workspace.rotateSpeed,1.4);assert.equal(workspace.zoomSpeed,1.2);
    await page.getByRole('button',{name:'Tümünü Kaydet',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('kaydedildi'));await openSettings();assert.equal(await select().inputValue(),'palette:'+id);await expectColors(expected);
    if(id==='reference-graphite'&&process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC57_Background_Graphite_Desktop.png'),animations:'disabled'});}
  }
  await select().selectOption('palette:carbon');await expectColors(['#101215','#1c2026','#b9c6d7']);
  await palette().locator('summary').click();await palette().getByLabel('Vurgu rengi',{exact:true}).evaluate(input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'#aa55cc');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--dy-accent')==='#aa55cc');assert.equal(await select().inputValue(),'custom');
  await palette().getByRole('button',{name:'Tema rengine dön',exact:true}).click();await expectColors(['#101215','#1c2026','#b9c6d7']);assert.equal(await select().inputValue(),'palette:carbon');
  await page.locator('.desktop-titlebar-actions').getByRole('button',{name:'Görünüm ve tercihler',exact:true}).click();await page.locator('dialog[open] .appearance-palette select').selectOption('style:retro');await expectColors(['#e7dfcc','#fff5df','#8e3d25']);
  await page.getByRole('button',{name:'Ayarları kapat',exact:true}).click();assert.equal(await select().inputValue(),'style:retro');
  await openSettings();assert.equal(await select().inputValue(),'style:retro');await expectColors(['#e7dfcc','#fff5df','#8e3d25']);
  const locales=['en','de','fr','es','it','pt','nl','pl','ro','ru','uk','ar','zh','ja','sv','da','el','cs','ko','bg','hr','et','fi','hu','ga','lv','lt','mt','sk','sl','no','is','sr','bs','sq','mk','az','ka','hy','he','fa','hi','bn','id','vi','tr'];
  for(const locale of locales){await page.locator('.language-select--compact select').selectOption(locale);await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);assert.equal(await select().inputValue(),'style:retro');await expectColors(['#e7dfcc','#fff5df','#8e3d25']);languages.push(locale);}
  const download=page.waitForEvent('download');await page.locator('.customize-panel:visible').getByRole('button',{name:'Ek ayarları dışa aktar',exact:true}).click();const saved=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));assert.equal(saved.version,2);assert.equal(saved.customization.appearancePreset,'style:retro');assert.ok(saved.theme);
  await page.getByRole('button',{name:'Görünümü Sıfırla',exact:true}).click();await expectColors(['#ebe9f0','#ffffff','#72568f']);
  await page.locator('.customize-panel:visible input[type=file]').setInputFiles({name:'palette.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await expectColors(['#e7dfcc','#fff5df','#8e3d25']);assert.equal(await select().inputValue(),'style:retro');
  const old={version:1,logo:saved.logo,customization:{...saved.customization,appearancePreset:null,style:'old-money',background:'#ede9de',panel:'#faf7ef',accent:'#294e3d',font:'classic'}};
  await page.locator('.customize-panel:visible input[type=file]').setInputFiles({name:'old-palette.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});await expectColors(['#ede9de','#faf7ef','#294e3d']);assert.equal(await select().inputValue(),'style:old-money');
  if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await palette().screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'palette-desktop.png')});}
  await page.setViewportSize({width:390,height:844});assert.ok(await palette().evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.DENTAYA_SCREENSHOT_DIR)await palette().screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'palette-mobile.png')});
  await select().selectOption('palette:reference-midnight');await expectColors(['#121747','#1a2154','#00b9f2']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.DENTAYA_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC57_Background_Midnight_Mobile.png'),animations:'disabled'});
  await select().selectOption('palette:reference-coral');await expectColors(['#2b1621','#422433','#ff7198']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.DENTAYA_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC57_Background_Coral_Mobile.png'),animations:'disabled'});
  await openSettings();assert.equal(await select().inputValue(),'palette:reference-coral');await expectColors(['#2b1621','#422433','#ff7198']);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,presetChoices:options.length,referencePalettes:4,actualGlobalReferenceBackgrounds:true,readableTextPanelAndAccentContrast:true,referencePaletteSaveAndReload:true,referencePalettesMobileFit:true,oneVisiblePalette:true,duplicateEditorsRemoved:true,settingsAndQuickPanelSynced:true,legacyAccentCannotLeak:true,reloadPreservesSelection:true,saveUsesCurrentPalette:true,customColorAndReset:true,appearanceExportVersion:2,version1Import:true,version2Import:true,cadFollowsPalette:true,cadCameraSpeedsPreserved:true,languages,mobileFits:true,backend:'mocked, no production data'},null,2));
} catch(error){console.error(logs);throw error;} finally {await browser?.close();server?.kill('SIGTERM');}
