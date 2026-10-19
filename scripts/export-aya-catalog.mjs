import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {stats,sources,entries}=require('../electron/aya/qa-catalog.cjs');
const data={release:require('../package.json').version,...stats,counting:'200 topics × 4 purposes + 52 FDI codes × 4 factual questions; spelling variants not counted',scope:'Turkish educational/application catalogue, not model training or clinical approval',sources,entries};
const releaseNumber=data.release.match(/-rc\.(\d+)$/)?.[1];
if(!releaseNumber)throw Error('INVALID_RELEASE');
const file=new URL(`../RC${releaseNumber}_AYA_1008_SORU_CEVAP.json`,import.meta.url);
const content=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==content)throw Error('CATALOGUE_EXPORT_STALE');console.log('PASS: exported question catalogue matches the running source.');}
else{fs.writeFileSync(file,content);console.log('Exported '+entries.length+' Q&A records.');}
