'use strict';
const assert=require('node:assert/strict');
const {createLocalAya,DOWNLOAD_MODEL}=require('../electron/aya-local.cjs');
const model={name:DOWNLOAD_MODEL,size:2500000000,details:{format:'gguf'}},encoder=new TextEncoder();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settled(api){for(let i=0;i<30;i++){const value=await api.status();if(!value.ollama.progress.running)return value;await tick();}throw Error('Download did not settle');}
(async()=>{
 let mode='hold',held,releaseFetch,cancelled=0,chatCalls=0,pulls=0;
 const managedProgress={running:false,status:'Managed model is not installed',completed:0,total:0};
 const api=createLocalAya({managed:{status:async()=>({installed:false,running:false,version:'b9380',error:'MODEL_MISSING',models:[],progress:managedProgress}),isBusy:()=>false},fetchImpl:async(url,options)=>{
  assert.ok(url.startsWith('http://127.0.0.1:11434/api/'));assert.equal(options.redirect,'error');assert.equal(options.headers?.Authorization,undefined);
  if(url.endsWith('/tags'))return Response.json({models:[model]});
  if(url.endsWith('/show'))return Response.json({capabilities:['completion']});
  if(url.endsWith('/chat')){chatCalls++;return Response.json({done:true,message:{content:'A new local response'}});}
  assert.ok(url.endsWith('/pull'));assert.deepEqual(JSON.parse(options.body),{model:DOWNLOAD_MODEL,stream:true});pulls++;
  if(mode==='ignores-abort')return new Promise(resolve=>{releaseFetch=resolve;});
  if(mode==='private-error')return new Response('{"error":"PRIVATE_C:/patients/scan.stl"}\n');
  if(mode==='incomplete')return new Response('{"status":"pulling manifest"}\n');
  if(mode==='malformed')return new Response('{"status": broken}\n');
  if(mode==='oversized')return new Response('x'.repeat(64001));
  if(mode==='success')return new Response('{"status":"success"}',{headers:{'Content-Type':'application/x-ndjson'}});
  return new Response(new ReadableStream({start(controller){held=controller;controller.enqueue(encoder.encode('{"status":"PRIVATE_REMOTE_MESSAGE", "completed":12, "total":100}\n'));},cancel(){cancelled++;}}));
 }});
 let status=await api.status();assert.equal(status.ollama.online,true);assert.deepEqual(status.progress,managedProgress);assert.equal(status.ollama.progress.running,false);
 assert.equal(api.startDownload(11).ok,true);await tick();status=await api.status();assert.equal(status.ok,false);assert.equal(status.error,'LOCAL_BUSY');assert.equal(status.ollama.progress.running,true);assert.equal(status.ollama.progress.completed,12);assert.equal(status.ollama.progress.total,100);assert.doesNotMatch(JSON.stringify(status),/PRIVATE_REMOTE_MESSAGE/);assert.deepEqual(status.progress,managedProgress,'Ollama progress cannot overwrite a managed setup snapshot');
 assert.equal(api.cancelDownload(22).error,'LOCAL_BUSY');assert.equal(api.isBusy(),true);assert.equal(api.startDownload(22).error,'LOCAL_BUSY');assert.equal((await api.chat({prompt:'Hold',model:DOWNLOAD_MODEL},22)).error,'LOCAL_BUSY');assert.equal(chatCalls,0);
 assert.equal(api.cancelDownload(11).ok,true);status=await settled(api);assert.equal(status.ollama.progress.running,false);assert.match(status.ollama.progress.status,/durduruldu/);assert.equal(api.isBusy(),false);assert.ok(cancelled>0);
 try{held.enqueue(encoder.encode('{"status":"success"}\n'));}catch(error){assert.equal(error.name,'TypeError');}
 assert.match((await api.status()).ollama.progress.status,/durduruldu/,'A late cancelled stream cannot mark the model downloaded');
 mode='ignores-abort';assert.equal(api.startDownload(11).ok,true);await tick();assert.equal(typeof releaseFetch,'function');assert.equal(api.cancelDownload(11).ok,true);status=await settled(api);assert.equal(api.isBusy(),false,'Owner cancel settles even when a transport ignores its signal');assert.match(status.ollama.progress.status,/durduruldu/);releaseFetch(new Response('{"status":"success"}\n'));await tick();assert.match((await api.status()).ollama.progress.status,/durduruldu/);
 for(mode of ['private-error','incomplete','malformed','oversized']){assert.equal(api.startDownload(11).ok,true);status=await settled(api);assert.equal(status.ollama.progress.completed,0,mode+' cannot succeed because an older copy of the model is installed');assert.doesNotMatch(JSON.stringify(status),/PRIVATE_C|patients|scan\.stl/);}
 mode='success';assert.equal(api.startDownload(11).ok,true);status=await settled(api);assert.equal(status.ollama.progress.completed,1);assert.equal(status.ollama.progress.total,1);assert.equal(status.ollama.progress.running,false);assert.equal(status.ok,true);assert.equal(pulls,7);
 assert.equal((await api.chat({prompt:'Continue locally',model:DOWNLOAD_MODEL},11)).ok,true);assert.equal(chatCalls,1);
 const absent=createLocalAya({fetchImpl:async()=>{throw Error('offline');}});assert.equal((await absent.status()).ollama.online,false);
 console.log('PASS Ollama setup: independent online/progress snapshot, fixed local Qwen3 4B pull, static status/error text, bounded parser, required completion, installed-model check, truthful foreign cancellation, prompt owner cancellation with late/ignored transport, mutual exclusion and recovery. Mock loopback transport; no real model downloaded.');
})().catch(error=>{console.error(error);process.exitCode=1;});
