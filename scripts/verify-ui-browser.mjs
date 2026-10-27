import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=path.join(project,'src/app/rc29-preview'),url='http://127.0.0.1:3046/rc29-preview';
const {chromium}=await import(process.env.DENTAYA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href:'playwright');
const manifest=JSON.parse(await fs.readFile(path.join(project,'src/lib/i18n/ui-manifest.json'),'utf8'));
try{const old=await fs.readFile(path.join(route,'page.tsx'),'utf8');if(!old.includes('RC29 browser verification fixture'))throw Error('A user route already exists at /rc29-preview');await fs.rm(route,{recursive:true,force:true});}catch(error){if(error.code!=='ENOENT')throw error;}
await fs.mkdir(route);await fs.copyFile(path.join(project,'scripts/fixtures/rc29-localization.tsx'),path.join(route,'page.tsx'));
let server,browser,logs='',exitCode=null;
async function stopServer(){if(!server||server.exitCode!==null||server.signalCode)return;await new Promise(resolve=>{const timer=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill('SIGTERM');});}
try{
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3046'],{cwd:project,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'dentaya-test-placeholder'},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',d=>{logs=(logs+d).slice(-18000);});server.stderr.on('data',d=>{logs=(logs+d).slice(-18000);});server.on('exit',code=>{exitCode=code;});
 const deadline=Date.now()+55000;while(Date.now()<deadline){if(exitCode!==null)throw Error(logs);try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true,...(process.env.DENTAYA_CHROMIUM_PATH?{executablePath:process.env.DENTAYA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1360,height:920}}),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(/unique "key"|hydration|Maximum update depth|useEffect must not return|destroy is not a function/i.test(message.text()))pageErrors.push(message.text());});
 await page.addInitScript(({hash,total})=>{
  localStorage.setItem('dentaya:tooth-appearance:v1',JSON.stringify({style:'anatomical',form:'natural',showRoots:true,startView:'occlusal'}));
  const state=window.rc29Mock={calls:[],memoryCalls:[],activations:[],packs:{},revision:0,cancels:0,pending:null,token:null};
  // Legacy Core preference must no longer bypass actual model inference.
  localStorage.setItem('dentaya:aya-response-mode','core');
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},languagePackGet:async({locale})=>({ok:true,locale,hash,revision:String(state.revision),entries:state.packs[locale]||{},completed:Object.keys(state.packs[locale]||{}).length,total,ready:false}),languagePackStatus:async()=>({running:false,locale:'',completed:0,total,error:''}),languagePackActivate:async({locale})=>{state.activations.push(locale);return {ok:true};},languagePackStart:async()=>({ok:true}),languagePackCancel:async()=>({ok:true}),languagePackImport:async()=>({ok:false,error:'INVALID_PACK'}),localAyaStatus:async()=>({ok:true,models:[{name:'qwen3:4b',size:2500000000}],progress:{running:false,status:'',completed:0,total:0}}),localAyaChat:input=>{if(input.task==='memory'){state.memoryCalls.push(input);return Promise.resolve({ok:false,error:'LOCAL_CANCELLED'});}state.calls.push(input);return new Promise(resolve=>{state.pending=resolve;});},onLocalAyaToken:callback=>{state.token=callback;return()=>state.token=null;},localAyaGuide:async input=>{state.calls.push({...input,guide:true});return {ok:true,engine:'guide',output:'Kaydet: belge araması sonucu',references:[{id:'teeth',title:'Diş seçimi',href:'/cases'}]};},localAyaCancel:async()=>{state.cancels++;state.pending?.({ok:false,error:'LOCAL_CANCELLED'});state.pending=null;return {ok:true};},localAyaCancelDownload:async()=>({ok:true}),localAyaDownload:async()=>({ok:true})};
 },{hash:manifest.hash,total:manifest.keys.length});
 await page.goto(url);await page.waitForFunction(()=>window.rc29Fixture);await page.waitForFunction(()=>!document.querySelector('#aya-local-message')?.disabled);
 assert.equal(await page.locator('#language-settings select').first().locator('option').count(),46);
 async function openAyaSection(target,section='Genel'){
  const aya=target.locator('.aya-chat'),toggle=aya.getByRole('button',{name:'Sohbet ayarları',exact:true});
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  const settings=aya.locator('#aya-conversation-settings');await settings.waitFor();
  await settings.getByRole('button',{name:section,exact:true}).click();
  return settings;
 }
 async function newAyaConversation(target){await target.locator('.aya-chat-header').getByRole('button',{name:'Yeni sohbet',exact:true}).click();}
 const paragraph='Sekiz ses dokusu ve olay başına ayrı düzey. Önizleme sessiz saatleri atlar.';
 await page.locator('.anatomy-stage canvas').waitFor();
 await page.waitForFunction(()=>Boolean(document.querySelector('.anatomy-number[data-tooth="47"]')?.style.left));
 await page.evaluate(()=>{window.rc31Stable={canvas:document.querySelector('.anatomy-stage canvas'),file:document.querySelector('#localized-file'),input:document.querySelector('#controlled-input')};});
 await page.locator('#localized-file').setInputFiles({name:'Kaydet.stl',mimeType:'application/octet-stream',buffer:Buffer.from('PRIVATE FILE FIXTURE')});
 const locales=await page.locator('#language-settings select').first().locator('option').evaluateAll(options=>options.map(option=>option.value));
 for(const locale of locales){
  const entries=locale==='tr'?Object.fromEntries(manifest.keys.map(key=>[key,key])):JSON.parse(await fs.readFile(path.join(project,`src/lib/i18n/packs/${locale}.json`),'utf8')).entries;
  await page.locator('#language-settings select').first().selectOption(locale);
  await page.waitForFunction(({locale,total})=>window.rc29Fixture.getLocale()===locale&&window.rc29Fixture.getLanguagePackCoverage(locale).completed===total&&!document.querySelector('#language-settings select')?.disabled,{locale,total:manifest.keys.length});
  assert.equal(await page.locator('#translated-paragraph').textContent(),entries[paragraph],locale+' paragraph');
  assert.equal(await page.locator('#system-case-title').textContent(),entries['Vaka durumu güncellendi'],locale+' system title');
  assert.equal(await page.locator('#system-case-body').textContent(),'CASE-47 · Kaydet · '+entries['Kabul Edildi'],locale+' system body preserves user text');
  assert.equal(await page.locator('#scan-context-label').textContent(),entries['Vaka / Hasta Ref'],locale+' scan reference label');
  assert.equal(await page.locator('#engine-progress-label').textContent(),entries['Model dosyaları doğrulanıyor…'],locale+' engine status');
  assert.equal(await page.locator('#controlled-input').getAttribute('placeholder'),entries['Hasta adı'],locale+' placeholder');
  assert.equal(await page.locator('#fdi-option optgroup').getAttribute('label'),entries['Alt çene'],locale+' optgroup');
  assert.equal(await page.locator('.localized-file-input-action').first().textContent(),entries['Dosya seç'],locale+' file caption');
  assert.equal(await page.locator('.localized-file-input-name').first().textContent(),'Kaydet.stl');assert.equal(await page.locator('#fdi-option').inputValue(),'47');
  assert.equal(await page.locator('#controlled-input').inputValue(),'Kaydet');assert.equal(await page.locator('#user-content strong').textContent(),'Kaydet');assert.equal(await page.locator('#selected-teeth').textContent(),'47,46');
  assert.equal(await page.evaluate(()=>document.querySelector('.anatomy-stage canvas')===window.rc31Stable.canvas&&document.querySelector('#localized-file')===window.rc31Stable.file&&document.querySelector('#controlled-input')===window.rc31Stable.input),true,locale+' host state');
  assert.equal(await page.locator('html').getAttribute('lang'),locale);assert.equal(await page.locator('html').getAttribute('dir'),['ar','he','fa'].includes(locale)?'rtl':'ltr');
 }
 await page.evaluate(async()=>{document.querySelector('#file-form').reset();await window.rc29Fixture.changeLocale('en');});
 await page.waitForFunction(()=>document.querySelector('.localized-file-input-name')?.textContent==='No file selected');
 await page.evaluate(()=>{window.rc29Original={button:document.querySelector('#translated-action'),input:document.querySelector('#controlled-input'),canvas:document.querySelector('.anatomy-stage canvas')};window.rc29Fixture.setLocale('en');});
 await page.waitForFunction(()=>document.querySelector('#translated-action')?.textContent==='Save');
 assert.equal(await page.locator('#controlled-input').inputValue(),'Kaydet');assert.equal(await page.locator('#user-content strong').textContent(),'Kaydet');

 const greeting=manifest.keys.find(key=>/^Merhaba, \{\d+\}$/.test(key));
 assert.ok(greeting,'Greeting template must be in the application manifest');
 const en={Kaydet:'Save',Vakalar:'Cases','Hasta adı':'Patient name',Dayanak:'Abutment','Seçim':'Selection','Köprü kur':'Create bridge','{0} ses düzeyi':'{0} volume','{0}–{1}: {2}':'{0}–{1}: {2}','{0} · {1}':'{0} · {1}',[paragraph]:'Eight sound textures with separate event levels. Preview ignores quiet hours.',[greeting]:'Hello, {0}'};
 await page.evaluate(({en})=>{window.rc29Mock.packs.en=en;window.rc29Mock.revision++;window.dispatchEvent(new Event('dentaya:language-pack'));},{en});
 await page.waitForFunction(()=>document.querySelector('#translated-paragraph')?.textContent?.startsWith('Eight sound textures'));
 assert.equal(await page.locator('#controlled-input').getAttribute('placeholder'),'Patient name');assert.equal(await page.locator('#controlled-input').getAttribute('aria-label'),'Patient name');assert.equal(await page.locator('#translated-action').getAttribute('title'),'Save');
 assert.equal(await page.locator('#translated-link').textContent(),'Cases');assert.equal(await page.locator('#translated-link').getAttribute('href'),'/cases');
 assert.equal(await page.locator('#fdi-message').textContent(),'47 · Abutment');assert.equal(await page.locator('#welcome-message').textContent(),'Hello, Kaydet $&');
 assert.equal(await page.locator('#protected-attribute').getAttribute('title'),'Kaydet');assert.equal(await page.locator('#protected-attribute').textContent(),'Save');assert.equal(await page.locator('#protected-attribute').getAttribute('uiMessages'),null);assert.equal(await page.locator('#sound-controls input[aria-label="Selection volume"]').count(),1);
 assert.deepEqual(await page.evaluate(()=>window.rc29Fixture.refs()),{button:'BUTTON',link:'A',href:'/cases',file:'INPUT'});
 await page.locator('#controlled-input').fill('Kaydet özel hasta $&');
 const points=()=>page.locator('.anatomy-number').evaluateAll(nodes=>nodes.map(node=>({code:node.dataset.tooth,left:node.style.left,top:node.style.top})));
 await page.waitForFunction(()=>Boolean(document.querySelector('.anatomy-number[data-tooth="47"]')?.style.left));
 assert.match(await page.locator('.anatomy-bridge-band').getAttribute('aria-label'),/^4[67]–4[67]: Create bridge$/);
 await page.evaluate(async()=>{let previous='',stable=0;for(let frame=0;frame<240&&stable<12;frame++){await new Promise(requestAnimationFrame);const current=JSON.stringify([...document.querySelectorAll('.anatomy-number')].map(node=>[node.style.left,node.style.top]));stable=current===previous?stable+1:0;previous=current;}if(stable<12)throw Error('Tooth view did not settle');});
 const before=await points();await page.evaluate(()=>window.rc29Fixture.setLocale('fr'));await page.waitForFunction(()=>window.rc29Mock.activations.at(-1)==='fr');await page.evaluate(()=>window.rc29Fixture.setLocale('en'));await page.waitForFunction(()=>window.rc29Mock.activations.at(-1)==='en');
 assert.equal(await page.locator('#selected-teeth').textContent(),'47,46');assert.equal(await page.locator('#controlled-input').inputValue(),'Kaydet özel hasta $&');assert.deepEqual(await points(),before);
 assert.equal(await page.evaluate(()=>document.querySelector('#translated-action')===window.rc29Original.button&&document.querySelector('#controlled-input')===window.rc29Original.input&&document.querySelector('.anatomy-stage canvas')===window.rc29Original.canvas),true);
 await page.evaluate(()=>window.rc29Fixture.setLocale('tr'));
 await openAyaSection(page,'Bellek ve notlar');
 const notebook=page.locator('.aya-knowledge');await notebook.locator('summary').click();
 await notebook.getByLabel('Başlık',{exact:true}).fill('Kurye düzeni');await notebook.getByLabel('Çalışma notu',{exact:true}).fill('Kurye toplama saatimiz 16:40. Paketler Kuzey rafına bırakılır.');await notebook.getByRole('button',{name:'Hatırla',exact:true}).click();assert.equal(await notebook.locator('.aya-knowledge-item').count(),1);
 async function answerModel(prompt,output){
  await page.locator('#aya-local-message').fill(prompt);await page.locator('.aya-chat-composer button[type=submit]').click();
  await page.waitForFunction(()=>typeof window.rc29Mock.pending==='function');
  await page.evaluate(output=>{const pending=window.rc29Mock.pending;window.rc29Mock.pending=null;pending({ok:true,output,references:[]});},output);
  await page.waitForFunction(output=>[...document.querySelectorAll('.aya-message--assistant [data-user-content]')].at(-1)?.textContent===output,output);
 }
 await answerModel('Kurye saatimiz kaç?','Kurye saatimiz 16:40.');
 assert.equal(await page.evaluate(()=>window.rc29Mock.calls.at(-1).agent),false,'A stored Core preference cannot bypass natural model conversation');
 assert.ok(await page.evaluate(()=>window.rc29Mock.calls.at(-1).knowledge.some(item=>item.content.includes('16:40'))),'Enabled notebook facts reach the model context');
 assert.match(await page.locator('.aya-message--assistant strong').textContent(),/yerel/);
 assert.equal(await page.locator('#aya-response-mode').count(),0);assert.equal(await page.locator('.aya-question-library').count(),0);
 await newAyaConversation(page);

 const textarea=page.locator('#aya-local-message');const callsBeforeCancel=await page.evaluate(()=>window.rc29Mock.calls.length);
 await textarea.fill('Kısa bir masal yaz');await page.locator('.aya-chat-composer button[type=submit]').click();await page.locator('.aya-chat-composer button[type=button]').click();
 await page.waitForFunction(()=>document.querySelector('#aya-local-message')?.value==='Kısa bir masal yaz');assert.equal(await page.evaluate(()=>window.rc29Mock.calls.length),callsBeforeCancel+1);assert.match(await page.locator('.aya-chat-error').textContent(),/Sorunuz korundu/);assert.equal(await page.locator('.aya-message').count(),1,'Cancellation retains only the actual user question');assert.equal(await page.locator('.aya-message--assistant').count(),0,'Cancellation must not fabricate an assistant turn');await newAyaConversation(page);
 await answerModel('Uzayda geçen bir masal yaz','Kaydet');assert.equal(await page.locator('.aya-message--assistant>[data-user-content]').textContent(),'Kaydet','Model-authored text is never translated as interface copy');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.bringToFront();await textarea.click();await textarea.pressSequentially('diş seçimi',{delay:20});assert.equal(await textarea.inputValue(),'diş seçimi');
 await page.locator('.aya-chat-composer button[type=submit]').click();await page.waitForFunction(()=>typeof window.rc29Mock.pending==='function');
 await page.evaluate(()=>{const pending=window.rc29Mock.pending;window.rc29Mock.pending=null;pending({ok:true,output:'Diş seçimi için FDI numarasını birlikte belirleyelim.',references:[]});});
 await page.waitForFunction(()=>document.querySelectorAll('.aya-message').length===4);assert.match(await page.locator('.aya-message--assistant strong').last().textContent(),/yerel/);assert.match(await page.locator('.aya-message--assistant strong').first().textContent(),/yerel/);
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);const lastAnswer=page.locator('.aya-message--assistant').last();await lastAnswer.getByRole('button',{name:'Kopyala',exact:true}).click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/FDI/);
 await openAyaSection(page);const chatDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Sohbeti dışa aktar',exact:true}).click();const chatFile=JSON.parse(await fs.readFile(await (await chatDownload).path(),'utf8'));assert.equal(chatFile.format,'dentaya-aya-conversation');assert.equal(chatFile.messages.length,4);assert.equal(chatFile.messages.at(-1).engine,'model');
 await page.evaluate(()=>window.rc29Fixture.saveAyaOptions({saveHistory:true,note:'PRIVATE NOTE',useNote:false}));await page.waitForFunction(()=>window.rc29Fixture.readAyaState().sessions.length===1);assert.equal(await page.evaluate(()=>window.rc29Fixture.readAyaState().sessions[0].messages.at(-1).engine),'model');await page.evaluate(()=>window.rc29Fixture.saveAyaOptions({saveHistory:false}));assert.equal(await page.evaluate(()=>window.rc29Fixture.readAyaState().sessions.length),0);
 const audio=await page.evaluate(async()=>{const results=[];for(const texture of ['ceramic','wood','silk','glass','paper','felt','water','studio'])for(const event of ['tap','tool','view','brush','complete','error','message']){const context=new OfflineAudioContext(1,44100,44100);window.rc29Fixture.synthesizeCue(context,context.destination,event,texture,1);const buffer=await context.startRendering(),data=buffer.getChannelData(0);let peak=0,energy=0,hash=2166136261;for(const value of data){peak=Math.max(peak,Math.abs(value));energy+=value*value;hash=Math.imul(hash^Math.round(value*1e7),16777619);}results.push({texture,event,peak,energy,hash:hash>>>0});}return results;});assert.equal(audio.length,56);assert.ok(audio.every(cue=>cue.energy>0&&cue.peak<1&&Number.isFinite(cue.peak)));assert.equal(new Set(audio.map(cue=>cue.hash)).size,56);
 await page.setViewportSize({width:390,height:844});await page.locator('#language-settings').scrollIntoViewIfNeeded();assert.ok(await page.locator('.language-pack-settings').evaluate(node=>node.getBoundingClientRect().right<=innerWidth));await page.locator('.aya-chat-composer').scrollIntoViewIfNeeded();const mobile=await page.evaluate(()=>{const composer=document.querySelector('.aya-chat-composer').getBoundingClientRect(),picker=document.querySelector('.language-select--compact').getBoundingClientRect();return {composerBottom:composer.bottom,pickerTop:picker.top,overflow:document.querySelector('.aya-chat').getBoundingClientRect().right>innerWidth};});assert.ok(!mobile.overflow);assert.ok(mobile.composerBottom<=mobile.pickerTop,'Language picker overlaps composer');
 if(process.env.DENTAYA_SCREENSHOT_DIR){await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR,{recursive:true});await page.locator('#language-settings').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC32_languages_mobile.png')});await page.setViewportSize({width:1360,height:920});await page.locator('#sound-controls').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC32_sound_settings.png')});}
 const guidePage=await browser.newPage({viewport:{width:1100,height:850}});
 guidePage.on('pageerror',error=>pageErrors.push(error.message));
 await guidePage.goto(url);await guidePage.waitForFunction(()=>!document.querySelector('#aya-local-message')?.disabled);
 assert.match(await guidePage.locator('.aya-status').textContent(),/Yerel model bekleniyor/,'A browser without the bridge clearly requires a local model');
 assert.equal(await guidePage.locator('#aya-response-mode').count(),0);
 for(const prompt of ['Windows güncelleme CMD kurulum','0,8 mm kaç mikron','1800 yüzde 18','Teslim notu taslağı']){
  await guidePage.locator('#aya-local-message').fill(prompt);await guidePage.locator('.aya-chat-composer button[type=submit]').click();
  await guidePage.waitForFunction(prompt=>document.querySelector('#aya-local-message')?.value===prompt&&!document.querySelector('#aya-local-message')?.disabled,prompt);
  assert.equal(await guidePage.locator('.aya-message--assistant').count(),0,'A missing model cannot manufacture a catalogue or utility answer');
  assert.match(await guidePage.locator('.aya-chat-error').textContent(),/model/i);assert.equal(await guidePage.locator('.aya-status--model').count(),0);
 }
 assert.equal(await guidePage.locator('.aya-message--user').count(),4,'Unavailable inference keeps each actual user question');
 await openAyaSection(guidePage);assert.match(await guidePage.locator('#aya-settings-content').textContent(),/Bu tarayıcı yerel model köprüsüne bağlı değil/);
 await guidePage.reload();assert.equal(await guidePage.locator('.aya-message').count(),0,'Failed requests do not enable history storage');
 await guidePage.close();
 const managedPage=await browser.newPage({viewport:{width:1280,height:920}});managedPage.on('pageerror',e=>pageErrors.push(e.message));
 await managedPage.addInitScript(()=>{
  const s=window.rc42Engine={phase:'none',installs:0,input:null,pending:null,token:null};
  window.dentayaDesktop={onOpenPreferences:()=>()=>{},localAyaStatus:async()=>({ok:s.phase==='ready',models:s.phase==='ready'?[{name:'aya-local:qwen3-1.7b-q8',label:'AYA Local · Qwen3 1.7B',size:1834426016}]:[],managed:{installed:s.phase!=='none',running:s.phase==='ready',version:'b9380',error:'',models:[],progress:{running:false,status:'',completed:0,total:0}},progress:{running:s.phase==='engine',status:s.phase==='engine'?'engine':s.phase==='ready'?'ready':'',completed:s.phase==='ready'?1850493692:10,total:1850493692}}),localAyaInstall:async()=>{s.installs++;s.phase='engine';return {ok:true};},localAyaEngineStop:async()=>({ok:true}),localAyaChat:input=>{if(input.task==='memory')return Promise.resolve({ok:false,error:'LOCAL_CANCELLED'});s.input=input;return new Promise(resolve=>s.pending=resolve);},localAyaCancel:async()=>{s.pending?.({ok:false,error:'LOCAL_CANCELLED'});return {ok:true};},onLocalAyaToken:fn=>{s.token=fn;return()=>s.token=null;}};
 });
 await managedPage.goto(url);await openAyaSection(managedPage);await managedPage.getByRole('button',{name:'Yerel motoru kur',exact:true}).waitFor();await managedPage.getByRole('button',{name:'Yerel motoru kur',exact:true}).click();
 await managedPage.waitForFunction(()=>window.rc42Engine.installs===1);await managedPage.evaluate(()=>window.rc42Engine.phase='ready');
 await managedPage.waitForFunction(()=>document.querySelector('.aya-status--model'));assert.equal(await managedPage.locator('#aya-response-mode').count(),0);
 await managedPage.locator('#aya-local-message').fill('Bir çalışma notu yaz');await managedPage.locator('.aya-chat-composer button[type=submit]').click();await managedPage.waitForFunction(()=>window.rc42Engine.input);
 assert.equal(await managedPage.evaluate(()=>window.rc42Engine.input.agent),false,'The main conversation requests natural text instead of a CAD JSON plan');
 assert.equal(await managedPage.evaluate(()=>typeof window.rc42Engine.token),'function','Natural conversation subscribes to validated bridge text');
 assert.equal(await managedPage.locator('.aya-message--assistant').count(),0,'A pending answer is not fabricated');
 await managedPage.evaluate(()=>{const s=window.rc42Engine;s.token({requestId:'stale-request',output:'STALE_TOKEN'});});
 assert.doesNotMatch(await managedPage.locator('.aya-chat-messages').textContent(),/STALE_TOKEN/);
 await managedPage.evaluate(()=>{const s=window.rc42Engine;s.token({requestId:s.input.requestId,output:'Canlı yanıt akışı'});});
 await managedPage.locator('[data-aya-streaming="conversation"]').waitFor();assert.match(await managedPage.locator('[data-aya-streaming="conversation"]').textContent(),/Canlı yanıt akışı/);
 await managedPage.evaluate(()=>window.rc42Engine.pending({ok:true,output:'Tamamlanan yerel yanıt',references:[],model:'aya-local:qwen3-1.7b-q8'}));await managedPage.waitForFunction(()=>document.querySelector('.aya-message--assistant')?.textContent?.includes('Tamamlanan yerel yanıt'));
 assert.equal(await managedPage.locator('[data-aya-streaming]').count(),0);assert.equal(await managedPage.locator('.aya-message--assistant').count(),1);assert.match(await managedPage.locator('.aya-status').textContent(),/Yerel model · yanıt alındı/);
 await managedPage.evaluate(()=>{const s=window.rc42Engine;s.token({requestId:s.input.requestId,output:'LATE_TOKEN_MUST_NOT_REPLACE_COMPLETED_ANSWER'});});
 assert.doesNotMatch(await managedPage.locator('.aya-chat-messages').textContent(),/LATE_TOKEN_MUST_NOT_REPLACE_COMPLETED_ANSWER/);
 await openAyaSection(managedPage,'Bellek ve notlar');
 const managedNotebook=managedPage.locator('.aya-knowledge');await managedNotebook.locator('summary').click();await managedNotebook.getByLabel('Başlık',{exact:true}).fill('Kurye düzeni');await managedNotebook.getByLabel('Çalışma notu',{exact:true}).fill('Kurye saati 16:40.');await managedNotebook.getByRole('button',{name:'Hatırla',exact:true}).click();
 await managedPage.reload();await openAyaSection(managedPage,'Bellek ve notlar');await managedNotebook.waitFor();if(!await managedNotebook.evaluate(n=>n.open))await managedNotebook.locator('summary').click();await managedNotebook.locator('.aya-knowledge-item').waitFor();assert.match(await managedNotebook.textContent(),/16:40/);
 if(process.env.DENTAYA_SCREENSHOT_DIR)await managedPage.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC44_AYA.png'),animations:'disabled'});
 await managedPage.close();
 const factPage=await browser.newPage({viewport:{width:1100,height:850},reducedMotion:'reduce'});factPage.on('pageerror',e=>pageErrors.push(e.message));await factPage.clock.install();await factPage.goto('http://127.0.0.1:3046/mini-game');await factPage.locator('[data-dental-fact]:not([data-dental-fact=""])').waitFor();
 const factId=()=>factPage.locator('.dental-facts').getAttribute('data-dental-fact');let beforeFact=await factId();await factPage.locator('h1').click();await factPage.clock.fastForward(12050);await factPage.waitForFunction(id=>document.querySelector('.dental-facts')?.dataset.dentalFact!==id,beforeFact);
 await factPage.getByRole('button',{name:'Bilgileri duraklat',exact:true}).click();await factPage.locator('h1').click();beforeFact=await factId();await factPage.clock.fastForward(36050);assert.equal(await factId(),beforeFact);
 await factPage.getByRole('button',{name:'Bilgileri sürdür',exact:true}).click();await factPage.locator('h1').click();await factPage.clock.fastForward(12050);await factPage.waitForFunction(id=>document.querySelector('.dental-facts')?.dataset.dentalFact!==id,beforeFact);
 await factPage.getByRole('button',{name:'İpucu',exact:true}).click();assert.equal(await factPage.locator('.kusp-cusp.is-hint').count(),1);const firstCusp=factPage.locator('[data-kusp="0"]');await firstCusp.focus();await factPage.keyboard.press('ArrowRight');assert.equal(await factPage.locator('[data-kusp="1"]').evaluate(e=>e===document.activeElement),true);const oldMoves=Number(await factPage.locator('[data-kusp-moves]').textContent());await factPage.keyboard.press('Shift+Enter');assert.equal(Number(await factPage.locator('[data-kusp-moves]').textContent()),oldMoves+1);
 for(const locale of ['en','ar','tr']){await factPage.locator('.language-select--compact select').selectOption(locale);await factPage.waitForFunction(id=>document.documentElement.lang===id,locale);await factPage.waitForFunction(lang=>document.querySelector('.dental-facts')?.lang===lang,locale==='tr'?'tr':'en');assert.equal(await factPage.locator('.kusp-game').getAttribute('dir'),'ltr');}
 assert.equal(await factPage.getByRole('tab').count(),5);assert.equal(await factPage.locator('.dental-facts-count').textContent(),'500');
 await factPage.getByRole('tab',{name:'İkiz İzler'}).click();const memory=factPage.locator('.memory-game');assert.equal(await memory.locator('[data-memory-shape=""]').count(),12);
 const known=new Map();let attempts=0,mismatchGate=false;
 while(await memory.getAttribute('data-memory-solved')!=='true'&&attempts++<40){
  const remaining=await memory.locator('.memory-card:not(.is-matched)').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.memoryCard)));
  let a,b;for(const i of remaining){const pair=remaining.find(j=>j!==i&&known.has(i)&&known.get(i)===known.get(j));if(pair!==undefined){a=i;b=pair;break;}}
  a??=remaining.find(i=>!known.has(i))??remaining[0];const card=i=>memory.locator(`[data-memory-card="${i}"]`);await card(a).click();known.set(a,await card(a).getAttribute('data-memory-shape'));
  b??=remaining.find(j=>j!==a&&known.get(j)===known.get(a))??remaining.find(j=>j!==a&&!known.has(j))??remaining.find(j=>j!==a);
  await card(b).click();known.set(b,await card(b).getAttribute('data-memory-shape'));
  if(known.get(a)!==known.get(b)){const third=remaining.find(i=>i!==a&&i!==b);if(third!==undefined){await card(third).click();assert.equal(await card(third).getAttribute('data-memory-shape'),'');mismatchGate=true;}await factPage.clock.runFor(901);}
 }
 assert.equal(await memory.getAttribute('data-memory-solved'),'true');assert.ok(mismatchGate);assert.equal(await factPage.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:mini-record:memory:v1')).wins),1);
 await factPage.getByRole('tab',{name:'Oluk Rotası'}).click();await factPage.getByRole('tab',{name:'İkiz İzler'}).click();assert.equal(await memory.getAttribute('data-memory-solved'),'true','Switching tabs keeps the current puzzle');
 await factPage.reload();await factPage.waitForFunction(()=>[...document.querySelectorAll('[role=tab]')].some(tab=>tab.getAttribute('aria-selected')==='true'&&tab.textContent.includes('İkiz İzler')));await factPage.waitForFunction(()=>document.querySelector('.memory-game .kusp-metrics')?.textContent?.includes('Çözülen1'));assert.equal(await factPage.getByRole('tab',{name:'İkiz İzler'}).getAttribute('aria-selected'),'true');assert.match(await memory.locator('.kusp-metrics').textContent(),/Çözülen1/);
 await factPage.getByRole('tab',{name:'Oluk Rotası'}).click();const groove=factPage.locator('.groove-game');let turns=0;
 await factPage.context().setOffline(true);
 while(await groove.getAttribute('data-groove-solved')!=='true'&&turns++<32){await groove.getByRole('button',{name:'İpucu',exact:true}).click();await groove.locator('.is-hint').click();}
 assert.equal(await groove.getAttribute('data-groove-solved'),'true');assert.equal(await factPage.evaluate(()=>JSON.parse(localStorage.getItem('dentaya:mini-record:route:v1')).wins),1);await factPage.context().setOffline(false);
 await factPage.setViewportSize({width:390,height:844});assert.ok(await factPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.DENTAYA_SCREENSHOT_DIR)await factPage.screenshot({path:path.join(process.env.DENTAYA_SCREENSHOT_DIR,'RC44_Games_Mobile.png'),animations:'disabled'});
 await factPage.getByRole('tab',{name:'Oluk Rotası'}).focus();await factPage.keyboard.press('ArrowLeft');assert.equal(await factPage.getByRole('tab',{name:'İkiz İzler'}).getAttribute('aria-selected'),'true');
 await factPage.locator('.language-select--compact select').selectOption('en');await factPage.getByRole('tab',{name:'Twin Imprints'}).waitFor();await factPage.locator('.language-select--compact select').selectOption('ar');await factPage.getByRole('tab',{name:'Twin Imprints'}).waitFor();
 await factPage.close();

 assert.deepEqual(pageErrors,[]);console.log(JSON.stringify({pass:true,locales:46,completePacksTested:46,systemNotificationsAndEngineStatus:true,filePickerAndReset:true,latePackUpdates:true,menuLocaleRoundTrip:true,userTextPreserved:true,formAndToothStatePreserved:true,hostRefsPreserved:true,cancelDoesNotSubmit:true,modelHistoryLabelPreserved:true,noFabricatedReplyWithoutDesktop:true,knowledgeNotebookPersistence:true,enabledNotebookSentToModel:true,managedInstallUi:true,naturalTextStreaming:true,staleAndLateTokensIgnored:true,completedReplyReplacesStream:true,collapsedAyaSettings:true,loadingFactsAutoAndPause:true,facts:500,miniGames:5,miniGamesActuallyPlayed:3,memoryMismatchGate:true,memoryActualPlayAndRecord:true,grooveHintSolutionAndOfflineRecord:true,tabStateAndKeyboard:true,noAutomaticUtilityFallback:true,ayaCopyAndExport:true,gameKeyboardAndHint:true,factLanguageFallback:true,historyOptOutClears:true,audioCues:audio.length,maxAudioPeak:Math.max(...audio.map(cue=>cue.peak)),mobileComposerVisible:true,inference:'mocked; no language quality claim'},null,2));
}catch(error){console.error(logs);throw error;}finally{rmSync(route,{recursive:true,force:true});rmSync(path.join(project,'.next/dev/types'),{recursive:true,force:true});await browser?.close();await stopServer();}
