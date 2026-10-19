import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {inspectProject, isFileLockFailure, packageWindows, showResult, electronInstallEnvironment, probeElectronVersion, supportsNode} from './package-windows.mjs';

const version = '1.0.0-rc.45';
const pe = machine => {
  const data = Buffer.alloc(128);
  data.write('MZ'); data.writeUInt32LE(64, 60); data.writeUInt32LE(0x4550, 64);
  data.writeUInt16LE(machine ?? 0x8664, 68);
  return data;
};

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'DentAYA package test '));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const write = async (name, value) => {
    const file = path.join(dir, name);
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.writeFile(file, value);
    return file;
  };
  const json = (name, value) => write(name, JSON.stringify(value));
  await json('package.json', {name: 'dentaya-production-rc', version, devDependencies: {electron: '44.4.5'}});
  await json('.next/standalone/package.json', {version});
  await json('.next/standalone/node_modules/next/package.json', {version: '16.3.8'});
  await write('.next/standalone/server.js', '// prepared standalone');
  await write('.next/standalone/.next/BUILD_ID', 'next-build-45');
  await write('.next/BUILD_ID', 'next-build-45');
  await write('.next/static/app.js', 'prepared');
  await json('node_modules/electron/package.json', {name: 'electron', version: '44.4.5'});
  await write('node_modules/electron/dist/version', '44.4.5');
  for (const file of ['electron.exe', 'd3dcompiler_47.dll']) await write(`node_modules/electron/dist/${file}`, pe());
  for (const file of ['icudtl.dat', 'chrome_100_percent.pak', 'resources/default_app.asar']) await write(`node_modules/electron/dist/${file}`, 'runtime');
  await json('node_modules/electron-builder/package.json', {name: 'electron-builder', bin: {'electron-builder': 'cli.cjs'}});
  await write('node_modules/electron-builder/cli.cjs', '// fake builder supplied by each test');
  await write('electron-builder.yml', 'appId: com.dentaya.desktop\n');
  await write('.env.local', 'TEST_VALUE=fixture-only\n');
  await write('dist-desktop/win-unpacked.tmp/d3dcompiler_47.dll', 'keep old failed output');
  return {dir, write, json, options: {projectDir: dir, platform: 'win32', log: () => {}}};
}

async function success(cli, configFile, {logPath}) {
  const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
  await fs.writeFile(logPath, 'packaged');
  await fs.writeFile(path.join(config.directories.output, `DentAYA-Setup-${version}.exe`), pe());
  return {code: 0, tail: 'done'};
}

test('installed matching Windows runtime, original config and prepared Next are reused', async t => {
  const f = await fixture(t);
  const env = await fs.readFile(path.join(f.dir, '.env.local'));
  const info = await inspectProject(f.dir);
  let config;
  const receipt = await packageWindows({...f.options, run: async (...args) => {
    config = JSON.parse(await fs.readFile(args[1], 'utf8'));
    return success(...args);
  }});
  assert.equal(config.extends, path.join(f.dir, 'electron-builder.yml'));
  assert.equal(config.electronDist, info.dist);
  assert.equal(config.electronVersion, '44.4.5');
  assert.equal(receipt.output, config.directories.output);
  assert.equal(receipt.buildId, 'next-build-45');
  assert.deepEqual(await showResult(f.dir, false, () => {}), receipt);
  assert.deepEqual(await fs.readFile(path.join(f.dir, '.env.local')), env);
  assert.equal(await fs.readFile(path.join(f.dir, 'dist-desktop/win-unpacked.tmp/d3dcompiler_47.dll'), 'utf8'), 'keep old failed output');
});

test('DLL locks get a fresh directory and bounded backoff; old output is retained', async t => {
  const f = await fixture(t), outputs = [], waits = [];
  const receipt = await packageWindows({...f.options, sleep: async ms => waits.push(ms), run: async (...args) => {
    const config = JSON.parse(await fs.readFile(args[1], 'utf8'));
    outputs.push(config.directories.output);
    if (outputs.length === 3) return success(...args);
    const tail = `${outputs.length === 1 ? 'EPERM' : 'EBUSY'}: open '${config.directories.output}/win-unpacked.tmp/d3dcompiler_47.dll'`;
    await fs.writeFile(args[2].logPath, tail);
    return {code: 1, tail};
  }});
  assert.equal(new Set(outputs).size, 3);
  assert.deepEqual(waits, [1500, 3000]);
  assert.equal(receipt.logs.length, 3);
  assert.ok(receipt.installer.startsWith(outputs[2]));
});

test('persistent lock fails after three attempts and writes no success receipt', async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(packageWindows({...f.options, sleep: async () => {}, run: async () => {
    calls++; return {code: 1, tail: 'EPERM open win-unpacked.tmp/d3dcompiler_47.dll'};
  }}), /Paketleme tamamlanamadi/);
  assert.equal(calls, 3);
  await assert.rejects(fs.stat(path.join(f.dir, 'dist-desktop/latest-build.json')), {code: 'ENOENT'});
});

test('unrelated packaging errors stop on the first attempt', async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(packageWindows({...f.options, run: async () => {
    calls++; return {code: 2, tail: 'Invalid configuration or certificate failure'};
  }}), /kod 2/);
  assert.equal(calls, 1);
  assert.equal(isFileLockFailure('EPERM open package.json'), false);
  assert.equal(isFileLockFailure('EBUSY open win-unpacked/d3dcompiler_47.dll'), true);
});

test('exit zero without a usable installer is rejected', async t => {
  const f = await fixture(t);
  await assert.rejects(packageWindows({...f.options, run: async () => ({code: 0, tail: ''})}), {code: 'ENOENT'});
  await assert.rejects(fs.stat(path.join(f.dir, 'dist-desktop/latest-build.json')), {code: 'ENOENT'});
});

test('an empty or non-Windows installer is never reported as success', async t => {
  const f = await fixture(t);
  await assert.rejects(packageWindows({...f.options, run: async (...args) => {
    await success(...args);
    const config = JSON.parse(await fs.readFile(args[1], 'utf8'));
    await fs.writeFile(path.join(config.directories.output, `DentAYA-Setup-${version}.exe`), 'not an exe');
    return {code: 0, tail: ''};
  }}), /Gecerli bir Windows dosyasi degil/);
});

test('different or missing Next build data prevents packaging', async t => {
  const f = await fixture(t); let called = false;
  await f.write('.next/standalone/.next/BUILD_ID', 'different-build');
  await assert.rejects(packageWindows({...f.options, run: async () => {called = true;}}), /eslesmiyor/);
  assert.equal(called, false);
  await fs.rm(path.join(f.dir, '.next/standalone/server.js'));
  await assert.rejects(inspectProject(f.dir), {code: 'ENOENT'});
});

test('different Electron version and wrong architecture are rejected', async t => {
  const f = await fixture(t);
  await f.write('node_modules/electron/dist/version', '43.0.0');
  await assert.rejects(inspectProject(f.dir), /Electron surumu/);
  await f.write('node_modules/electron/dist/version', '44.4.5');
  await f.write('node_modules/electron/dist/electron.exe', pe(0x14c));
  await assert.rejects(inspectProject(f.dir), /Windows x64/);
});

test('a missing runtime without its own package installer stops before packaging', async t => {
  const f = await fixture(t); let called = false;
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist/d3dcompiler_47.dll'));
  await assert.rejects(packageWindows({...f.options, run: async () => {called = true;}}), {code: 'ENOENT'});
  assert.equal(called, false);
});

test('real child-process invocation preserves spaced paths and disables publishing', async t => {
  const f = await fixture(t);
  await f.write('node_modules/electron-builder/cli.cjs', `
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const args = process.argv.slice(2);
assert.deepEqual(args.slice(0,6), ['--win','nsis','--x64','--publish','never','--config']);
const cfg = JSON.parse(fs.readFileSync(args[6], 'utf8'));
assert.equal(cfg.extends, path.join(process.cwd(),'electron-builder.yml'));
assert.equal(cfg.electronDist, path.join(process.cwd(),'node_modules/electron/dist'));
const pe = Buffer.alloc(128); pe.write('MZ');
fs.writeFileSync(path.join(cfg.directories.output,'DentAYA-Setup-${version}.exe'),pe);
console.log('fake builder process completed');
`);
  const receipt = await packageWindows(f.options);
  assert.match(await fs.readFile(receipt.logs[0], 'utf8'), /fake builder process completed/);
});

test('a success receipt cannot reveal an installer outside its output folder', async t => {
  const f = await fixture(t);
  await f.json('dist-desktop/latest-build.json', {version, installer: path.join(f.dir, `DentAYA-Setup-${version}.exe`)});
  await assert.rejects(showResult(f.dir, false, () => {}), /Gecerli kurulum sonucu/);
});

test('non-Windows packaging fails explicitly', async () => {
  await assert.rejects(packageWindows({platform: 'linux'}), /Windows uzerinde/);
});

async function fixtureInstaller(f, {file = 'install.cjs', dist = 'dist', installedVersion = '44.4.5', code = '', legacySkip = false} = {}) {
  await f.json('node_modules/electron/package.json', {
    name: 'electron', version: '44.4.5', main: 'index.cjs', bin: {'install-electron': file},
  });
  await f.write('node_modules/electron/index.cjs', `module.exports = require('node:path').join(__dirname, ${JSON.stringify(dist)}, 'electron.exe');`);
  await f.write(`node_modules/electron/${file}`, code || `
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
assert.equal(process.env.ELECTRON_INSTALL_ARCH, 'x64');
assert.equal(process.env.ELECTRON_INSTALL_PLATFORM, 'win32');
assert.equal(process.env.npm_config_arch, 'x64');
const dist = path.join(process.cwd(), ${JSON.stringify(dist)});
${legacySkip ? "if (fs.existsSync(path.join(dist, 'electron.exe'))) process.exit(0);" : ''}
fs.mkdirSync(path.join(dist,'resources'), {recursive:true});
const pe = Buffer.from(${JSON.stringify(pe().toString('base64'))}, 'base64');
for (const name of ['electron.exe','d3dcompiler_47.dll']) fs.writeFileSync(path.join(dist,name), pe);
for (const name of ['icudtl.dat','chrome_100_percent.pak','resources/default_app.asar']) fs.writeFileSync(path.join(dist,name),'test runtime');
fs.writeFileSync(path.join(dist,'version'), ${JSON.stringify(installedVersion)});
console.log('fixture installer completed');
`);
}

test('missing electron/dist is installed through the declared installer before packaging', async t => {
  const f = await fixture(t);
  await fixtureInstaller(f);
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  const before = await fs.readFile(path.join(f.dir, '.next/BUILD_ID'));
  const receipt = await packageWindows({...f.options, run: success});
  assert.equal(await fs.readFile(path.join(f.dir, 'node_modules/electron/dist/version'), 'utf8'), '44.4.5');
  assert.match(await fs.readFile(receipt.electronInstallLog, 'utf8'), /fixture installer completed/);
  assert.deepEqual(await fs.readFile(path.join(f.dir, '.next/BUILD_ID')), before);
});

test('a valid runtime with no version marker is queried without fabricating a marker', async t => {
  const f = await fixture(t); let installs = 0, probes = 0;
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist/version'));
  const receipt = await packageWindows({...f.options, run: success, install: async () => {installs++;}, probe: async executable => {
    probes++; assert.equal(executable, path.join(f.dir, 'node_modules/electron/dist/electron.exe'));
    return '44.4.5';
  }});
  assert.equal(installs, 0); assert.equal(probes, 1);
  await assert.rejects(fs.stat(path.join(f.dir, 'node_modules/electron/dist/version')), {code: 'ENOENT'});
  assert.equal(receipt.electronInstallLog, undefined);
});

test('the on-demand install-electron entry and package-resolved runtime path are supported', async t => {
  const f = await fixture(t);
  await fixtureInstaller(f, {file: 'tools/install-electron.cjs', dist: 'cached-runtime'});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  const receipt = await packageWindows({...f.options, run: success});
  const config = JSON.parse(await fs.readFile(path.join(receipt.output, 'packaging-config.json'), 'utf8'));
  assert.equal(config.electronDist, path.join(f.dir, 'node_modules/electron/cached-runtime'));
  await assert.rejects(fs.stat(path.join(f.dir, 'node_modules/electron/dist/version')), {code: 'ENOENT'});
});

test('a partial legacy runtime is preserved so the installer cannot skip a missing DLL', async t => {
  const f = await fixture(t);
  await fixtureInstaller(f, {file: 'install.js', legacySkip: true});
  // Old package format has install.js but no install-electron bin declaration.
  await f.json('node_modules/electron/package.json', {name: 'electron', version: '44.4.5'});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist/d3dcompiler_47.dll'));
  await packageWindows({...f.options, run: success});
  const backups = (await fs.readdir(path.join(f.dir, 'node_modules/electron'))).filter(name => name.startsWith('dist.dentaya-backup-'));
  assert.equal(backups.length, 1);
  assert.deepEqual(await fs.readFile(path.join(f.dir, 'node_modules/electron', backups[0], 'electron.exe')), pe());
  await fs.stat(path.join(f.dir, 'node_modules/electron/dist/d3dcompiler_47.dll'));
});

test('installer errors preserve a diagnostic log and prevent packaging', async t => {
  const f = await fixture(t); let builds = 0;
  await fixtureInstaller(f, {code: "console.error('fixture download failure'); process.exitCode = 9;"});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  await assert.rejects(packageWindows({...f.options, run: async () => {builds++;}}), /Electron kurulumu tamamlanamadi.*9[\s\S]*electron-install\.log/);
  assert.equal(builds, 0);
  const setup = (await fs.readdir(path.join(f.dir, 'dist-desktop'))).find(name => name.startsWith('electron-setup-'));
  assert.match(await fs.readFile(path.join(f.dir, 'dist-desktop', setup, 'electron-install.log'), 'utf8'), /fixture download failure/);
  await assert.rejects(fs.stat(path.join(f.dir, 'dist-desktop/latest-build.json')), {code: 'ENOENT'});
});

test('installer exit zero is insufficient unless the binary and data files exist', async t => {
  const f = await fixture(t); let builds = 0;
  await fixtureInstaller(f, {code: "console.log('fixture no-op');"});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  await assert.rejects(packageWindows({...f.options, run: async () => {builds++;}}), /Electron kurulumu tamamlanamadi/);
  assert.equal(builds, 0);
});

test('an installer that creates only a version marker is rejected', async t => {
  const f = await fixture(t); let builds = 0;
  await fixtureInstaller(f, {code: "const fs=require('node:fs');fs.mkdirSync('dist');fs.writeFileSync('dist/version','44.4.5');"});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  await assert.rejects(packageWindows({...f.options, run: async () => {builds++;}}), /Electron kurulumu tamamlanamadi/);
  assert.equal(builds, 0);
});

test('a wrong installed runtime version is rejected after the installer finishes', async t => {
  const f = await fixture(t); let builds = 0;
  await fixtureInstaller(f, {installedVersion: '43.0.0'});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  await assert.rejects(packageWindows({...f.options, run: async () => {builds++;}}), /Electron kurulumu tamamlanamadi.*eslesmiyor/);
  assert.equal(builds, 0);
});

test('a mismatched npm package version is rejected without running an installer', async t => {
  const f = await fixture(t); let installs = 0;
  await f.json('node_modules/electron/package.json', {name: 'electron', version: '43.0.0'});
  await assert.rejects(packageWindows({...f.options, install: async () => {installs++;}, run: success}), /Electron surumu/);
  assert.equal(installs, 0);
});

test('an installer declared outside the Electron package is never executed', async t => {
  const f = await fixture(t); let installs = 0;
  await f.json('node_modules/electron/package.json', {name: 'electron', version: '44.4.5', bin: {'install-electron': '../outside.cjs'}});
  await fs.rm(path.join(f.dir, 'node_modules/electron/dist'), {recursive: true});
  await assert.rejects(packageWindows({...f.options, install: async () => {installs++;}, run: success}), /paket klasoru disinda/);
  assert.equal(installs, 0);
});

test('installer environment is scoped, pins x64/win32 and removes download-skip overrides', () => {
  const source = {ELECTRON_SKIP_BINARY_DOWNLOAD: '1', electron_override_dist_path: 'elsewhere', ELECTRON_CUSTOM_VERSION: '43.0.0', NPM_CONFIG_ARCH: 'arm64', ELECTRON_INSTALL_PLATFORM: 'linux', HTTPS_PROXY: 'http://proxy.invalid'};
  const before = {...source}, env = electronInstallEnvironment(source);
  assert.deepEqual(source, before);
  assert.equal(env.ELECTRON_INSTALL_ARCH, 'x64'); assert.equal(env.ELECTRON_INSTALL_PLATFORM, 'win32');
  assert.equal(env.npm_config_arch, 'x64'); assert.equal(env.npm_config_platform, 'win32');
  assert.equal(env.HTTPS_PROXY, source.HTTPS_PROXY);
  assert.ok(!Object.keys(env).some(key => /skip_binary_download|override_dist_path|custom_version/i.test(key)));
  assert.equal(env.NPM_CONFIG_ARCH, undefined);
});

test('the version probe handles the real --version child-process protocol', async () => {
  assert.equal(await probeElectronVersion(process.execPath), process.versions.node);
});

test('the pinned Electron dependency requires Node 22.12 or later', () => {
  for (const version of ['20.19.0', '22.0.0', '22.11.9', 'not-a-version']) assert.equal(supportsNode(version), false, version);
  for (const version of ['22.12.0', 'v22.12.1', '22.22.0', '24.0.0', '26.1.0']) assert.equal(supportsNode(version), true, version);
});
