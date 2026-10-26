import assert from 'node:assert/strict';
import { resolvePublicConnection } from '../src/lib/public-connection';
import { createLauncherRegistry } from '../src/lib/launcher-ownership';
import { needsOrganizationConnection } from '../src/lib/i18n/professional-shell';
import { filterModuleTree, isCurrentModule, MODULE_TREE, moduleAncestorIds, moduleDestinations, moduleFolderIds, normalizeModuleQuery, type ModuleNode } from '../src/lib/module-navigation';
import { moduleNavigationText } from '../src/lib/i18n/module-navigation';

for (const input of [{}, {url:'   ',publishableKey:'',anonKey:' '}]) {
  const config = resolvePublicConnection(input);
  assert.equal(config.isConfigured,false);assert.equal(config.status,'missing');
  assert.equal(config.clientUrl,'http://127.0.0.1:54321');assert.equal(config.keySource,null);
}
const fallback = resolvePublicConnection({url:' https://example.test ',publishableKey:'  ',anonKey:'test-anon'});
assert.equal(fallback.isConfigured,true);assert.equal(fallback.keySource,'anon');assert.equal(fallback.clientKey,'test-anon');
assert.equal(resolvePublicConnection({url:'https://example.test',publishableKey:'test-public',anonKey:'test-anon'}).clientKey,'test-public');
for (const url of ['invalid','javascript:alert(1)','https://user:password@example.test','https://example.test?token=x','https://example.test#fragment']) {
  const config=resolvePublicConnection({url,anonKey:'test-anon'});assert.equal(config.status,'invalid');assert.equal(config.isConfigured,false);assert.equal(config.clientKey,'dentaya-public-key-not-configured');
}
const registry=createLauncherRegistry();let changes=0;const unsubscribe=registry.subscribe(()=>changes++);
const releaseA=registry.register('a'),releaseB=registry.register('b');assert.equal(registry.owner(),'a');
releaseA();assert.equal(registry.owner(),'b','An already-mounted follower must take over');releaseA();assert.equal(changes,3);
releaseB();assert.equal(registry.owner(),null);unsubscribe();registry.register('c');assert.equal(changes,4);
assert.equal(needsOrganizationConnection('/ai'),false);assert.equal(needsOrganizationConnection('/training'),false);
assert.equal(needsOrganizationConnection('/cases'),true);assert.equal(needsOrganizationConnection('/ai-billing'),true);
const expectedDestinations = ['/workspace','/cases','/patients','/appointments','/ai','/scans','/scan-studio','/design','/cad-library','/training','/operations','/logistics','/community','/messages','/notifications','/clinic','/labs','/finance','/team','/settings','/pilot-flow','/pilot-check','/ops-health','/release-check'];
const destinations = moduleDestinations(MODULE_TREE);
assert.deepEqual(destinations.map(node => node.href).sort(), expectedDestinations.sort(), 'The folder menu preserves every existing module destination exactly once');
assert.equal(new Set(moduleFolderIds(MODULE_TREE)).size, moduleFolderIds(MODULE_TREE).length, 'Disclosure controls have unique folder identities');
assert.deepEqual(moduleAncestorIds(MODULE_TREE, '/operations'), ['management','management/work'], 'Work tracking belongs under management');
assert.deepEqual(moduleAncestorIds(MODULE_TREE, '/patients/synthetic-patient'), ['clinic','clinic/records'], 'Nested pages reveal their active path');
assert.deepEqual(moduleAncestorIds(MODULE_TREE, '/cad'), ['lab','lab/design'], 'The existing CAD alias reveals its design folder');
assert.equal(isCurrentModule('/cases-archive', '/cases'), false, 'Only complete path segments select a module');
const trCopy = moduleNavigationText('tr'), enCopy = moduleNavigationText('de');
const label = (node: ModuleNode) => node.kind === 'folder' ? trCopy.folders[node.label] : node.label;
const releaseMatch = filterModuleTree(MODULE_TREE, 'RC Kontrolü', label);
assert.deepEqual(moduleDestinations(releaseMatch).map(node => node.href), ['/release-check']);
assert.deepEqual(moduleFolderIds(releaseMatch), ['workspace','workspace/tools','workspace/tools/system'], 'A deeply nested result retains all matching parents');
assert.deepEqual(moduleDestinations(filterModuleTree(MODULE_TREE, 'is takibi', label)).map(node => node.href), ['/operations'], 'Turkish casing and unaccented typing find work tracking');
assert.equal(normalizeModuleQuery('  İŞ TAKİBİ  '), normalizeModuleQuery('iş takibi'));
assert.deepEqual(moduleDestinations(filterModuleTree(MODULE_TREE, 'İletişim', label)).map(node => node.href), ['/messages','/notifications','/community'], 'Folder search includes the destinations inside that folder');
assert.deepEqual(filterModuleTree(MODULE_TREE, 'no-such-module-rc58', label), [], 'Unmatched searches have no unrelated leaves');
assert.equal(filterModuleTree(MODULE_TREE, '  ', label), MODULE_TREE, 'Clearing search restores the complete catalog');
assert.equal(enCopy.folders.management, 'Management', 'New folder text has English fallback outside Turkish');
console.log('PASS: public connection, local tools, launcher ownership, preserved module destinations, active folder paths, and nested multilingual module search.');
