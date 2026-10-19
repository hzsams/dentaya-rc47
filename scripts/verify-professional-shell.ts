import assert from 'node:assert/strict';
import { resolvePublicConnection } from '../src/lib/public-connection';
import { createLauncherRegistry } from '../src/lib/launcher-ownership';
import { needsOrganizationConnection } from '../src/lib/i18n/professional-shell';

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
console.log('PASS: empty/invalid public connection, anon fallback, no wrong-destination key, local tools, and launcher ownership handover.');
