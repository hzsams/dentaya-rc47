import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import {visibleKeys,normalize} from './ui-visible-keys.mjs';
const manifest=JSON.parse(fs.readFileSync('src/lib/i18n/ui-manifest.json','utf8'));
const sources=new Map(manifest.keys.map(key=>[normalize(key),key]));
const add=value=>{value=value.trim().replace(/\s+/g,' ');if(value&&!sources.has(normalize(value)))sources.set(normalize(value),value);};
for(const {source} of visibleKeys())add(source);
for(const key of Object.keys(JSON.parse(fs.readFileSync('src/lib/i18n/reviewed/en.json','utf8'))))add(key);
for(const file of ['src/lib/system-messages.ts','src/lib/display-labels.ts','src/lib/validation-center.ts']) {
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function inspect(node){if(ts.isStringLiteral(node)&&(/[ÇĞıİÖŞÜçğıöşü]/.test(node.text)||/^[A-Z][a-z][\p{L}\s.,?!:;()'\-]*$/u.test(node.text)))add(node.text);ts.forEachChild(node,inspect);}
  inspect(ast);
}
const keys=[...sources.values()].sort();
const next={...manifest,keys,hash:crypto.createHash('sha256').update(JSON.stringify(keys)).digest('hex')};
for(const file of ['src/lib/i18n/ui-manifest.json','electron/aya/ui-manifest.json'])fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({sourceKeys:keys.length,added:keys.length-manifest.keys.length,hash:next.hash}));
