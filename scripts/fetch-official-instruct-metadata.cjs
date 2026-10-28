'use strict';
// Metadata only. Community quantizations are identified by their actual publisher.
const fs=require('node:fs/promises');
const path=require('node:path');
const repos=['Qwen/Qwen3.5-4B','Qwen/Qwen3.5-4B-GGUF','unsloth/Qwen3.5-4B-GGUF','bartowski/Qwen_Qwen3.5-4B-GGUF'];
async function officialJSON(url){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.hostname!=='huggingface.co')throw Error('METADATA_HOST');
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('METADATA_HTTP_'+response.status);
 return response.json();
}
async function inspect(repo){
 const result={repository:repo,publisher:repo.split('/')[0],discoveryURL:'https://huggingface.co/api/models/'+repo+'?blobs=true'};
 try{
  const discovery=await officialJSON(result.discoveryURL);
  if(discovery.id!==repo||!/^[a-f0-9]{40}$/.test(discovery.sha))throw Error('METADATA_IDENTITY');
  result.sourceURL='https://huggingface.co/api/models/'+repo+'/revision/'+discovery.sha+'?blobs=true';
  const pinned=await officialJSON(result.sourceURL);
  if(pinned.id!==repo||pinned.sha!==discovery.sha)throw Error('METADATA_REVISION');
  Object.assign(result,{status:'verified-publisher-metadata',revision:pinned.sha,license:pinned.cardData?.license,baseModel:pinned.cardData?.base_model,modelType:pinned.config?.model_type,files:(pinned.siblings??[]).filter(file=>/q4_k_m\.gguf$/i.test(file.rfilename)).map(file=>({name:file.rfilename,bytes:file.lfs?.size,sha256:file.lfs?.sha256??file.lfs?.oid,url:'https://huggingface.co/'+repo+'/resolve/'+pinned.sha+'/'+file.rfilename}))});
  if(result.files.some(file=>!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.bytes)))throw Error('METADATA_LFS');
 }catch(error){result.status='failed';result.error=/^[A-Z0-9_]+$/.test(error.message)?error.message:'METADATA_UNAVAILABLE';}
 return result;
}
async function main(){
 const output=path.resolve('native-validation-evidence/qwen35-discovery/candidates-metadata.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 const result={purpose:'instruction-model-publisher-pin-discovery',nativeInferenceAttempted:false,nativeAcceptance:null,queriedAt:new Date().toISOString(),testedCommit:process.env.GITHUB_SHA??null,runId:process.env.GITHUB_RUN_ID??null,candidates:await Promise.all(repos.map(inspect))};
 try{result.officialQwenModelNames=(await officialJSON('https://huggingface.co/api/models?author=Qwen&search=Qwen3-4B&limit=30')).map(model=>model.id);}catch(error){result.officialQwenModelListingError=/^[A-Z0-9_]+$/.test(error.message)?error.message:'METADATA_UNAVAILABLE';}
 await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
main().catch(()=>{console.error('METADATA_WRITE_FAILED');process.exitCode=1;});
