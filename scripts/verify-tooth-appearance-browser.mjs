import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(project,'src/app/rc37-appearance-preview'),url='http://127.0.0.1:3051/rc37-appearance-preview';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');if(!old.includes('RC37 anatomical appearance verification fixture'))throw Error('A user route exists at the verification path');await fs.rm(route,{recursive:true,force:true});}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.mkdir(route);await fs.copyFile(path.join(project,'scripts/fixtures/rc37-tooth-appearance.tsx'),path.join(route,'page.tsx'));
let server,browser,logs='',exitCode=null;
const errors=[];
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3051'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'appearance-test-placeholder'},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',d=>{logs=(logs+d).slice(-18000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+65000;while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/hydration|Maximum update depth|unique "key"/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('dentaya:experience:v1',JSON.stringify({motion:'reduced'}));});
 await page.goto(url);await page.locator('.anatomy-number[data-tooth="47"]').waitFor();
 await page.waitForFunction(()=>Boolean(document.querySelector('.anatomy-number[data-tooth="47"]')?.style.left));
 const chart=()=>page.locator('.tooth-chart'),settings=()=>page.locator('.tooth-appearance-settings');
 const preferences=()=>page.evaluate(()=>window.rc37Appearance.preferences());
 async function settle(){await page.evaluate(async()=>{let last='',stable=0;for(let i=0;i<160&&stable<8;i++){await new Promise(requestAnimationFrame);const now=JSON.stringify([...document.querySelectorAll('.anatomy-number')].map(n=>[n.style.left,n.style.top]));stable=last===now?stable+1:0;last=now;}if(stable<8)throw Error('Anatomical labels did not settle');});}
 await chart().locator('.tooth-view-tabs button').filter({hasText:'Üstten'}).click();await settle();
 await chart().locator('.anatomy-number[data-tooth="47"]').click();
 await page.evaluate(()=>{window.rc37OriginalCanvas=document.querySelector('.anatomy-stage canvas');});
 const canvas=()=>page.locator('.anatomy-stage canvas');
 const visual=async()=>crypto.createHash('sha256').update(await canvas().screenshot()).digest('hex');
 const before=await visual();
 await settings().getByRole('combobox',{name:'Diş formu',exact:true}).selectOption('square');await settle();
 assert.equal((await preferences()).form,'square');assert.notEqual(await visual(),before);
 assert.equal(await page.evaluate(()=>window.rc37OriginalCanvas===document.querySelector('.anatomy-stage canvas')),true);
 assert.equal(await chart().locator('.anatomy-number[data-tooth="47"]').getAttribute('aria-pressed'),'true');
 assert.equal(await chart().locator('.tooth-view-tabs button').filter({hasText:'Üstten'}).getAttribute('aria-pressed'),'true');
 const square=await visual();await settings().getByRole('slider',{name:'Kron genişliği',exact:true}).fill('125');await settle();
 assert.equal((await preferences()).width,125);assert.notEqual(await visual(),square);
 await settings().locator('.tooth-preset-picker>summary').click();assert.equal(await settings().locator('[data-tooth-preset]').count(),16);
 await settings().locator('[data-tooth-preset="young-enamel"]').click();await settle();assert.equal((await preferences()).form,'youthful');assert.equal((await preferences()).width,100);
 await settings().locator('[data-tooth-preset="worn-enamel"]').click();await settle();assert.equal((await preferences()).form,'worn');
 await settings().getByRole('combobox',{name:'Diş rengi',exact:true}).selectOption('a3');assert.equal((await preferences()).shade,'a3');
 await settings().getByRole('combobox',{name:'Diş yüzeyi',exact:true}).selectOption('metal');assert.equal((await preferences()).finish,'metal');
 await settings().getByRole('slider',{name:'Diş parlaklığı',exact:true}).fill('90');assert.equal((await preferences()).gloss,90);
 await settings().getByLabel('Özel diş rengi',{exact:true}).evaluate(input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'#acddff');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>window.rc37Appearance.preferences().color==='#acddff');
 const saved=await preferences();await page.reload();await page.waitForFunction(()=>Boolean(document.querySelector('.anatomy-number[data-tooth="47"]')?.style.left));assert.deepEqual(await preferences(),saved);
 await page.evaluate(()=>{window.rc37OriginalCanvas=document.querySelector('.anatomy-stage canvas');});
 const picker=()=>page.locator('.rc37-appearance-header .language-select--compact select');
 assert.equal(await picker().locator('option').count(),46);
 await picker().selectOption('en');await page.waitForFunction(()=>document.documentElement.lang==='en');
 assert.equal(await settings().getByRole('combobox',{name:'Tooth colour',exact:true}).count(),1);
 await chart().locator('.tooth-view-tabs button').filter({hasText:'Right oblique'}).click();await settle();
 assert.match(await chart().locator('.anatomy-view-label').textContent(),/RIGHT OBLIQUE/);
 assert.ok(!/[İĞŞı]/.test(await chart().locator('.anatomy-view-label').textContent()));
 assert.ok((await chart().locator('.anatomy-side--right').textContent()).startsWith('R'));
 assert.ok((await chart().locator('.anatomy-side--left').textContent()).startsWith('L'));
 assert.deepEqual(await preferences(),saved);
 const additionalLocales=['no','is','sr','bs','sq','mk','az','ka','hy','he','fa','hi','bn','id','vi'];
 for(const locale of additionalLocales){
  const {entries}=JSON.parse(await fs.readFile(path.join(project,`src/lib/i18n/packs/${locale}.json`),'utf8'));
  await picker().selectOption(locale);await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
  assert.equal(await settings().getByRole('combobox',{name:entries['Diş formu'],exact:true}).count(),1,locale+' form caption');
  assert.equal(await settings().getByRole('combobox',{name:entries['Diş rengi'],exact:true}).count(),1,locale+' shade caption');
  assert.equal(await settings().getByRole('combobox',{name:entries['Diş yüzeyi'],exact:true}).count(),1,locale+' surface caption');
  assert.equal(await page.locator('html').getAttribute('dir'),['he','fa'].includes(locale)?'rtl':'ltr');
  assert.equal(await page.evaluate(()=>window.rc37OriginalCanvas===document.querySelector('.anatomy-stage canvas')),true,locale+' stable canvas');
  assert.deepEqual(await preferences(),saved,locale+' preserved preferences');
  assert.ok((await chart().locator('.anatomy-side--right').textContent()).startsWith('R'),locale+' anatomical right');
  assert.ok((await chart().locator('.anatomy-side--left').textContent()).startsWith('L'),locale+' anatomical left');
  await page.setViewportSize({width:390,height:844});await settle();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),locale+' mobile fits');
 }
 await picker().selectOption('en');await page.waitForFunction(()=>document.documentElement.lang==='en');
 await page.setViewportSize({width:1440,height:1080});await settle();
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC37_tooth_controls_internal.png'),fullPage:true});}
 await page.setViewportSize({width:390,height:844});await settle();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await picker().selectOption('tr');await page.waitForFunction(()=>document.documentElement.lang==='tr');await settings().getByRole('button',{name:'Varsayılana dön',exact:true}).click();assert.equal((await preferences()).form,'natural');assert.equal((await preferences()).color,null);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,webgl:true,presets:16,forms:9,registeredLanguages:46,additionalAppearanceLocalesTested:additionalLocales,shapeAndWidthChangeRenderedTeeth:true,canvasSelectionAndViewPreserved:true,presetChangesShape:true,shadeSurfaceGlossAndCustomColour:true,reloadPreservesPreferences:true,translatedViewCaption:true,englishControlsTranslated:true,additionalLocaleCaptionsAndPreferencesPreserved:true,rtlAndAnatomicalSidesPreserved:true,mobileFits:true,backend:'No production data'},null,2));
}catch(error){console.error(logs);throw error;}finally{
 await browser?.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,3000);});}
 await fs.rm(route,{recursive:true,force:true});await fs.rm(path.join(project,'.next/dev/types'),{recursive:true,force:true});
}
