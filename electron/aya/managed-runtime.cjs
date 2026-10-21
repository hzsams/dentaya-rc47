/* AYA owns lifecycle, retrieval and conversation policy. Inference uses the credited open-source engine. */
'use strict';
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),crypto=require('node:crypto'),net=require('node:net'),os=require('node:os');
const {spawn}=require('node:child_process');
const {unzipSync}=require('fflate');
const {fitMessagesToBudget}=require('./agent.cjs');
const ENGINE={version:'b9380',url:'https://github.com/ggml-org/llama.cpp/releases/download/b9380/llama-b9380-bin-win-cpu-x64.zip',sha256:'cd44b61422671f0565cae98d856a70d55ef10392197a49246671f85bacb50dc3',bytes:16067676};
const MODEL={id:'aya-local:qwen3-1.7b-q8',name:'Qwen3-1.7B-Q8_0.gguf',label:'AYA Local · Qwen3 1.7B',url:'https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/90862c4b9d2787eaed51d12237eafdfe7c5f6077/Qwen3-1.7B-Q8_0.gguf',sha256:'061b54daade076b5d3362dac252678d17da8c68f07560be70818cace6590cb1a',bytes:1834426016};
const downloadHost=h=>h==='github.com'||h==='release-assets.githubusercontent.com'||h==='objects.githubusercontent.com'||h==='huggingface.co'||h.endsWith('.huggingface.co')||h.endsWith('.hf.co');
async function trustedResponse(url,options={},fetchImpl=fetch){
 for(let redirects=0;redirects<8;redirects++){
  const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!downloadHost(u.hostname))throw Error('AYA_DOWNLOAD_HOST');
  const response=await fetchImpl(u.toString(),{...options,redirect:'manual'});
  if([301,302,303,307,308].includes(response.status)){const to=response.headers.get('location');await response.body?.cancel().catch(()=>{});if(!to)throw Error('AYA_DOWNLOAD_FAILED');url=new URL(to,u).toString();continue;}
  return response;
 }
 throw Error('AYA_DOWNLOAD_REDIRECT');
}
async function hashFile(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
async function verifiedDownload(spec,destination,{signal,onProgress=()=>{},fetchImpl=fetch}={}){
 const partial=destination+'.part';await fsp.mkdir(path.dirname(destination),{recursive:true});
 if(fs.existsSync(destination)&&(await fsp.stat(destination)).size===spec.bytes&&await hashFile(destination)===spec.sha256)return destination;
 let offset=0;try{offset=(await fsp.stat(partial)).size;}catch{}
 if(offset>=spec.bytes){if(offset===spec.bytes&&await hashFile(partial)===spec.sha256){await fsp.rename(partial,destination);return destination;}await fsp.rm(partial,{force:true});offset=0;}
 const hash=crypto.createHash('sha256');if(offset)for await(const chunk of fs.createReadStream(partial))hash.update(chunk);
 let response=await trustedResponse(spec.url,{headers:offset?{Range:'bytes='+offset+'-'}:{},signal},fetchImpl);
 if(offset&&response.status===200){offset=0;await response.body?.cancel().catch(()=>{});response=await trustedResponse(spec.url,{signal},fetchImpl);}
 // Restarted responses need a fresh digest; retained ranges hash the existing prefix.
 const digest=offset?hash:crypto.createHash('sha256');
 if(!(response.status===200&&!offset||response.status===206&&offset&&response.headers.get('content-range')?.startsWith('bytes '+offset+'-')))throw Error('AYA_DOWNLOAD_FAILED');
 if(!response.body)throw Error('AYA_DOWNLOAD_FAILED');
 const file=await fsp.open(partial,offset?'a':'w'),reader=response.body.getReader();let bytes=offset;
 try{while(true){if(signal?.aborted)throw signal.reason;const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>spec.bytes)throw Error('AYA_DOWNLOAD_SIZE');digest.update(value);await file.writeFile(value);onProgress(bytes,spec.bytes);}}
 finally{await file.close();await reader.cancel().catch(()=>{});}
 if(bytes!==spec.bytes||digest.digest('hex')!==spec.sha256){await fsp.rm(partial,{force:true});throw Error('AYA_DOWNLOAD_CHECKSUM');}
 await fsp.rename(partial,destination);return destination;
}
async function extractEngine(archive,destination){
 let total=0;const seen=new Set();
 const entries=unzipSync(new Uint8Array(await fsp.readFile(archive)),{filter:file=>{
  if(file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\'))throw Error('AYA_ENGINE_ARCHIVE');
  const name=path.posix.basename(file.name),accept=name==='llama-server.exe'||/^[a-z0-9_.-]+\.dll$/i.test(name)||/^(LICENSE|COPYING)(\.[a-z]+)?$/i.test(name);
  if(!accept)return false;if(seen.has(name.toLowerCase()))throw Error('AYA_ENGINE_ARCHIVE');seen.add(name.toLowerCase());total+=file.originalSize;
  if(total>300*1024*1024||file.originalSize>100*1024*1024)throw Error('AYA_ENGINE_ARCHIVE');return true;
 }});
 if(!Object.keys(entries).some(name=>path.posix.basename(name)==='llama-server.exe'))throw Error('AYA_ENGINE_ARCHIVE');
 await fsp.mkdir(destination,{recursive:true});for(const [name,data] of Object.entries(entries))await fsp.writeFile(path.join(destination,path.posix.basename(name)),data);
}
function createManagedAya({directory,fetchImpl=fetch,spawnImpl=spawn,platform=process.platform,engineBinary}={}){
 if(!directory)throw Error('AYA_DIRECTORY_REQUIRED');const root=path.join(directory,'aya-local'),engineDir=path.join(root,'engine'),modelsDir=path.join(root,'models');
 const binary=()=>engineBinary||path.join(engineDir,platform==='win32'?'llama-server.exe':'llama-server');
 let child=null,startPromise=null,activeModel='',base='',key='',install=null,stopping=false;
 let progress={running:false,status:'',completed:0,total:0},lastError='';
 async function records(){try{const raw=JSON.parse(await fsp.readFile(path.join(root,'models.json'),'utf8'));return Array.isArray(raw)?raw.slice(0,16).filter(m=>m&&/^aya-local:[a-z0-9][a-z0-9.-]{0,79}$/.test(m.id)&&/^[a-zA-Z0-9_.-]+\.gguf$/.test(m.file)&&typeof m.name==='string'&&m.name.length<=160&&Number.isSafeInteger(m.size)&&m.size>1024&&m.size<=12*1024**3&&/^[a-f0-9]{64}$/.test(m.sha256)):[];}catch{return [];}}
 async function modelList(){const list=[];for(const r of await records())try{if((await fsp.stat(path.join(modelsDir,r.file))).size===r.size)list.push(r);}catch{}return list;}
 async function saveRecords(list){await fsp.mkdir(root,{recursive:true});const file=path.join(root,'models.json');await fsp.writeFile(file+'.tmp',JSON.stringify(list),{mode:0o600});await fsp.rename(file+'.tmp',file);}
 async function status(){const installed=fs.existsSync(binary()),models=await modelList();return {installed,running:Boolean(child&&base),version:ENGINE.version,error:lastError,models:models.map(m=>({name:m.id,label:m.name,size:m.size})),progress:{...progress}};}
 async function installAll(owner){
  if(install||startPromise||child)return {ok:false,error:'LOCAL_BUSY'};
  if(platform!=='win32')return {ok:false,error:'AYA_WINDOWS_REQUIRED'};
  const controller=new AbortController();install={owner,controller};lastError='';progress={running:true,status:'engine',completed:0,total:ENGINE.bytes+MODEL.bytes};
  void(async()=>{try{
   await fsp.mkdir(root,{recursive:true});const archive=path.join(root,'engine-'+ENGINE.version+'.zip');
   await verifiedDownload(ENGINE,archive,{signal:controller.signal,fetchImpl,onProgress:(n)=>{progress={running:true,status:'engine',completed:n,total:ENGINE.bytes+MODEL.bytes};}});
   if(controller.signal.aborted)throw controller.signal.reason;
   const stage=path.join(root,'engine-stage');await fsp.rm(stage,{force:true,recursive:true});await extractEngine(archive,stage);
   await fsp.rm(engineDir,{force:true,recursive:true});await fsp.rename(stage,engineDir);
   progress={running:true,status:'model',completed:ENGINE.bytes,total:ENGINE.bytes+MODEL.bytes};
   await verifiedDownload(MODEL,path.join(modelsDir,MODEL.name),{signal:controller.signal,fetchImpl,onProgress:(n)=>{progress={running:true,status:'model',completed:ENGINE.bytes+n,total:ENGINE.bytes+MODEL.bytes};}});
   const previous=await records();await saveRecords([{id:MODEL.id,file:MODEL.name,name:MODEL.label,size:MODEL.bytes,sha256:MODEL.sha256},...previous.filter(m=>m.id!==MODEL.id)]);
   progress={running:false,status:'ready',completed:ENGINE.bytes+MODEL.bytes,total:ENGINE.bytes+MODEL.bytes};
  }catch(e){lastError=controller.signal.aborted?'LOCAL_CANCELLED':e.code==='ENOSPC'?'AYA_DISK_FULL':e.message||'AYA_INSTALL_FAILED';progress={...progress,running:false,status:controller.signal.aborted?'cancelled':'failed'};}finally{install=null;}})();return {ok:true};
 }
 function cancelInstall(owner){if(install?.owner===owner)install.controller.abort();return {ok:true};}
 async function importModel(file){
  if(install||startPromise||child)return {ok:false,error:'LOCAL_BUSY'};
  try{const stat=await fsp.stat(file);if(!stat.isFile()||stat.size<1024||stat.size>12*1024**3||!file.toLowerCase().endsWith('.gguf'))throw Error('AYA_GGUF_INVALID');
   const handle=await fsp.open(file,'r'),magic=Buffer.alloc(8);try{await handle.read(magic,0,8,0);}finally{await handle.close();}
   if(magic.toString('ascii',0,4)!=='GGUF'||![2,3].includes(magic.readUInt32LE(4)))throw Error('AYA_GGUF_INVALID');
   const sha=await hashFile(file),id='aya-local:'+sha.slice(0,32),name=path.basename(file).slice(0,160),target=sha+'.gguf';
   await fsp.mkdir(modelsDir,{recursive:true});if(path.resolve(file)!==path.join(modelsDir,target)){const partial=path.join(modelsDir,target+'.part');await fsp.copyFile(file,partial);if((await fsp.stat(partial)).size!==stat.size||await hashFile(partial)!==sha){await fsp.rm(partial,{force:true});throw Error('AYA_GGUF_INVALID');}await fsp.rename(partial,path.join(modelsDir,target));}
   const previous=await records();await saveRecords([{id,file:target,name,size:stat.size,sha256:sha},...previous.filter(m=>m.id!==id)].slice(0,16));return {ok:true};
  }catch(e){return {ok:false,error:e.code==='ENOSPC'?'AYA_DISK_FULL':e.message||'AYA_GGUF_INVALID'};}
 }
 function stop(){stopping=true;const previous=child;child=null;activeModel='';base='';key='';previous?.kill();}
 async function ensureStarted(model,signal){
  if(child&&activeModel===model&&base)return;
  if(startPromise){await startPromise;if(child&&activeModel===model&&base)return;}
  const task=(async()=>{
   const record=(await modelList()).find(m=>m.id===model);if(!record)throw Error('MODEL_MISSING');if(!fs.existsSync(binary()))throw Error('AYA_ENGINE_MISSING');
   stop();stopping=false;const token=crypto.randomBytes(32).toString('hex');
   const port=await new Promise((resolve,reject)=>{const socket=net.createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
   const origin='http://127.0.0.1:'+port,modelFile=path.join(modelsDir,record.file);
   const proc=spawnImpl(binary(),['-m',modelFile,'--host','127.0.0.1','--port',String(port),'--api-key',token,'--alias','aya-local','--ctx-size','8192','--parallel','1','--threads',String(Math.max(1,Math.min(8,(os.availableParallelism?.()||os.cpus().length)-1))),'--n-gpu-layers','0','--jinja','--no-webui','--no-context-shift'],{cwd:path.dirname(binary()),windowsHide:true,shell:false,stdio:['ignore','ignore','pipe']});
   child=proc;let bootError=false;proc.once('error',()=>{bootError=true;});proc.once('exit',()=>{if(child===proc){child=null;base='';activeModel='';key='';}});proc.stderr?.on('data',()=>{});
   const deadline=Date.now()+120000;
   while(Date.now()<deadline){if(signal?.aborted){stop();throw signal.reason;}if(stopping||bootError||child!==proc)throw Error('AYA_ENGINE_START_FAILED');
    try{const r=await fetchImpl(origin+'/v1/models',{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(1500)])});if(r.ok){const v=await r.json();if(v.data?.some(m=>m.id==='aya-local')){base=origin;key=token;activeModel=model;return;}}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
   }
   stop();throw Error('LOCAL_TIMEOUT');
  })();startPromise=task;try{await task;}finally{if(startPromise===task)startPromise=null;}
 }
 async function chat({model,messages,options,responseSchema,signal,onToken=()=>{},onContext=()=>{}}){
  await ensureStarted(model,signal);
  // b9380 passes the response schema to its chat template as well as its grammar.
  // Budget the exact same template settings that the completion will receive.
  const templateOptions={chat_template_kwargs:{enable_thinking:false},...(responseSchema?{response_format:{type:'json_object',schema:responseSchema}}:{})};
  // Count with the selected model's actual template/tokenizer before reserving output space.
  async function localJson(endpoint,body){signal?.throwIfAborted();const r=await fetchImpl(base+endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},redirect:'error',signal,body:JSON.stringify(body)});if(!r.ok)throw Error('LOCAL_REQUEST_FAILED');return r.json();}
  messages=await fitMessagesToBudget(messages,{maxTokens:options.maxTokens,countTokens:async candidate=>{
   const rendered=await localJson('/apply-template',{messages:candidate,add_generation_prompt:true,...templateOptions});
   if(typeof rendered.prompt!=='string')throw Error('LOCAL_REQUEST_FAILED');
   const encoded=await localJson('/tokenize',{content:rendered.prompt,add_special:true,parse_special:true});
   if(!Array.isArray(encoded.tokens))throw Error('LOCAL_REQUEST_FAILED');
   return encoded.tokens.length;
  }});
  signal?.throwIfAborted();
  onContext(messages);
  const started=Date.now();const response=await fetchImpl(base+'/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},redirect:'error',signal,body:JSON.stringify({model:'aya-local',messages,stream:true,stream_options:{include_usage:true},...templateOptions,temperature:responseSchema?Math.min(.2,options.creativity):options.creativity,max_tokens:options.maxTokens})});
  if(!response.ok||!response.body)throw Error('LOCAL_REQUEST_FAILED');
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',output='',done=false,tokens=0,finishReason='';
  function line(value){if(!value.startsWith('data:'))return;const data=value.slice(5).trim();if(!data)return;if(data==='[DONE]'){done=true;return;}const event=JSON.parse(data);if(event.error)throw Error('LOCAL_REQUEST_FAILED');if(Number.isSafeInteger(event.usage?.completion_tokens)&&event.usage.completion_tokens>=0)tokens=event.usage.completion_tokens;const chunk=event.choices?.[0]?.delta?.content;if(typeof chunk==='string'&&chunk){output+=chunk;if(output.length>64000)throw Error('LOCAL_RESPONSE_TOO_LARGE');onToken(output);}if(event.choices?.[0]?.finish_reason){finishReason=event.choices[0].finish_reason;done=true;}}
  try{while(true){signal?.throwIfAborted();const r=await reader.read();if(r.done)break;pending+=decoder.decode(r.value,{stream:true});if(pending.length>128000)throw Error('LOCAL_RESPONSE_TOO_LARGE');const lines=pending.split('\n');pending=lines.pop();for(const value of lines)line(value.trim());}if(pending.trim())line(pending.trim());}
  finally{await reader.cancel().catch(()=>{});}
  signal?.throwIfAborted();
  if(responseSchema&&finishReason!=='stop')throw Error('LOCAL_INVALID_PLAN');
  if(!done||!output.trim())throw Error('LOCAL_EMPTY_RESPONSE');return {output:output.trim(),metrics:{milliseconds:Date.now()-started,tokens}};
 }
 return {status,installAll,cancelInstall,importModel,chat,stop,dispose:()=>{install?.controller.abort();stop();},isBusy:()=>Boolean(install||startPromise)};
}
module.exports={createManagedAya,verifiedDownload,extractEngine,trustedResponse,ENGINE,MODEL};
