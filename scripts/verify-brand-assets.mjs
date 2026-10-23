import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const {LOGOS} = require('../electron/desktop-brand.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFile(path.join(root, file));
const identity = JSON.parse(await read('public/brand/identity.json'));
const catalog = JSON.parse(await read('electron/brand-catalog.json'));
const component = String(await read('src/app/BrandLogo.tsx'));
const adapter = String(await read('src/lib/brand-catalog.ts'));
assert.ok(component.includes('LOGO_OPTIONS = BRAND_LOGOS.map'));
assert.ok(adapter.includes('../../electron/brand-catalog.json'));
const uiIds = catalog.logos.map(logo => logo.id);
assert.equal(identity.wordmark, 'DENTAYA');
assert.equal(identity.version, catalog.version);
assert.equal(identity.version, 'premium-4');
assert.equal(identity.logos.length, 120);
assert.equal(new Set(identity.logos.map(logo => logo.id)).size, 120);
assert.deepEqual(uiIds, identity.logos.map(logo => logo.id));
assert.deepEqual(LOGOS, identity.logos.map(logo => logo.file));
assert.ok(adapter.includes('BRAND_ASSET_VERSION = catalog.version'));
assert.deepEqual(uiIds, Array.from({length:120},(_,index)=>String(index+1).padStart(2,'0')));
// Saved identities remain exact assets, including rasterized Windows exports.
// Aggregate hashes use a pre-expansion RC55 snapshot, not regenerated expectations.
const baseline=JSON.parse(await read('scripts/brand-source/rc55-stable-logos.json'));
const prior=catalog.logos.filter(logo=>baseline.logoIds.includes(logo.id));
assert.deepEqual(prior.map(logo=>logo.id),baseline.logoIds);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(JSON.stringify(prior)),baseline.catalogEntriesSHA256,'The original 100 catalogue entries remain byte-equivalent');
const priorPaths=prior.flatMap(logo=>[...['','_light','_word','_word_light','_mono','_mono_white','_icon'].map(suffix=>`public/logos/${logo.file}${suffix}.svg`),`public/logos/${logo.file}_icon.png`,`electron/logos/${logo.file}_icon.ico`]).sort();
assert.equal(priorPaths.length,baseline.assetCount);
let assetDigests='';for(const file of priorPaths)assetDigests+=file+'\0'+digest(await read(file))+'\n';
assert.equal(digest(assetDigests),baseline.assetsSHA256,'The original 900 SVG/PNG/ICO files remain byte-identical');
const silhouettes = new Set();
let variants = 0, renderedIcons = 0;
for (const {id, file, material} of identity.logos) {
  assert.match(file, new RegExp(`^${id}_[a-z_]+$`));
  assert.ok(Object.hasOwn(identity.materials, material));
  for (const suffix of ['', '_light', '_word', '_word_light', '_mono', '_mono_white', '_icon']) {
    const source = String(await read(`public/logos/${file}${suffix}.svg`));
    assert.match(source, /<svg[^>]+role="img"[^>]+aria-label="DENTAYA"/);
    assert.doesNotMatch(source, /<script|<image|<foreignObject|<filter|<text|https?:\/\/(?!www\.w3\.org)/i);
    if (suffix !== '_icon') {
      assert.equal([...source.matchAll(/data-letter="([A-Z])"/g)].map(match => match[1]).join(''), 'DENTAYA');
    }
    if (suffix === '' || suffix === '_light' || suffix === '_icon') {
      assert.match(source, /data-depth="vector"/);
      assert.match(source, /data-bevel="machined"/);
      assert.match(source, /-bevel/);
      assert.match(source, /-shine/);
      assert.match(source, /-shadow/);
      assert.match(source, /<linearGradient/);
      const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      for (const match of source.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(match[1]), `Unresolved gradient in ${file}`);
      if (suffix === '') {
        // Compare actual contours rather than filenames, colors or gradient IDs.
        const contour = source.match(/data-depth="vector"[^>]*>.*?<path[^>]+ d="([^"]+)"/s)?.[1];
        assert.ok(contour, `${file} has no mark contour`);
        assert.ok(!silhouettes.has(contour), `${file} duplicates another mark`);
        silhouettes.add(contour);
      }
    } else if (suffix.startsWith('_mono')) assert.doesNotMatch(source, /<linearGradient|data-depth/);
    variants++;
  }
  const png = await sharp(await read(`public/logos/${file}_icon.png`)).metadata();
  assert.equal(png.width, 512); assert.equal(png.height, 512);
  for (const size of [16, 32, 64]) {
    const {data, info} = await sharp(await read(`public/logos/${file}_icon.svg`)).resize(size, size).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.channels, 4);
    assert.equal(data[3], 0, `${file}: tile corner should stay transparent at ${size}px`);
    assert.ok(data[(Math.floor(size/2)*size+Math.floor(size/2))*4+3] > 200);
    const luma = [];
    for (let pixel=0;pixel<data.length;pixel+=4)if(data[pixel+3]>200)luma.push((data[pixel]+data[pixel+1]+data[pixel+2])/3);
    assert.ok(Math.max(...luma)-Math.min(...luma)>60, `${file}: mark needs visible contrast at ${size}px`);
    renderedIcons++;
  }
  const ico = await read(`electron/logos/${file}_icon.ico`);
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1);
  const sizes = Array.from({length:ico.readUInt16LE(4)}, (_, index) => ico[6+index*16] || 256);
  assert.deepEqual(sizes, [16, 24, 32, 48, 64, 128, 256]);
  for (const [index,size] of sizes.entries()) {
    const offset=ico.readUInt32LE(6+index*16+12), length=ico.readUInt32LE(6+index*16+8);
    assert.ok(offset+length<=ico.length);
    const frame=await sharp(ico.subarray(offset,offset+length)).metadata();
    assert.equal(frame.width,size);assert.equal(frame.height,size);
  }
}
assert.equal(silhouettes.size, 120);
assert.deepEqual(await read('electron/dentaya.ico'), await read('electron/logos/01_dental_form_icon.ico'));
assert.deepEqual(await read('public/icon-512.png'), await read('public/logos/01_dental_form_icon.png'));
const artwork = await sharp(await read('public/brand/DentAYA_Premium_Atelier.webp')).metadata();
assert.equal(artwork.width, 1672); assert.equal(artwork.height, 941);
const picker = String(await read('src/app/LogoPicker.tsx'));
assert.ok(picker.includes('/brand/DentAYA_Premium_Atelier.webp'));
console.log(JSON.stringify({pass:true,uniqueMarks:silhouettes.size,svgVariants:variants,smallIconRenders:renderedIcons,windowsIcoSizes:7,preservedPriorMarks:prior.length,preservedPriorAssetFiles:priorPaths.length,priorAssetsByteIdentical:true,outlinedWordmark:'DENTAYA',uiAndDesktopAllowlistMatch:true,shippedAtelierArtwork:true}));
