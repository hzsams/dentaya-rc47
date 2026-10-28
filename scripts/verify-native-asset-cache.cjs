'use strict';
// Diagnostic CI cache only. Restored bytes never bypass the production pin gate.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {ENGINE,MODEL}=require('../electron/aya/managed-runtime.cjs');
async function verifyPinnedAssetCache(directory,specs=[{...ENGINE,file:'engine-'+ENGINE.version+'.zip'},{...MODEL,file:path.join('models',MODEL.name)}]){
 if(typeof directory!=='string'||!directory)throw Error('CACHE_DIRECTORY_REQUIRED');
 for(const spec of specs){
  const file=path.join(directory,'aya-local',spec.file);
  if((await fs.stat(file)).size!==spec.bytes)throw Error('CACHE_SIZE_MISMATCH');
  const hash=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(file))hash.update(chunk);
  if(hash.digest('hex')!==spec.sha256)throw Error('CACHE_HASH_MISMATCH');
 }
 return true;
}
module.exports={verifyPinnedAssetCache};
if(require.main===module)verifyPinnedAssetCache(process.env.AYA_NATIVE_ASSET_CACHE).then(async()=>{
 console.log('Pinned engine archive and model cache size/SHA-256 verified.');
 if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,'verified=true\n');
}).catch(()=>{console.error('Pinned asset cache is absent or invalid; it must not be saved.');process.exitCode=1;});
