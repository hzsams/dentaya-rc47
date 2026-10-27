import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {compareTrees, inside, openAsar, sha256, verifyAsarSource, verifySourceManifest, verifyWindowsArtifact} from './verify-windows-artifact.mjs';
import {CdpClient, desktopSmokeEnvironment, validateRouteSnapshot} from './smoke-windows-desktop.mjs';

const require = createRequire(import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dentaya-artifact-test-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const write = async (relative, value) => {const file = path.join(directory, relative); await fs.mkdir(path.dirname(file), {recursive: true}); await fs.writeFile(file, value); return file;};
  return {directory, write};
}

async function sourceFixture(t) {
  const f = await fixture(t);
  const pkg = {name: 'dentaya-production-rc', version: '1.0.0-rc.62', main: 'electron/main.cjs', dependencies: {next: '16.3.8'}};
  await f.write('source/electron/main.cjs', 'const electron = require("electron");\n');
  await f.write('source/electron/preload.cjs', 'contextBridge.exposeInMainWorld("dentayaDesktop", {});\n');
  await f.write('source/electron/aya/managed-runtime.cjs', 'exports.model = "pinned-model";\n');
  await f.write('source/package.json', JSON.stringify(pkg));
  await f.write('source/src/lib/i18n/dental-facts.json', '[{"fact":"synthetic verification fact"}]');
  const archive = path.join(f.directory, 'app.asar');
  const pack = () => require('@electron/asar').createPackage(path.join(f.directory, 'source'), archive);
  await pack();
  return {...f, pkg, archive, pack, project: path.join(f.directory, 'source')};
}

test('ASAR reader handles a real pinned @electron/asar archive and binds all Electron sources', async t => {
  const f = await sourceFixture(t);
  const result = await verifyAsarSource(f.project, f.archive, f.pkg);
  assert.equal(result.electronFiles, 3);
  assert.match(result.electronTreeSha256, /^[a-f\d]{64}$/);
  const archive = await openAsar(f.archive);
  try {assert.equal((await archive.read('electron/main.cjs')).toString(), 'const electron = require("electron");\n');}
  finally {await archive.close();}
});

test('ASAR source drift, missing files and wrong application version are rejected', async t => {
  const f = await sourceFixture(t);
  await f.write('source/electron/preload.cjs', 'tampered source');
  await assert.rejects(verifyAsarSource(f.project, f.archive, f.pkg), /packaged source matches checkout/);
  await f.pack();
  await assert.rejects(verifyAsarSource(f.project, f.archive, {...f.pkg, version: '1.0.0-rc.61'}), /ASAR package.json version/);
  await fs.rm(path.join(f.project, 'electron/aya/managed-runtime.cjs'));
  await assert.rejects(verifyAsarSource(f.project, f.archive, f.pkg), /checkout file list/);
});

test('an environment file or model weight hidden inside ASAR fails acceptance', async t => {
  const f = await sourceFixture(t);
  await f.write('source/.env.production', 'SYNTHETIC_SECRET=do-not-package');
  await f.pack();
  await assert.rejects(openAsar(f.archive), /environment file/);
  await fs.rm(path.join(f.project, '.env.production'));
  await f.write('source/electron/aya/hidden.gguf', 'synthetic-weight-marker');
  await f.pack();
  await assert.rejects(openAsar(f.archive), /model weights/);
});

test('truncated ASAR header and payload cannot pass archive inspection', async t => {
  const f = await sourceFixture(t), bytes = await fs.readFile(f.archive);
  await fs.writeFile(f.archive, bytes.subarray(0, 7));
  await assert.rejects(openAsar(f.archive), /size header is truncated/);
  await fs.writeFile(f.archive, bytes.subarray(0, bytes.length - 1));
  await assert.rejects(openAsar(f.archive), /entry is truncated/);
});

test('Next payload comparison checks bytes and rejects extra environment files', async t => {
  const f = await fixture(t);
  await f.write('build/server.js', 'standalone-server');
  await f.write('build/.next/BUILD_ID', 'exact-build-id');
  await f.write('build/.env.local', 'SYNTHETIC_SECRET=original-stays');
  await f.write('packaged/server.js', 'standalone-server');
  await f.write('packaged/.next/BUILD_ID', 'exact-build-id');
  assert.equal(await compareTrees(path.join(f.directory, 'build'), path.join(f.directory, 'packaged'), 'fixture'), 2);
  await f.write('packaged/.next/BUILD_ID', 'other-build-id');
  await assert.rejects(compareTrees(path.join(f.directory, 'build'), path.join(f.directory, 'packaged'), 'fixture'), /size|SHA-256/);
  await f.write('packaged/.next/BUILD_ID', 'exact-build-id');
  await f.write('packaged/.env.local', 'SYNTHETIC_SECRET=original-stays');
  await assert.rejects(compareTrees(path.join(f.directory, 'build'), path.join(f.directory, 'packaged'), 'fixture'), /file list/);
  assert.equal(await fs.readFile(path.join(f.directory, 'build/.env.local'), 'utf8'), 'SYNTHETIC_SECRET=original-stays');
});

test('integrity manifest is checked against exact current checkout bytes', async t => {
  const f = await fixture(t), source = 'exact-source\n';
  await f.write('electron/main.cjs', source);
  const manifest = {release: '1.0.0-rc.62', files: [{path: 'electron/main.cjs', size: Buffer.byteLength(source), sha256: hash(source)}]};
  await f.write('PAKET_BUTUNLUK.json', JSON.stringify(manifest));
  assert.equal(await verifySourceManifest(f.directory, manifest.release), await sha256(path.join(f.directory, 'PAKET_BUTUNLUK.json')));
  await f.write('electron/main.cjs', 'wrong-source\n');
  await assert.rejects(verifySourceManifest(f.directory, manifest.release), /source SHA-256/);
  await f.write('PAKET_BUTUNLUK.json', JSON.stringify({...manifest, files: [{...manifest.files[0], path: '../outside'}]}));
  await assert.rejects(verifySourceManifest(f.directory, manifest.release), /safe and unique/);
});

test('receipt paths cannot escape output and Windows acceptance cannot run on Linux', async () => {
  assert.equal(inside('/build/output', '/build/output/setup.exe'), true);
  for (const candidate of ['/build/output', '/build/output-old/setup.exe', '/build/setup.exe']) assert.equal(inside('/build/output', candidate), false);
  await assert.rejects(verifyWindowsArtifact({platform: 'linux'}), /requires a Windows runner/);
});

const ready = {
  origin: 'http://127.0.0.1:3210', pathname: '/workspace', ready: 'complete', bridge: true,
  hasNode: false, hasAuthSession: false, bodyLength: 200, loading: false,
  hasCadLink: true, hasAyaLink: true, hasAyaComposer: false, hasSettingsContent: false,
};

test('desktop smoke requires genuine IPC bridge, isolated renderer and real guest route controls', () => {
  validateRouteSnapshot('/workspace', ready);
  validateRouteSnapshot('/ai', {...ready, pathname: '/ai', hasAyaComposer: true});
  validateRouteSnapshot('/settings', {...ready, pathname: '/settings', hasSettingsContent: true});
  assert.throws(() => validateRouteSnapshot('/settings', ready), /remains accessible without an account/);
  for (const change of [{bridge: false}, {hasNode: true}, {hasAuthSession: true}, {hasCadLink: false}, {loading: true}, {origin: 'http://localhost:3010'}]) {
    assert.throws(() => validateRouteSnapshot('/workspace', {...ready, ...change}));
  }
  assert.throws(() => validateRouteSnapshot('/ai', {...ready, pathname: '/ai'}), /local AYA composer/);
});

test('desktop smoke environment is per-process and removes inherited model or Electron overrides', () => {
  const original = {PATH: 'keep-path', ELECTRON_RUN_AS_NODE: '1', AYA_API_KEY: 'synthetic-secret', OLLAMA_HOST: 'http://remote.invalid', DENTAYA_URL: 'http://wrong.invalid'};
  const env = desktopSmokeEnvironment('/fresh-profile', original);
  assert.equal(env.PATH, original.PATH);
  assert.equal(env.APPDATA, path.join('/fresh-profile', 'appdata'));
  assert.equal(env.LOCALAPPDATA, path.join('/fresh-profile', 'localappdata'));
  for (const key of ['ELECTRON_RUN_AS_NODE', 'AYA_API_KEY', 'OLLAMA_HOST', 'DENTAYA_URL']) assert.equal(env[key], undefined);
  assert.equal(original.ELECTRON_RUN_AS_NODE, '1');
});

class FakeSocket extends EventTarget {
  messages = [];
  send(text) {this.messages.push(JSON.parse(text));}
  receive(message) {this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(message)}));}
  close() {this.dispatchEvent(new Event('close'));}
}

test('Node WebSocket CDP client matches out-of-order responses and preserves renderer exceptions', async () => {
  const socket = new FakeSocket(), client = new CdpClient(socket, 1000);
  const first = client.call('Page.enable'), second = client.evaluate('location.pathname');
  socket.receive({id: socket.messages[1].id, result: {result: {value: '/workspace'}}});
  socket.receive({id: socket.messages[0].id, result: {}});
  assert.equal(await second, '/workspace');
  assert.deepEqual(await first, {});
  socket.receive({method: 'Runtime.exceptionThrown', params: {exceptionDetails: {exception: {description: 'synthetic renderer failure'}}}});
  assert.deepEqual(client.exceptions, ['synthetic renderer failure']);
  const pending = client.call('Page.navigate');
  socket.receive({id: socket.messages.at(-1).id, error: {message: 'Invalid URL'}});
  await assert.rejects(pending, /CDP Page.navigate: Invalid URL/);
  client.close();
});

test('CDP timeout or renderer disconnect rejects acceptance instead of hanging', async () => {
  const socket = new FakeSocket(), client = new CdpClient(socket, 5);
  await assert.rejects(client.call('Page.enable'), /timed out/);
  const pending = client.call('Runtime.enable');
  socket.close();
  await assert.rejects(pending, /connection closed/);
});
