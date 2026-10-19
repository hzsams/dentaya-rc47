import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {LANGUAGES,EU_LOCALES,isLocale,languageInfo} from '../src/lib/i18n/locales';
import {translate,installLanguagePack,loadLanguagePack,getLanguageEntries,getLanguagePackCoverage} from '../src/lib/i18n';
import catalog from '../src/lib/i18n/catalog.json';
import manifest from '../src/lib/i18n/ui-manifest.json';
import bootstrap from '../src/lib/i18n/eu-bootstrap.json';
import packBootstrap from '../src/lib/i18n/pack-bootstrap.json';
assert.equal(LANGUAGES.length,46);assert.equal(new Set(LANGUAGES.map(l=>l.id)).size,46);assert.equal(EU_LOCALES.length,24);assert.equal(new Set(EU_LOCALES).size,24);for(const locale of EU_LOCALES)assert.ok(isLocale(locale));
const baseIds=['en','de','fr','es','it','pt','nl','pl','ro','ru','uk','ar','zh','ja','sv','da','el','cs','ko'] as const;
const baseKeys=fs.readFileSync('src/lib/i18n/catalog.tsv','utf8').trim().split('\n').map(row=>row.split('|')[0]);
const all=catalog as Record<string,Record<string,string>>;
for(const key of baseKeys)for(const id of baseIds){assert.ok(all[key][id]?.trim());assert.equal(translate(key,id),all[key][id]);}
const expected=new Set([...bootstrap.keys,...packBootstrap.keys]);
for(const id of Object.keys(bootstrap.values))for(const key of expected)assert.ok(all[key][id]?.trim(),`${id}: ${key}`);
for(const locale of LANGUAGES){assert.doesNotThrow(()=>new Intl.NumberFormat(locale.tag,{style:'currency',currency:'TRY'}).format(1234.56));assert.doesNotThrow(()=>new Intl.DateTimeFormat(locale.tag,{dateStyle:'long'}).format(new Date('2026-10-03T12:00:00Z')));}
assert.equal(translate('__proto__','en'),'__proto__');assert.equal(translate('constructor','en'),'constructor');assert.equal(isLocale('__proto__'),false);assert.equal(languageInfo('unknown').id,'tr');assert.equal(languageInfo('ar').dir,'rtl');assert.equal(translate('Hasta notu: kullanıcı metni','en'),'Hasta notu: kullanıcı metni');assert.equal(translate('+ Yeni Hasta','en'),'+ New patient');assert.equal(translate('KAYDET','de'),'Speichern');
assert.deepEqual(JSON.parse(fs.readFileSync('electron/aya/ui-manifest.json','utf8')),manifest);assert.equal(new Set(manifest.keys).size,manifest.keys.length);assert.ok(manifest.keys.length>4000);assert.ok(!manifest.keys.some(key=>/&(?:apos|quot|amp|lt|gt|nbsp);/.test(key)));assert.ok(manifest.keys.includes("DentAYA'yı adım adım kullan."));
for(const {id} of LANGUAGES){await loadLanguagePack(id);assert.deepEqual(getLanguagePackCoverage(id),{completed:manifest.keys.length,total:manifest.keys.length,ready:true});const actual=getLanguageEntries(id),included=id==='tr'?Object.fromEntries(manifest.keys.map(key=>[key,key])):JSON.parse(fs.readFileSync(`src/lib/i18n/packs/${id}.json`,'utf8')).entries;assert.deepEqual(actual,included);for(const source of manifest.keys)assert.equal(translate(source,id),included[source],`${id}: ${source}`);}
assert.ok(!translate('Crown Shell üretildi · 1,200 üçgen · QC uyarısı.','en').includes('QC uyarısı'));
assert.equal(translate('Merhaba, Kaydet','en'),'Hello, Kaydet');
const pattern=manifest.keys.find(key=>key.startsWith('Adres Google Maps üzerinde bulunamadı.'))!;
installLanguagePack('en',{[pattern]:'Address was not found on Google Maps.{0}',Kaydet:'Save $& exactly','PRIVATE USER STRING':'MUST NOT INSTALL'});
assert.equal(translate('Adres Google Maps üzerinde bulunamadı. $&','en'),'Address was not found on Google Maps. $&');assert.equal(translate('Kaydet','en'),'Save $& exactly');assert.equal(translate('PRIVATE USER STRING','en'),'PRIVATE USER STRING');
const keep=new Set(['html','body','head','meta','link','script','style','svg','path','circle','line','rect','polygon','polyline','ellipse','g','defs','linearGradient','radialGradient','stop','filter','feGaussianBlur','clipPath','mask','use']);
const files=fs.readdirSync('src/app',{recursive:true}).filter(f=>String(f).endsWith('.tsx')) as string[];let connected=0,uiFiles=0;
for(const file of files){if(file==='layout.tsx'||file.includes('rc29-preview'))continue;const s=fs.readFileSync(`src/app/${file}`,'utf8'),wired=/UiNode|useTranslation|UiLink|UiMessage/.test(s);if(wired)connected++;assert.ok(!/from\s*['"]next\/link['"]/.test(s),`${file}: untranslated Link`);const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let hasUi=false;const check=(n:ts.Node)=>{if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))&&ts.isIdentifier(n.tagName)){const tag=n.tagName.text;if(!keep.has(tag)&&(/^[a-z]/.test(tag)||['UiNode','UiLink','UiMessage'].includes(tag)))hasUi=true;assert.ok(!/^[a-z]/.test(tag)||keep.has(tag),`${file}: untranslated <${tag}>`);}ts.forEachChild(n,check);};check(ast);if(hasUi){uiFiles++;assert.ok(wired,`${file}: UI renderer is not connected to translation`);}}
assert.ok(uiFiles>0,'No UI renderer was checked');
console.log(`PASS: 46 complete locales / all 24 EU official locales; ${baseKeys.length} existing strings×19 translations, ${expected.size} bootstrap strings×11 new EU locales; ${manifest.keys.length} full-pack source keys; all ${uiFiles} UI renderers connected (${connected} files total, including runtimes). Templates/entities/unknown user text safe. All 45 translated catalogs are bundled; source Turkish included. Coverage does not claim native-language editorial approval.`);
