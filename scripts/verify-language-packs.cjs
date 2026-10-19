'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createLanguagePacks,LANGUAGES,valid,manifest}=require('../electron/aya/language-packs.cjs');
const local={name:'test-local:4b',size:1234,details:{format:'gguf'}};
async function until(check){for(let i=0;i<10000;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,2));}throw Error('TEST_TIMEOUT');}
(async()=>{const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dentaya-pack-'));try{
 assert.equal(Object.keys(LANGUAGES).length,46);assert.equal(valid('Termin {0}','Due {0}'),true);
 for(const value of ['Due','Due {1}','Due {0}{0}','<script>x</script>','',42])assert.equal(valid('Termin {0}',value),false);
 assert.equal(valid('FDI 47 · 0.25 mm','FDI 48 · 0.25 mm'),false);assert.equal(valid('0.25 mm','0,25 mm'),true);
 let mode='pause',calls=0,intercepted,externalBusy=false;
 const fetchImpl=async(url,options)=>{
  assert.equal(new URL(url).origin,'http://127.0.0.1:11434');assert.equal(options.redirect,'error');assert.equal(options.headers?.Authorization,undefined);
  if(url.endsWith('/tags'))return Response.json({models:mode==='cloud-tag'?[{...local,remote_host:'https://example.invalid'}]:[local]});
  if(url.endsWith('/show'))return Response.json(mode==='cloud-show'?{remote_model:'cloud'}:{capabilities:['completion']});
  calls++;const body=JSON.parse(options.body),input=JSON.parse(body.messages[1].content);assert.ok(Object.values(input).every(source=>manifest.keys.includes(source)));assert.ok(Object.keys(input).length<=8);assert.equal(body.stream,false);
  if(mode==='pause'&&calls===2){intercepted=true;return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));}
  if(mode==='invalid')return Response.json({done:true,message:{content:'[]'}});
  return Response.json({done:mode!=='incomplete',message:{content:JSON.stringify(Object.fromEntries(Object.entries(input).map(([key,source])=>[key,'TEST '+source])))}});
 };
 const service=createLanguagePacks({directory,bundledDirectory:null,fetchImpl,busy:()=>externalBusy});
 for(const locale of ['../en','__proto__','tr'])assert.equal((await service.get(locale)).error,'INVALID_LOCALE');
 const bundled=createLanguagePacks({directory});for(const locale of Object.keys(LANGUAGES).filter(locale=>locale!=='tr')){const pack=await bundled.get(locale);assert.equal(pack.ready,true,locale);assert.equal(pack.completed,manifest.keys.length,locale);}
 const seed=await service.get('en');assert.equal(seed.ready,false);assert.ok(seed.completed>220);
 externalBusy=true;assert.equal((await service.start({locale:'en',model:local.name},1)).error,'LOCAL_BUSY');externalBusy=false;
 await service.start({locale:'en',model:local.name},7);await until(()=>intercepted);assert.equal(service.status().completed,seed.completed+8);
 assert.equal((await service.start({locale:'fr',model:local.name},9)).error,'LOCAL_BUSY');service.cancel(9);assert.equal(service.isBusy(),true);service.cancel(7);await until(()=>!service.isBusy());assert.equal(service.status().error,'LOCAL_CANCELLED');
 const partial=await service.get('en');assert.equal(partial.completed,seed.completed+8);assert.equal((await createLanguagePacks({directory,bundledDirectory:null,fetchImpl}).get('en')).completed,partial.completed);
 await fs.writeFile(path.join(directory,'aya-language-packs','de.json'),JSON.stringify({locale:'fr',hash:manifest.hash,entries:{Kaydet:'INCORRECT LANGUAGE'}}));assert.notEqual((await createLanguagePacks({directory,bundledDirectory:null,fetchImpl}).get('de')).entries.Kaydet,'INCORRECT LANGUAGE');
 mode='normal';await service.start({locale:'en',model:local.name},7);await until(()=>!service.isBusy());assert.equal(service.status().error,'');
 const complete=await service.get('en');assert.equal(complete.ready,true);assert.equal(complete.completed,manifest.keys.length);for(const source of manifest.keys)assert.ok(complete.entries[source]);
 for(const scenario of ['cloud-tag','cloud-show','invalid','incomplete']){mode=scenario;const before=calls;await service.start({locale:'mt',model:local.name},7);await until(()=>!service.isBusy());assert.equal(service.status().error,scenario.startsWith('cloud')?'LOCAL_MODEL_REQUIRED':'INVALID_TRANSLATION');if(scenario.startsWith('cloud'))assert.equal(calls,before);}
 for(const data of [{locale:'../en',hash:manifest.hash,entries:{}},{locale:'en',hash:'wrong',entries:{}},{locale:'en',hash:manifest.hash,entries:{'PRIVATE PATIENT NAME':'NO'}},{locale:'en',hash:manifest.hash,entries:{[manifest.keys.find(key=>key.includes('{0}'))]:'lost placeholder'}}])assert.equal((await service.importPack(data)).error,'INVALID_PACK');
 const corrected=await service.importPack({locale:'en',hash:manifest.hash,entries:{Kaydet:'SAVE CORRECTED'}});assert.equal(corrected.ready,true);assert.notEqual((await service.get('en')).revision,complete.revision);assert.equal((await service.get('en')).entries.Kaydet,'SAVE CORRECTED');
 assert.ok((await fs.readdir(path.join(directory,'aya-language-packs'))).every(name=>!name.endsWith('.tmp')));
 console.log(`PASS: ${manifest.keys.length} complete source keys, resume/cancel/reload, model verification, fixed loopback, no live user data, JSON/placeholders/FDI-number validation, import integrity and corrections. Inference mocked; no translation quality claim.`);
}finally{await fs.rm(directory,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
