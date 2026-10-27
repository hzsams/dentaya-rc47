'use strict';
const {prepareContext,retainedReferences,guide}=require('./aya/core.cjs');
const {readAgentReply,normalizeHistory,fitMessagesToBudget,CONTEXT_MARKER}=require('./aya/agent.cjs');
const ORIGIN='http://127.0.0.1:11434';
const {LANGUAGES}=require('./aya/language-packs.cjs');
const DOWNLOAD_MODEL='qwen3:4b';
const SAFE_ERRORS=new Set(['INVALID_PROMPT','MODEL_MISSING','LOCAL_BUSY','LOCAL_CANCELLED','LOCAL_TIMEOUT','LOCAL_EMPTY_RESPONSE','LOCAL_INCOMPLETE_RESPONSE','LOCAL_INVALID_RESPONSE','LOCAL_INVALID_PLAN','LOCAL_REQUEST_FAILED','LOCAL_RESPONSE_TOO_LARGE','LOCAL_MODEL_REQUIRED','LOCAL_UNAVAILABLE','AYA_ENGINE_MISSING','AYA_ENGINE_LIBRARY','AYA_ENGINE_ARCHIVE','AYA_ENGINE_MEMORY','AYA_ENGINE_MODEL_LOAD','AYA_ENGINE_PERMISSION','AYA_ENGINE_PORT','AYA_ENGINE_START_FAILED','AYA_GGUF_INVALID','AYA_DISK_FULL','AYA_WINDOWS_REQUIRED']);
async function withSignal(promise,signal){
 let abort;
 try{signal.throwIfAborted();return await Promise.race([promise,new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();})]);}
 finally{if(abort)signal.removeEventListener('abort',abort);}
}
function createLocalAya({fetchImpl=fetch,managed}={}){
 let active=null,pull=null,progress={running:false,status:'',completed:0,total:0};
 async function json(path,{body,signal,timeout=6000}={}){
  const response=await fetchImpl(ORIGIN+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error(response.status===404?'MODEL_MISSING':'LOCAL_REQUEST_FAILED');
  const reader=response.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw Error('LOCAL_RESPONSE_TOO_LARGE');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{});}
 }
 async function streamChat(body,signal,onToken){
  const response=await fetchImpl(ORIGIN+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal});
  if(!response.ok)throw Error(response.status===404?'MODEL_MISSING':'LOCAL_REQUEST_FAILED');
  signal.throwIfAborted();
  if(!response.body)throw Error('LOCAL_INVALID_RESPONSE');
  const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
  let pending='',size=0,output='',completed=false,metrics;
  const cancel=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',cancel,{once:true});
  const line=value=>{
   if(!value.trim())return;
   if(value.length>128000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
   let data;try{data=JSON.parse(value);}catch{throw Error('LOCAL_INVALID_RESPONSE');}
   if(!data||typeof data!=='object'||Array.isArray(data)||completed)throw Error('LOCAL_INVALID_RESPONSE');
   if(data.error)throw Error('LOCAL_REQUEST_FAILED');
   if(typeof data.done!=='boolean'||!data.message||typeof data.message!=='object'||Array.isArray(data.message))throw Error('LOCAL_INVALID_RESPONSE');
   if(data.message.content!==undefined&&typeof data.message.content!=='string')throw Error('LOCAL_INVALID_RESPONSE');
   const content=data.message.content??'';
   if(output.length+content.length>64000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
   output+=content;
   // Ollama thinking/tool fields are never a conversational answer or an action.
   if(content){signal.throwIfAborted();onToken(output);}
   if(data.done){completed=true;metrics={milliseconds:Math.round((Number(data.total_duration)||0)/1e6),tokens:Math.max(0,Number(data.eval_count)||0)};}
  };
  try{
   while(true){
    signal.throwIfAborted();
    const {done,value}=await reader.read();signal.throwIfAborted();
    if(done){try{pending+=decoder.decode();}catch{throw Error('LOCAL_INVALID_RESPONSE');}if(pending)line(pending);break;}
    size+=value.byteLength;if(size>2_000_000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
    try{pending+=decoder.decode(value,{stream:true});}catch{throw Error('LOCAL_INVALID_RESPONSE');}
    let newline;
    while((newline=pending.indexOf('\n'))>=0){const current=pending.slice(0,newline);pending=pending.slice(newline+1);line(current);}
    if(pending.length>128000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
    // A valid completion is sufficient; do not wait for a server to close its socket.
    if(completed){if(pending.trim())throw Error('LOCAL_INVALID_RESPONSE');break;}
   }
   if(!completed)throw Error('LOCAL_INCOMPLETE_RESPONSE');
   if(!output.trim())throw Error('LOCAL_EMPTY_RESPONSE');
   return {output:output.trim(),metrics};
  }finally{signal.removeEventListener('abort',cancel);void reader.cancel().catch(()=>{});}
 }
 function isLocal(m){return m&&typeof m.name==='string'&&m.name.length<=120&&m.size>0&&m.details?.format==='gguf'&&!m.remote_model&&!m.remote_host&&!/(?:^|[-:])cloud(?:$|[-:])/i.test(m.name)&&!(managed&&m.name.startsWith('aya-local:'));}
 async function models(timeout=6000){const data=await json('/api/tags',{timeout});return (Array.isArray(data.models)?data.models:[]).filter(isLocal).map(m=>({name:m.name,size:m.size}));}
 async function status(){
  if(managed){
   const local=await managed.status();let ollama=[],ollamaOnline=false;
   // An incomplete managed installation must not hide an existing local Ollama.
   // Keep this read-only probe short; inference still validates its selected runtime.
   try{ollama=await models(1500);ollamaOnline=true;}catch{}
   const available=local.installed?local.models:[];
   const combined=[...new Map([...available,...ollama].map(model=>[model.name,model])).values()];
   const hasRuntime=Boolean(local.installed||ollamaOnline),busy=Boolean(active||pull||local.progress.running||managed.isBusy?.());
   return {ok:hasRuntime&&!busy,models:combined,managed:local,progress:local.progress,ollama:{online:ollamaOnline,progress:{...progress}},...(busy?{error:'LOCAL_BUSY'}:!hasRuntime?{error:'AYA_ENGINE_MISSING'}:{})};
  }
  try{const available=await models(),busy=Boolean(active||pull);return {ok:!busy,models:available,progress:{...progress},ollama:{online:true,progress:{...progress}},...(busy?{error:'LOCAL_BUSY'}:{})};}catch{return {ok:false,models:[],error:'LOCAL_RUNTIME_MISSING',progress:{...progress},ollama:{online:false,progress:{...progress}}};}
 }
 async function chat(input,owner,translate=s=>s,onToken=()=>{}){
  if(active||pull||managed?.isBusy())return {ok:false,error:'LOCAL_BUSY'};
  if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>8000||typeof input.model!=='string'||!input.model.trim()||input.model.length>120)return {ok:false,error:'INVALID_PROMPT'};
  const memoryTask=input.task==='memory';
  if(input.task!==undefined&&!memoryTask||memoryTask&&(input.agent!==true||typeof input.assistantReply!=='string'||!input.assistantReply.trim()||input.assistantReply.length>12000))return {ok:false,error:'INVALID_PROMPT'};
  // Memory extraction cannot execute CAD or draw new facts from retrieval/history.
  if(memoryTask)input={task:'memory',agent:true,prompt:input.prompt,model:input.model,locale:input.locale,workingMemory:input.workingMemory,assistantReply:input.assistantReply.length>2400?input.assistantReply.slice(0,1500)+'\n[assistant reply shortened]\n'+input.assistantReply.slice(-850):input.assistantReply};
  const controller=new AbortController();active={owner,controller};
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(memoryTask?60000:180000)]);
  try{
   const task=(async()=>{
   const prepared=prepareContext(input,translate),language=Object.hasOwn(LANGUAGES,input.locale)?LANGUAGES[input.locale]:LANGUAGES.tr;
   const history=normalizeHistory(input.history,input);
   const instructions='Reply in '+language+'. Base model: Qwen/user-selected. '+prepared.instructions;
   const messages=[{role:'system',content:instructions},{role:'user',content:CONTEXT_MARKER+JSON.stringify(prepared.context)},...history,{role:'user',content:input.prompt.trim()}];
   let references=prepared.references;
   const finish=result=>{signal.throwIfAborted();return {ok:true,...result,...(prepared.agent?readAgentReply(result.output,input):{}),model:input.model,references};};
   // Structured replies are displayed after validation, never streamed as executable JSON.
   if(managed&&input.model.startsWith('aya-local:')){
    const result=await managed.chat({model:input.model,options:prepared.options,responseSchema:prepared.agent?.schema,signal,onToken:prepared.agent?()=>{}:value=>{if(!signal.aborted)onToken(value);},onContext:budgeted=>{references=retainedReferences(prepared.references,budgeted);},messages});
    return finish(result);
   }
   if(!(await models()).some(m=>m.name===input.model))throw Error('MODEL_MISSING');
   signal.throwIfAborted();
   const info=await json('/api/show',{body:{model:input.model},signal});
   if(info.remote_model||info.remote_host||(Array.isArray(info.capabilities)&&!info.capabilities.includes('completion')))throw Error('LOCAL_MODEL_REQUIRED');
   // Ollama does not expose the selected model tokenizer here. UTF-8 bytes plus per-message
   // overhead give a conservative bound, rather than silently allowing its sliding window
   // to discard the user's initial task or the current CAD evidence.
   const budgeted=await fitMessagesToBudget(messages,{maxTokens:prepared.options.maxTokens,countTokens:items=>items.reduce((n,m)=>n+new TextEncoder().encode(m.content).length+16,0)});
   references=retainedReferences(prepared.references,budgeted);
   signal.throwIfAborted();
   const body={model:input.model,stream:!prepared.agent,think:false,...(prepared.agent?{format:prepared.agent.schema}:{}),messages:budgeted,options:{num_ctx:8192,num_predict:prepared.options.maxTokens,temperature:prepared.agent?.cad?Math.min(.2,prepared.options.creativity):prepared.options.creativity},keep_alive:'5m'};
   if(!prepared.agent)return finish(await streamChat(body,signal,onToken));
   const data=await json('/api/chat',{body,signal,timeout:memoryTask?60000:180000});
   if(prepared.agent&&data.done_reason==='length')throw Error('LOCAL_INVALID_PLAN');
   if(data.done!==true||typeof data.message?.content!=='string'||!data.message.content.trim())throw Error('LOCAL_EMPTY_RESPONSE');
   if(data.message.content.length>64000)throw Error('LOCAL_RESPONSE_TOO_LARGE');
   return finish({output:data.message.content.trim(),metrics:{milliseconds:Math.round((Number(data.total_duration)||0)/1e6),tokens:Math.max(0,Number(data.eval_count)||0)}});
   })();
   let abort;
   try{return await Promise.race([task,new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();})]);}
   finally{signal.removeEventListener('abort',abort);}
  }catch(error){return {ok:false,error:error?.name==='AbortError'?'LOCAL_CANCELLED':error?.name==='TimeoutError'?'LOCAL_TIMEOUT':SAFE_ERRORS.has(error?.message)?error.message:'LOCAL_UNAVAILABLE'};}finally{if(active?.controller===controller)active=null;}
 }
 function cancel(owner){if(active?.owner===owner)active.controller.abort();return {ok:true};}
 function startDownload(owner){
  if(pull||active||managed?.isBusy())return {ok:false,error:'LOCAL_BUSY'};
  const controller=new AbortController();pull={owner,controller};progress={running:true,status:'Model indiriliyor…',completed:0,total:0};
  void(async()=>{let reader,idleTimer;const idle=new AbortController(),signal=AbortSignal.any([controller.signal,idle.signal,AbortSignal.timeout(3600000)]);
  const touch=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>idle.abort(new DOMException('Download inactive','TimeoutError')),45000);};
  const abortRead=()=>{void reader?.cancel().catch(()=>{});};
  signal.addEventListener('abort',abortRead,{once:true});
  try{
   touch();
   const r=await withSignal(fetchImpl(ORIGIN+'/api/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:DOWNLOAD_MODEL,stream:true}),redirect:'error',signal}),signal);
   signal.throwIfAborted();
   if(!r.ok||!r.body)throw Error('DOWNLOAD_FAILED');reader=r.body.getReader();const decoder=new TextDecoder('utf-8',{fatal:true});let pending='',size=0,completedPull=false;
   const line=value=>{if(!value.trim())return;if(value.length>64000)throw Error('DOWNLOAD_FAILED');const v=JSON.parse(value);if(!v||typeof v!=='object'||Array.isArray(v)||v.error||completedPull)throw Error('DOWNLOAD_FAILED');const numeric=n=>Number.isSafeInteger(n)&&n>=0?n:0,total=numeric(v.total),completed=Math.min(numeric(v.completed),total||Number.MAX_SAFE_INTEGER);completedPull=v.status==='success';progress={running:true,status:v.status==='success'?'Model kaydı doğrulanıyor…':v.status==='verifying sha256 digest'?'Model bütünlüğü doğrulanıyor…':v.status==='writing manifest'?'Model kaydı hazırlanıyor…':v.status==='pulling manifest'?'Model bilgileri alınıyor…':'Model indiriliyor…',completed,total};};
   while(true){signal.throwIfAborted();const {done,value}=await withSignal(reader.read(),signal);signal.throwIfAborted();if(done){pending+=decoder.decode();if(pending)line(pending);break;}touch();size+=value.byteLength;if(size>4_000_000)throw Error('DOWNLOAD_FAILED');pending+=decoder.decode(value,{stream:true});let newline;while((newline=pending.indexOf('\n'))>=0){const value=pending.slice(0,newline);pending=pending.slice(newline+1);line(value);}if(pending.length>64000)throw Error('DOWNLOAD_FAILED');if(completedPull){if(pending.trim())throw Error('DOWNLOAD_FAILED');break;}}
   signal.throwIfAborted();
   if(!completedPull||!(await withSignal(models(),signal)).some(m=>m.name===DOWNLOAD_MODEL))throw Error('MODEL_MISSING');signal.throwIfAborted();progress={running:false,status:'Model indirildi. Model listesini yenileyip seçin.',completed:1,total:1};
  }catch{progress={running:false,status:controller.signal.aborted?'İndirme durduruldu.':signal.reason?.name==='TimeoutError'?'İndirme zaman aşımına uğradı. Bağlantıyı kontrol edip yeniden deneyin.':'İndirme tamamlanamadı. Ollama ve internet bağlantısını kontrol edin.',completed:0,total:0};}finally{clearTimeout(idleTimer);signal.removeEventListener('abort',abortRead);void reader?.cancel().catch(()=>{});pull=null;}})();
  return {ok:true};
 }
 function cancelDownload(owner){if(pull&&pull.owner!==owner)return {ok:false,error:'LOCAL_BUSY'};if(pull)pull.controller.abort();return {ok:true};}
 return {status,chat,guide,cancel,startDownload,cancelDownload,isBusy:()=>Boolean(active||pull||managed?.isBusy())};
}
module.exports={createLocalAya,DOWNLOAD_MODEL};
