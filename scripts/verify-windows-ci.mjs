import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {verifyWindowsCiSource} from './verify-windows-ci-source.mjs';
import {prepareWindowsRelease, publishWindowsRelease} from './publish-windows-release.mjs';

const version = '1.0.0-rc.62', commit = 'a'.repeat(40), tag = `v${version}`;
const sha256 = data => createHash('sha256').update(data).digest('hex');
async function fixture(t) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'DentAYA release CI '));
  t.after(() => fs.rm(project, {recursive: true, force: true}));
  const write = async (name, data) => {const file = path.join(project, name); await fs.mkdir(path.dirname(file), {recursive: true}); await fs.writeFile(file, data); return file;};
  const json = (name, data) => write(name, JSON.stringify(data, null, 2) + '\n');
  await json('package.json', {name: 'dentaya-production-rc', version});
  await json('package-lock.json', {version, packages: {'': {version}}});
  return {project, write, json};
}

test('Windows Git checkout preserves source hashes, legacy line endings and binary bytes', async t => {
  const f = await fixture(t), run = promisify(execFile);
  const git = async (...args) => (await run('git', ['-C', f.project, ...args], {shell: false, windowsHide: true})).stdout.trim();
  const sources = new Map([
    ['package.json', await fs.readFile(path.join(f.project, 'package.json'))],
    ['package-lock.json', await fs.readFile(path.join(f.project, 'package-lock.json'))],
    ['legacy.cmd', Buffer.from('@echo off\r\necho DentAYA\r\n')],
    ['legacy-log.txt', Buffer.from('old record\nWindows record\r\n')],
    ['asset.bin', Buffer.from([0, 1, 10, 13, 10, 255])],
  ]);
  for (const [name, data] of sources) await f.write(name, data);
  await git('init');
  await git('config', 'core.autocrlf', 'false');
  const commitFixture = async message => {
    await git('add', '.');
    await git('-c', 'user.name=DentAYA fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', message);
  };
  const checkout = async () => {
    for (const name of sources.keys()) await fs.rm(path.join(f.project, name));
    await git('checkout', 'HEAD', '--', '.');
  };
  await commitFixture('Original source bytes');
  await git('config', 'core.autocrlf', 'true');
  await checkout();
  assert.notEqual(sha256(await fs.readFile(path.join(f.project, 'package.json'))), sha256(sources.get('package.json')), 'Unprotected Windows checkout would invalidate the source manifest');
  await git('config', 'core.autocrlf', 'false');
  await checkout();
  await f.write('.gitattributes', await fs.readFile(new URL('../.gitattributes', import.meta.url)));
  await commitFixture('Preserve cross-platform release bytes');
  await git('config', 'core.autocrlf', 'true');
  await checkout();
  for (const [name, data] of sources) assert.deepEqual(await fs.readFile(path.join(f.project, name)), data, `${name}: checkout retains exact source bytes`);
  const head = await git('rev-parse', 'HEAD');
  assert.equal((await verifyWindowsCiSource({project: f.project, commit: head})).commit, head, 'Actual checkout remains clean under the CI source guard');
});

test('CI source guard binds clean checkout, lockfile version and dereferenced tag to the exact commit', async t => {
  const f = await fixture(t), calls = [];
  const git = async (command, args, options) => {calls.push(args); assert.equal(command, 'git'); assert.equal(options.shell, false); return {stdout: args[0] === 'diff' ? '' : `${commit}\n`};};
  assert.deepEqual(await verifyWindowsCiSource({...f, commit, ref: `refs/tags/${tag}`, git}), {commit, version, ref: `refs/tags/${tag}`});
  assert.deepEqual(calls[1], ['diff', '--exit-code', 'HEAD', '--']);
  assert.deepEqual(calls[2], ['rev-parse', `refs/tags/${tag}^{commit}`]);
  await assert.rejects(verifyWindowsCiSource({...f, commit: 'b'.repeat(40), git}), /checkout does not match/);
  await assert.rejects(verifyWindowsCiSource({...f, commit, ref: 'refs/tags/v1.0.0-rc.99', git}), /tag does not match/);
  await f.json('package-lock.json', {version: '1.0.0-rc.61'});
  await assert.rejects(verifyWindowsCiSource({...f, commit, git}), /release versions do not match/);
});

test('CI source guard refuses modified tracked source and missing exact commit', async t => {
  const f = await fixture(t);
  await assert.rejects(verifyWindowsCiSource({...f, commit: 'main'}), /exact source commit/);
  await assert.rejects(verifyWindowsCiSource({...f, commit, git: async (command, args) => {if (args[0] === 'diff') throw Error('dirty checkout'); return {stdout: commit};}}), /dirty checkout/);
});

async function releaseFixture(t, nativeStatus = 'failed') {
  const f = await fixture(t), sourceData = Buffer.from('release source\n');
  await f.write('source.txt', sourceData);
  const manifestFile = await f.json('PAKET_BUTUNLUK.json', {release: version, files: [{path: 'source.txt', size: sourceData.length, sha256: sha256(sourceData)}]});
  const pe = Buffer.alloc(1024); pe.write('MZ'); pe.writeUInt32LE(64, 60); pe.writeUInt32LE(0x4550, 64); pe.writeUInt16LE(0x14c, 68); pe.writeUInt16LE(1, 70); pe.writeUInt16LE(224, 84); pe.writeUInt16LE(2, 86); pe.writeUInt16LE(0x10b, 88); pe.writeUInt32LE(512, 148); pe.writeUInt32LE(512, 328); pe.writeUInt32LE(512, 332);
  const installerName = `DentAYA-Setup-${version}.exe`;
  await f.write(`release/${installerName}`, pe);
  await f.write('release/SHA256SUMS.txt', `${sha256(pe)}  ${installerName}\n`);
  const smokeFile = await f.json('release/desktop-smoke-report.json', {schemaVersion: 1, pass: true, commit, version, freshProfile: true, packagedServer: true, bridgeIpc: true, rendererExceptions: 0, routes: ['/workspace', '/ai', '/settings'].map(requested => ({requested, documentReady: true, bridge: true, ipc: true, unauthenticated: true}))});
  const receipt = {schemaVersion: 1, pass: true, commit, tag, version, buildId: 'build-62', installer: {file: installerName, bytes: pe.length, sha256: sha256(pe), machine: 0x14c}, source: {manifestSha256: sha256(await fs.readFile(manifestFile))}, payload: {extractedFromInstaller: true, nextBuildId: 'build-62'}, desktopSmoke: {pass: true, freshProfile: true, report: 'desktop-smoke-report.json', sha256: sha256(await fs.readFile(smokeFile))}};
  await f.json('release/windows-build-receipt.json', receipt);
  await f.json('native/source-provenance.json', {commit, version, runId: '12345', runAttempt: '1', job: 'windows-native'});
  const native = {release: version, provenance: 'controlled-windows-native', status: nativeStatus, semanticReviewRequired: true, semanticAcceptance: 'pending-human-review', weightsIncludedInInstaller: false, nativeInferenceObserved: nativeStatus === 'passed'};
  await f.json('native/windows-native-result.json', native);
  await f.json('native/native-inference-report.json', {mock: false, semanticReviewRequired: true, nativeInference: nativeStatus === 'passed', contractPass: nativeStatus === 'passed', caseCounts: {attempted: nativeStatus === 'passed' ? 9 : 0, succeeded: nativeStatus === 'passed' ? 9 : 0}});
  await f.write('native/native-acceptance.txt', 'Actual Windows fixture test output\n');
  const input = {project: f.project, releaseDir: path.join(f.project, 'release'), nativeDir: path.join(f.project, 'native'), commit, tag};
  const deps = {verifySource: async () => ({commit, version})};
  return {...f, input, deps, receipt, native};
}

test('verified installer release includes actual failed native evidence and keeps semantic limits', async t => {
  const f = await releaseFixture(t), result = await prepareWindowsRelease(f.input, f.deps);
  assert.equal(result.assets.length, 8);
  assert.equal(result.nativeStatus, 'failed');
  assert.match(result.body, /contract result: \*\*failed\*\*/);
  assert.match(result.body, /Semantic response quality still requires human review/);
  assert.match(result.body, /Clinical\/production acceptance is not completed/);
  assert.ok(result.assets.every(asset => !/\.gguf$/i.test(asset.name)));
});

test('release guard rejects changed installer, source, report and unsupported native pass', async t => {
  const f = await releaseFixture(t, 'passed');
  await prepareWindowsRelease(f.input, f.deps);
  await f.write('native/native-inference-report.json', '{}');
  await assert.rejects(prepareWindowsRelease(f.input, f.deps), /semantic review limits/);
  await f.json('native/native-inference-report.json', {mock: false, semanticReviewRequired: true, nativeInference: false, contractPass: false});
  await assert.rejects(prepareWindowsRelease(f.input, f.deps), /not supported by actual inference/);
  await f.write(`release/DentAYA-Setup-${version}.exe`, 'changed');
  await assert.rejects(prepareWindowsRelease(f.input, f.deps), /Installer hash or size/);
  await f.write('source.txt', 'changed');
  await assert.rejects(prepareWindowsRelease(f.input, f.deps), /Source integrity mismatch/);
});

test('publisher cannot call the network for a branch or a mismatched source commit', async () => {
  let called = false;
  const request = async () => {called = true; throw Error('unexpected network');};
  await assert.rejects(publishWindowsRelease({commit, tag}, {env: {GITHUB_REF: 'refs/heads/main', GITHUB_SHA: commit}, request}), /restricted to the exact tag/);
  await assert.rejects(publishWindowsRelease({commit, tag}, {env: {GITHUB_REF: `refs/tags/${tag}`, GITHUB_SHA: 'b'.repeat(40)}, request}), /restricted to the exact tag/);
  assert.equal(called, false);
});

test('publisher creates a draft, uploads verified bytes and publishes only after all hashes match', async t => {
  const f = await releaseFixture(t), prepared = await prepareWindowsRelease(f.input, f.deps), calls = [];
  const request = async (url, options) => {
    calls.push({url, options});
    if (url.includes('/releases/tags/')) return {ok: false, status: 404};
    if (url.startsWith('https://uploads.github.com/')) {
      const name = new URL(url).searchParams.get('name'), asset = prepared.assets.find(item => item.name === name);
      assert.deepEqual(options.body, asset.data);
      return {ok: true, status: 201, json: async () => ({name, size: asset.data.length, digest: `sha256:${asset.sha256}`})};
    }
    if (options.method === 'POST') {
      const body = JSON.parse(options.body); assert.equal(body.draft, true); assert.equal(body.target_commitish, commit);
      return {ok: true, status: 201, json: async () => ({id: 42, assets: [], upload_url: 'https://uploads.github.com/repos/owner/repo/releases/42/assets{?name,label}'})};
    }
    assert.equal(options.method, 'PATCH');
    assert.equal(calls.length, 11);
    assert.equal(JSON.parse(options.body).draft, false);
    return {ok: true, status: 200, json: async () => ({html_url: 'https://github.com/owner/repo/releases/tag/' + tag})};
  };
  const result = await publishWindowsRelease(f.input, {env: {GITHUB_REF: `refs/tags/${tag}`, GITHUB_SHA: commit, GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '2', GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'unit-test-token'}, prepare: async () => prepared, request});
  assert.equal(result.nativeStatus, 'failed');
  assert.equal(calls.length, 11);
});

test('publisher refuses a changed upload and leaves the release as a draft', async () => {
  let published = false;
  const request = async (url, options) => {
    if (url.includes('/tags/')) return {ok: false, status: 404};
    if (url.startsWith('https://uploads.github.com/')) return {ok: true, json: async () => ({name: 'installer.exe', size: 1, digest: 'sha256:wrong'})};
    if (options.method === 'PATCH') published = true;
    return {ok: true, json: async () => ({id: 1, upload_url: 'https://uploads.github.com/repos/owner/repo/releases/1/assets{?name,label}'})};
  };
  await assert.rejects(publishWindowsRelease({commit, tag}, {env: {GITHUB_REF: `refs/tags/${tag}`, GITHUB_SHA: commit, GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '1', GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'unit-test-token'}, prepare: async () => ({tag, commit, runId: '12345', runAttempt: '1', assets: [{name: 'installer.exe', data: Buffer.from('x'), sha256: 'expected'}]}), request}), /expected asset bytes/);
  assert.equal(published, false);
});

test('publisher rejects native evidence from another workflow run before calling GitHub', async () => {
  let called = false;
  await assert.rejects(publishWindowsRelease({commit, tag}, {env: {GITHUB_REF: `refs/tags/${tag}`, GITHUB_SHA: commit, GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '1', GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'unit-test-token'}, prepare: async () => ({runId: '99999', runAttempt: '1'}), request: async () => {called = true;}}), /another workflow run/);
  assert.equal(called, false);
});
