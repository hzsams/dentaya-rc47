'use strict';
// Optional real local model evaluation, using installed models only. Downloads nothing.
const fs=require('node:fs/promises'),path=require('node:path');
const {parseArgs}=require('node:util');
const {createLocalAya}=require('../electron/aya-local.cjs');
const {createManagedAya}=require('../electron/aya/managed-runtime.cjs');
const {createAyaAcceptanceRunner}=require('../electron/aya/acceptance.cjs');
const {values}=parseArgs({options:{model:{type:'string'},directory:{type:'string'},report:{type:'string'},locale:{type:'string',default:'tr'},help:{type:'boolean'}}});
if(values.help){console.log('node scripts/evaluate-aya-local.cjs --model qwen3:4b [--report /path/report.json]\nFor an existing managed installation add --directory /path/to/DentAYA-Desktop; omit --model to select its first installed model. Uses the actual local bridge for 9 isolated synthetic conversation/memory/CAD-fixture calls. No notebook, saved chat, account or CAD action is used. No model download. Inspect every reply; contract checks do not certify semantic or clinical quality.');process.exit(0);}
let managed,runner;
const interrupt=()=>runner?.cancel();process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
(async()=>{
 if(values.directory)managed=createManagedAya({directory:path.resolve(values.directory)});
 const api=createLocalAya({managed}),status=await api.status(),model=values.model||status.models[0]?.name;
 if(!model||!status.models.some(item=>item.name===model))throw Error('MODEL_MISSING');
 if(!status.ok)throw Error(status.error==='LOCAL_BUSY'?'LOCAL_BUSY':'LOCAL_UNAVAILABLE');
 runner=createAyaAcceptanceRunner({chat:input=>api.chat(input,'isolated-cli-check'),cancel:()=>api.cancel('isolated-cli-check')});
 const report=await runner.run({model,locale:values.locale,provenance:model.startsWith('aya-local:')?'managed-local':'ollama-local'});
 await runner.whenIdle();
 if(values.report){const destination=path.resolve(values.report);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
 if(report.status!=='completed'||report.steps.some(step=>step.checks.some(check=>!check.pass)))process.exitCode=1;
})().catch(error=>{console.error(['MODEL_MISSING','LOCAL_BUSY','LOCAL_UNAVAILABLE'].includes(error?.message)?error.message:'LOCAL_EVALUATION_FAILED');process.exitCode=1;}).finally(()=>{managed?.dispose();process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);});
