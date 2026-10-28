import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {inspectProject, isFileLockFailure, packageWindows, showResult, electronInstallEnvironment, probeElectronVersion, supportsNode, readNpmVersion, verifyPe} from './package-windows.mjs';
import afterPack from './after-pack.cjs';

const version = '1.0.0-rc.45';
const pe = machine => {
  const data = Buffer.alloc(1024);
  data.write('MZ'); data.writeUInt32LE(64, 60); data.writeUInt32LE(0x4550, 64);
  data.writeUInt16LE(machine ?? 0x8664, 68);
  data.writeUInt16LE(1, 70); data.writeUInt16LE(240, 84); data.writeUInt16LE(0x0002, 86);
  data.writeUInt16LE(machine === 0x14c ? 0x10b : 0x20b, 88); data.writeUInt32LE(512, 148);
  data.write('.text', 328); data.writeUInt32LE(512, 344); data.writeUInt32LE(512, 348);
  return data;
};

async function fixture(t) {
  // Windows TEMP can use an 8.3 alias while inspectProject returns real paths.
  // Keep strict path assertions against that same canonical fixture directory.
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'DentAYA package test ')));
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
  await f.write('node_modules/electron/dist/electron.exe', pe());
  await f.write('node_modules/electron/dist/d3dcompiler_47.dll', pe(0x14c));
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
const pe = Buffer.from('${pe().toString('base64')}', 'base64');
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

test('npm version uses Node and npm-cli.js even with spaces and shell characters in its path', async t => {
  const f = await fixture(t);
  const cli = await f.write('npm tools & release/npm-cli.js', `process.stdout.write('11.9.0\\n');`);
  assert.equal(await readNpmVersion({platform: 'win32', env: {...process.env, npm_execpath: cli}}), '11.9.0');
  let call;
  assert.equal(await readNpmVersion({platform: 'win32', env: {npm_execpath: cli}, run: async (...args) => {call = args; return {stdout: '11.9.0\n'};}}), '11.9.0');
  assert.equal(call[0], process.execPath);
  assert.deepEqual(call[1], [cli, '--version']);
  assert.equal(call[2].shell, false);
  assert.equal(call[2].windowsHide, true);
});

test('Windows npm fallback resolves the CLI beside Node without executing npm.cmd', async t => {
  const f = await fixture(t), executable = path.join(f.dir, 'Node installation/node.exe');
  const cli = await f.write('Node installation/node_modules/npm/bin/npm-cli.js', '// fixture');
  let command, args;
  assert.equal(await readNpmVersion({platform: 'win32', execPath: executable, env: {npm_execpath: path.join(f.dir, 'npm.cmd')}, run: async (cmd, argv) => {command = cmd; args = argv; return {stdout: '11.9.0'};}}), '11.9.0');
  assert.equal(command, executable);
  assert.deepEqual(args, [cli, '--version']);
});

test('Windows npm with no JavaScript entry fails without spawning a shell', async t => {
  const f = await fixture(t);
  let spawned = false;
  await assert.rejects(readNpmVersion({platform: 'win32', execPath: path.join(f.dir, 'missing/node.exe'), env: {npm_execpath: 'npm.cmd'}, run: async () => {spawned = true;}}), /npm-cli\.js bulunamadi/);
  assert.equal(spawned, false);
  const cli = await f.write('npm-cli.js', '// fixture');
  await assert.rejects(readNpmVersion({platform: 'win32', env: {npm_execpath: cli}, run: async () => ({stdout: 'unexpected npm output'})}), /npm surumu okunamadi/);
});

test('PE validation rejects MZ-only, forged signature, truncated headers and truncated sections', async t => {
  const f = await fixture(t), file = path.join(f.dir, 'candidate.exe');
  const mzOnly = Buffer.alloc(1024); mzOnly.write('MZ');
  const signature = pe(); signature.writeUInt32LE(0xdeadbeef, 64);
  const outside = pe(); outside.writeUInt32LE(4096, 60);
  const truncated = pe().subarray(0, 512);
  const shortHeaders = pe(); shortHeaders.writeUInt32LE(100, 148);
  for (const data of [mzOnly, signature, outside, pe().subarray(0, 80), truncated, shortHeaders]) {
    await fs.writeFile(file, data);
    await assert.rejects(verifyPe(file), /Gecerli bir Windows dosyasi degil/);
  }
});

test('PE validation accepts NSIS x86 installers and requires x64 for the Electron application', async t => {
  const f = await fixture(t), file = await f.write('candidate.exe', pe(0x14c));
  assert.equal((await verifyPe(file)).machine, 0x14c);
  await assert.rejects(verifyPe(file, 0x8664), /Windows x64/);
  await fs.writeFile(file, pe(0xaa64));
  await assert.rejects(verifyPe(file), /Gecerli bir Windows dosyasi degil/);
  await fs.writeFile(file, pe());
  assert.equal((await verifyPe(file, 0x8664)).bytes, 1024);
});

test('a builder exit zero cannot publish an MZ-only installer', async t => {
  const f = await fixture(t);
  await assert.rejects(packageWindows({...f.options, run: async (...args) => {
    await success(...args);
    const config = JSON.parse(await fs.readFile(args[1], 'utf8'));
    const fake = Buffer.alloc(1024); fake.write('MZ');
    await fs.writeFile(path.join(config.directories.output, `DentAYA-Setup-${version}.exe`), fake);
    return {code: 0, tail: ''};
  }}), /Gecerli bir Windows dosyasi degil/);
  await assert.rejects(fs.stat(path.join(f.dir, 'dist-desktop/latest-build.json')), {code: 'ENOENT'});
});

test('afterPack excludes every .env file while preserving originals and Next assets', async t => {
  const f = await fixture(t);
  const originals = ['.next/standalone/.env', '.next/standalone/.env.production', '.next/standalone/nested/.ENV.local', '.next/static/.env.secret', 'public/.env.example'];
  for (const name of originals) await f.write(name, 'TEST_FIXTURE_ONLY=keep-source\n');
  await f.write('public/asset.txt', 'public asset');
  const output = path.join(f.dir, 'packed app');
  await afterPack.default({packager: {projectDir: f.dir}, appOutDir: output});
  const packed = path.join(output, 'resources/app-next');
  for (const name of ['.env', '.env.production', 'nested/.ENV.local', '.next/static/.env.secret', 'public/.env.example']) await assert.rejects(fs.stat(path.join(packed, name)), {code: 'ENOENT'});
  for (const name of originals) assert.equal(await fs.readFile(path.join(f.dir, name), 'utf8'), 'TEST_FIXTURE_ONLY=keep-source\n');
  assert.equal(await fs.readFile(path.join(packed, 'server.js'), 'utf8'), '// prepared standalone');
  assert.equal(await fs.readFile(path.join(packed, 'public/asset.txt'), 'utf8'), 'public asset');
  await fs.stat(path.join(packed, 'node_modules/next/package.json'));
});
