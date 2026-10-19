import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{LANGUAGES,valid}=require('../electron/aya/language-packs.cjs');
const manifest=JSON.parse(fs.readFileSync('src/lib/i18n/ui-manifest.json','utf8'));
assert.equal(crypto.createHash('sha256').update(JSON.stringify(manifest.keys)).digest('hex'),manifest.hash);
assert.deepEqual(JSON.parse(fs.readFileSync('electron/aya/ui-manifest.json','utf8')),manifest);
assert.deepEqual(JSON.parse(fs.readFileSync('electron/aya/number-words.json','utf8')),JSON.parse(fs.readFileSync('src/lib/i18n/number-words.json','utf8')));
const coreTokens=text=>text.match(/(?<![A-Za-z])(?:DentAYA|AYA|FDI|mm|µm)(?![A-Za-z])/g)||[];
const reports=[];
for(const locale of Object.keys(LANGUAGES).filter(locale=>locale!=='tr')){
 const filename=`src/lib/i18n/packs/${locale}.json`,pack=JSON.parse(fs.readFileSync(filename,'utf8'));
 assert.equal(pack.locale,locale);assert.equal(pack.hash,manifest.hash);assert.equal(Object.keys(pack.entries).length,manifest.keys.length);
 assert.deepEqual(JSON.parse(fs.readFileSync(`electron/aya/packs/${locale}.json`,'utf8')),pack);
 for(const source of manifest.keys){assert.ok(valid(source,pack.entries[source]),`${locale}: invalid/missing ${source}`);const required=coreTokens(source),actual=coreTokens(pack.entries[source]);for(const token of new Set(required))assert.ok(actual.filter(t=>t===token).length>=required.filter(t=>t===token).length,`${locale}: missing ${token} in ${source}`);assert.ok(pack.entries[source].length<=Math.max(100,source.length*8),`${locale}: expanded text ${source}`);assert.ok(!/(.{6,50}?)\1{3}/u.test(pack.entries[source]),`${locale}: repeated output ${source}`);if(/\p{L}/u.test(source))assert.ok(/\p{L}/u.test(pack.entries[source]),`${locale}: missing text ${source}`);}
 reports.push({locale,completed:manifest.keys.length,total:manifest.keys.length});
}
assert.equal(reports.length,45);console.log(JSON.stringify({pass:true,locales:46,translatedLocales:45,sourceKeys:manifest.keys.length,translations:45*manifest.keys.length,hash:manifest.hash,packs:reports},null,2));
