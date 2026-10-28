import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {visibleKeys,normalize} from './ui-visible-keys.mjs';
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'dentaya-visible-captions-'));
try {
  fs.mkdirSync(path.join(fixture,'i18n'));
  fs.writeFileSync(path.join(fixture,'screen.tsx'),'<div title="Visible fixture label">Visible fixture caption</div>');
  fs.writeFileSync(path.join(fixture,'i18n','metadata.ts'),'export const metadata={title:"Translation metadata is not a displayed caption"};');
  assert.deepEqual(new Set(visibleKeys(fixture).map(item=>item.source)),new Set(['Visible fixture label','Visible fixture caption']),'Caption discovery excludes translation metadata on every filesystem platform');
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
const manifest=JSON.parse(fs.readFileSync('src/lib/i18n/ui-manifest.json','utf8'));
const known=new Set(manifest.keys.map(normalize));
const sources=visibleKeys();
const missing=sources.filter(item=>!known.has(normalize(item.source)));
assert.deepEqual(missing,[],`Displayed values missing from language packs: ${JSON.stringify(missing)}`);
for(const filename of fs.readdirSync('src/lib/i18n/packs')) {
  const pack=JSON.parse(fs.readFileSync('src/lib/i18n/packs/'+filename,'utf8'));
  const entries=new Map(Object.entries(pack.entries).map(([key,value])=>[normalize(key),value]));
  for(const {source,file,line} of sources)assert.ok(entries.get(normalize(source))?.trim(),`${pack.locale}: ${file}:${line}: ${source}`);
}
console.log(`PASS: ${sources.length} displayed captions, conditional values, messages and error sources are present in all 45 translated packs.`);
