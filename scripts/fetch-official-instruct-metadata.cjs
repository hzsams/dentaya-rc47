'use strict';
// Metadata only: no weights are downloaded and no inference acceptance is claimed.
const fs=require('node:fs/promises');
const path=require('node:path');
const repo='Qwen/Qwen3-4B-Instruct-2507-GGUF';
async function officialJSON(url){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.hostname!=='huggingface.co')throw Error('OFFICIAL_METADATA_HOST');
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('OFFICIAL_METADATA_HTTP_'+response.status);
 return response.json();
}
async function main(){
 const output=path.resolve('native-validation-evidence/instruct-2507-discovery/official-metadata.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 const result={purpose:'official-model-pin-discovery',nativeInferenceAttempted:false,nativeAcceptance:null,repository:repo,queriedAt:new Date().toISOString(),testedCommit:process.env.GITHUB_SHA??null,runId:process.env.GITHUB_RUN_ID??null};
 try{
  const discoveryURL='https://huggingface.co/api/models/'+repo+'?blobs=true';
  const discovery=await officialJSON(discoveryURL);
  if(discovery.id!==repo||!/^[a-f0-9]{40}$/.test(discovery.sha))throw Error('OFFICIAL_METADATA_IDENTITY');
  const sourceURL='https://huggingface.co/api/models/'+repo+'/revision/'+discovery.sha+'?blobs=true';
  const pinned=await officialJSON(sourceURL);
  if(pinned.id!==repo||pinned.sha!==discovery.sha)throw Error('OFFICIAL_METADATA_REVISION');
  const matches=pinned.siblings?.filter(file=>/q4_k_m\.gguf$/i.test(file.rfilename));
  if(matches?.length!==1)throw Error('OFFICIAL_METADATA_FILE_AMBIGUOUS');
  const file=matches[0],sha256=file.lfs?.sha256??file.lfs?.oid;
  if(!/^[a-f0-9]{64}$/.test(sha256)||!Number.isSafeInteger(file.lfs?.size)||file.lfs.size<1000000000)throw Error('OFFICIAL_METADATA_LFS');
  const license=pinned.cardData?.license;
  if(typeof license!=='string'||!license)throw Error('OFFICIAL_METADATA_LICENSE');
  Object.assign(result,{status:'verified-official-metadata',revision:pinned.sha,license,sourceURL,discoveryURL,file:{name:file.rfilename,bytes:file.lfs.size,sha256,url:'https://huggingface.co/'+repo+'/resolve/'+pinned.sha+'/'+file.rfilename}});
 }catch(error){result.status='failed';result.error=/^[A-Z][A-Z0-9_]{1,95}$/.test(error.message)?error.message:'OFFICIAL_METADATA_UNAVAILABLE';process.exitCode=1;}
 await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}
main().catch(()=>{console.error('OFFICIAL_METADATA_WRITE_FAILED');process.exitCode=1;});
