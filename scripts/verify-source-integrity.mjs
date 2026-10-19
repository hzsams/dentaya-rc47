import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'PAKET_BUTUNLUK.json'),'utf8'));
assert.equal(manifest.release,JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version);
for(const item of manifest.files){
 const target=path.resolve(root,item.path);
 assert.ok(target.startsWith(root)&&!path.isAbsolute(item.path),'Unsafe manifest path');
 const data=fs.readFileSync(target);assert.equal(data.length,item.size,item.path+' size');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),item.sha256,item.path+' checksum');
}
console.log('PASS: '+manifest.files.length+' source files match the release integrity manifest.');
