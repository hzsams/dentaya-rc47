import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const pkg=JSON.parse(readFileSync('package.json','utf8')),lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const release=readFileSync('src/lib/release.ts','utf8'),client=readFileSync('src/lib/supabase.ts','utf8'),installer=readFileSync('DENTAYA_GUNCELLE_DERLE.cmd','utf8');
assert.match(pkg.version,/^1\.0\.0-rc\.\d+$/);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
assert.ok(release.includes(`version: "${pkg.version}"`));assert.ok(client.includes(`dentaya-production-rc/${pkg.version}`));assert.ok(installer.includes(`DentAYA-Setup-${pkg.version}.exe`));
assert.deepEqual(readdirSync('.').filter(file=>file.endsWith('.cmd')),['DENTAYA_GUNCELLE_DERLE.cmd'],'The update package must contain one CMD entry point');
console.log('PASS: package, lockfile, runtime release, client identifier and installer agree; one CMD entry point.');
