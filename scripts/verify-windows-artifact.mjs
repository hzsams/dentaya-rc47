import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {smokeWindowsDesktop} from './smoke-windows-desktop.mjs';

const exec = promisify(execFile);
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const excludedEnvironment = relative => relative.split(/[\\/]/).some(name => /^\.env/i.test(name));
const isModelWeight = relative => /\.(?:gguf|safetensors|ckpt|pt|pth|onnx)$/i.test(relative);

export function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function treeFiles(directory, {optional = false, excludeEnv = false} = {}) {
  const files = new Map();
  async function visit(current, relative, ancestors) {
    const real = await fs.realpath(current);
    assert.equal(ancestors.has(real), false, `Directory cycle: ${relative}`);
    const nextAncestors = new Set([...ancestors, real]);
    for (const name of (await fs.readdir(current)).sort()) {
      const key = relative ? `${relative}/${name}` : name;
      if (excludeEnv && excludedEnvironment(key)) continue;
      const target = path.join(current, name), stat = await fs.stat(target);
      if (stat.isDirectory()) await visit(target, key, nextAncestors);
      else if (stat.isFile()) files.set(key, {file: target, size: stat.size});
      else throw new Error(`Unsupported packaged file: ${key}`);
    }
  }
  try {await visit(directory, '', new Set());}
  catch (error) {if (!optional || error.code !== 'ENOENT') throw error;}
  return files;
}

export async function compareTrees(source, packaged, label, {optional = false} = {}) {
  const expected = await treeFiles(source, {optional, excludeEnv: true});
  const actual = await treeFiles(packaged, {optional});
  assert.deepEqual([...actual.keys()], [...expected.keys()], `${label}: packaged file list matches the exact build`);
  for (const [relative, entry] of actual) {
    assert.equal(excludedEnvironment(relative), false, `${label}: environment file excluded`);
    assert.equal(isModelWeight(relative), false, `${label}: model weights are never bundled`);
    assert.equal(entry.size, expected.get(relative).size, `${label}/${relative}: size`);
    assert.equal(await sha256(entry.file), await sha256(expected.get(relative).file), `${label}/${relative}: SHA-256`);
  }
  return actual.size;
}

// Read only the bounded ASAR header and requested source entries, rather than
// loading the complete Electron archive into memory. Chromium Pickle headers
// store their lengths in the first two little-endian words.
export async function openAsar(archive) {
  const handle = await fs.open(archive, 'r');
  try {
    const stat = await handle.stat(), size = Buffer.alloc(8);
    assert.equal((await handle.read(size, 0, 8, 0)).bytesRead, 8, 'ASAR size header is truncated');
    assert.equal(size.readUInt32LE(0), 4, 'ASAR size header is invalid');
    const headerSize = size.readUInt32LE(4);
    assert.ok(headerSize >= 8 && headerSize <= 16 * 1024 * 1024 && 8 + headerSize <= stat.size, 'ASAR header length is invalid');
    const headerBytes = Buffer.alloc(headerSize);
    assert.equal((await handle.read(headerBytes, 0, headerSize, 8)).bytesRead, headerSize, 'ASAR header is truncated');
    const stringSize = headerBytes.readUInt32LE(4);
    assert.ok(headerBytes.readUInt32LE(0) + 4 === headerSize && stringSize > 0 && stringSize <= headerSize - 8, 'ASAR Pickle string is invalid');
    const root = JSON.parse(headerBytes.toString('utf8', 8, 8 + stringSize));
    const entries = new Map();
    const payloadOffset = 8 + headerSize;
    function visit(node, parent = '') {
      assert.ok(node && typeof node.files === 'object' && !Array.isArray(node.files), 'ASAR directory is invalid');
      for (const [name, entry] of Object.entries(node.files)) {
        assert.ok(name && name !== '.' && name !== '..' && !/[\\/\u0000]/.test(name), 'Unsafe ASAR entry');
        const relative = parent ? `${parent}/${name}` : name;
        assert.equal(excludedEnvironment(relative), false, `ASAR contains an environment file: ${relative}`);
        assert.equal(isModelWeight(relative), false, `ASAR contains model weights: ${relative}`);
        if (entry.files) visit(entry, relative);
        else {
          assert.equal(typeof entry.link, 'undefined', `ASAR links are not accepted: ${relative}`);
          assert.ok(Number.isSafeInteger(entry.size) && entry.size >= 0, `ASAR entry size is invalid: ${relative}`);
          if (!entry.unpacked) {
            assert.match(entry.offset, /^\d+$/, `ASAR entry offset is invalid: ${relative}`);
            const offset = Number(entry.offset);
            assert.ok(Number.isSafeInteger(offset) && payloadOffset + offset + entry.size <= stat.size, `ASAR entry is truncated: ${relative}`);
          }
          entries.set(relative, entry);
        }
      }
    }
    visit(root);
    return {
      entries,
      async read(relative) {
        const entry = entries.get(relative);
        assert.ok(entry, `ASAR is missing ${relative}`);
        assert.equal(entry.unpacked === true, false, `Source must be stored in ASAR: ${relative}`);
        assert.ok(entry.size <= 32 * 1024 * 1024, `Source entry is unexpectedly large: ${relative}`);
        const bytes = Buffer.alloc(entry.size);
        assert.equal((await handle.read(bytes, 0, entry.size, payloadOffset + Number(entry.offset))).bytesRead, entry.size, `ASAR source is truncated: ${relative}`);
        return bytes;
      },
      close: () => handle.close(),
    };
  } catch (error) {await handle.close(); throw error;}
}

export async function verifyAsarSource(project, archive, pkg) {
  const asar = await openAsar(archive);
  try {
    const source = await treeFiles(path.join(project, 'electron'));
    const expected = [...source.keys()].map(relative => `electron/${relative}`).sort();
    assert.deepEqual([...asar.entries.keys()].filter(relative => relative.startsWith('electron/')).sort(), expected, 'ASAR Electron sources match checkout file list');
    const tree = createHash('sha256');
    for (const [relative, entry] of source) {
      const key = `electron/${relative}`, sourceHash = await sha256(entry.file);
      assert.equal(digest(await asar.read(key)), sourceHash, `${key}: packaged source matches checkout`);
      tree.update(`${key}\0${sourceHash}\n`);
    }
    const packaged = JSON.parse((await asar.read('package.json')).toString('utf8'));
    for (const key of ['name', 'version', 'main', 'dependencies']) assert.deepEqual(packaged[key], pkg[key], `ASAR package.json ${key}`);
    const facts = 'src/lib/i18n/dental-facts.json';
    assert.equal(digest(await asar.read(facts)), await sha256(path.join(project, facts)), 'ASAR dental facts match checkout');
    return {electronFiles: source.size, electronTreeSha256: tree.digest('hex')};
  } finally {await asar.close();}
}

export async function verifySourceManifest(project, version) {
  const manifest = await readJson(path.join(project, 'PAKET_BUTUNLUK.json'));
  assert.equal(manifest.release, version, 'Source manifest release matches package');
  assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0, 'Source integrity manifest is populated');
  const seen = new Set();
  for (const entry of manifest.files) {
    assert.equal(typeof entry.path, 'string');
    const target = path.resolve(project, entry.path);
    assert.ok(inside(project, target) && !path.isAbsolute(entry.path) && !seen.has(entry.path), 'Source manifest path is safe and unique');
    seen.add(entry.path);
    const stat = await fs.stat(target);
    assert.equal(stat.isFile(), true, `${entry.path}: source file exists`);
    assert.equal(stat.size, entry.size, `${entry.path}: source size`);
    assert.equal(await sha256(target), entry.sha256, `${entry.path}: source SHA-256`);
  }
  return sha256(path.join(project, 'PAKET_BUTUNLUK.json'));
}

async function extractInstaller(project, installer, directory) {
  const require = createRequire(path.join(project, 'package.json'));
  // Reuse the exact builder toolset already used to create this installer;
  // this pinned builder verifies the download with its embedded SHA-256 list.
  assert.equal(Boolean(process.env.ELECTRON_BUILDER_7ZIP_PATH), false, 'Release acceptance uses the pinned builder 7zip toolset.');
  const path7za = await require('app-builder-lib/out/toolsets/7zip.js').getPath7za();
  // Standalone 7za supports the embedded application archive, but lacks the
  // NSIS decoder. Windows hosted runners also provide the full 7-Zip package.
  const path7z = path.join(process.env.ProgramFiles || 'C:\\Program Files', '7-Zip', '7z.exe');
  const outer = path.join(directory, 'nsis'), payload = path.join(directory, 'payload');
  await fs.mkdir(outer);
  await fs.mkdir(payload);
  const options = {windowsHide: true, shell: false, timeout: 180000, maxBuffer: 4 * 1024 * 1024};
  const {stdout: info} = await exec(path7z, ['i'], options);
  assert.match(info, /\bNsis\b/i, 'Full 7-Zip NSIS decoder is installed on the Windows runner.');
  const version = /7-Zip\s+(\d+\.\d+)/.exec(info)?.[1];
  assert.ok(version, 'Full 7-Zip version is readable.');
  await exec(path7z, ['x', '-y', `-o${outer}`, installer], options);
  const archives = [...await treeFiles(outer)].filter(([relative]) => /(?:^|\/)app-64\.7z$/i.test(relative));
  assert.equal(archives.length, 1, 'NSIS installer contains exactly one Windows x64 application payload');
  await exec(path7za, ['x', '-y', `-o${payload}`, archives[0][1].file], options);
  return {payload, extractionTools: {nsis: {file: '7z.exe', version, sha256: await sha256(path7z)}, embedded: {file: '7za.exe', source: 'app-builder-lib pinned checksum toolset', sha256: await sha256(path7za)}}};
}

export async function verifyWindowsArtifact({projectDir = process.cwd(), outputDir, commit, tag = null, platform = process.platform} = {}) {
  assert.equal(platform, 'win32', 'Windows artifact acceptance requires a Windows runner.');
  assert.match(commit || '', /^[a-f\d]{40}$/i, 'An exact source commit is required.');
  const project = await fs.realpath(projectDir);
  const pkg = await readJson(path.join(project, 'package.json'));
  assert.match(pkg.version, /^1\.0\.0-rc\.\d+$/);
  if (tag !== null) assert.equal(tag, `v${pkg.version}`, 'Release tag must identify the built package version.');
  const {stdout} = await exec('git', ['rev-parse', 'HEAD'], {cwd: project, shell: false, windowsHide: true});
  assert.equal(stdout.trim(), commit, 'Build commit matches the exact checkout.');
  const manifestSha256 = await verifySourceManifest(project, pkg.version);
  const build = await readJson(path.join(project, 'dist-desktop', 'latest-build.json'));
  assert.equal(build.version, pkg.version);
  const parent = path.join(project, 'dist-desktop');
  const installer = await fs.realpath(build.installer), unpacked = path.join(build.output, 'win-unpacked');
  assert.ok(inside(parent, installer) && inside(parent, path.resolve(build.output)) && inside(path.resolve(build.output), installer), 'Build receipt paths stay inside packaging output.');
  assert.equal(path.basename(installer), `DentAYA-Setup-${pkg.version}.exe`);
  const {verifyPe} = await import('./package-windows.mjs');
  const installerPe = await verifyPe(installer);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dentaya-installer-acceptance-'));
  try {
    const {payload, extractionTools} = await extractInstaller(project, installer, temp);
    const executable = path.join(payload, 'DentAYA.exe');
    const executablePe = await verifyPe(executable, 0x8664);
    assert.equal(await sha256(executable), await sha256(path.join(unpacked, 'DentAYA.exe')), 'Actual installer executable matches builder output.');
    const resources = path.join(payload, 'resources');
    const asar = path.join(resources, 'app.asar');
    assert.equal(await sha256(asar), await sha256(path.join(unpacked, 'resources', 'app.asar')), 'Actual installer ASAR matches builder output.');
    // Scan all extracted payload paths, including native resources outside ASAR.
    for (const relative of (await treeFiles(payload)).keys()) {
      assert.equal(excludedEnvironment(relative), false, `Installer excludes environment files: ${relative}`);
      assert.equal(isModelWeight(relative), false, `Installer excludes model weights: ${relative}`);
    }
    const source = await verifyAsarSource(project, asar, pkg);
    const appNext = path.join(resources, 'app-next');
    const nextBuildId = (await fs.readFile(path.join(appNext, '.next', 'BUILD_ID'), 'utf8')).trim();
    assert.ok(nextBuildId);
    assert.equal(nextBuildId, build.buildId);
    assert.equal(nextBuildId, (await fs.readFile(path.join(project, '.next', 'BUILD_ID'), 'utf8')).trim());
    assert.equal((await readJson(path.join(appNext, 'package.json'))).version, pkg.version);
    // app-next contains the standalone tree plus explicitly copied static/public.
    const staged = path.join(temp, 'expected-next');
    await fs.cp(path.join(project, '.next', 'standalone'), staged, {recursive: true, dereference: true, filter: sourcePath => !excludedEnvironment(path.relative(path.join(project, '.next', 'standalone'), sourcePath))});
    const standaloneFiles = (await treeFiles(staged)).size;
    let staticFiles = 0, publicFiles = 0;
    for (const [name, target] of [['.next/static', '.next/static'], ['public', 'public']]) {
      try {
        const input = path.join(project, name);
        await fs.cp(input, path.join(staged, target), {recursive: true, dereference: true, filter: sourcePath => !excludedEnvironment(path.relative(input, sourcePath))});
        const count = (await treeFiles(input, {excludeEnv: true})).size;
        if (name === 'public') publicFiles = count; else staticFiles = count;
      } catch (error) {if (error.code !== 'ENOENT' || name !== 'public') throw error;}
    }
    await compareTrees(staged, appNext, 'Actual installer Next application');
    await compareTrees(appNext, path.join(unpacked, 'resources', 'app-next'), 'Builder Next application');
    const desktopSmoke = {...await smokeWindowsDesktop({executable, platform}), commit, version: pkg.version};
    const smokeReportBytes = JSON.stringify(desktopSmoke, null, 2) + '\n';
    const installerHash = await sha256(installer), installerStat = await fs.stat(installer);
    const receipt = {
      schemaVersion: 1, pass: true, commit, tag, version: pkg.version, buildId: nextBuildId,
      installer: {file: path.basename(installer), sha256: installerHash, bytes: installerStat.size, machine: installerPe?.machine ?? null},
      executable: {file: 'DentAYA.exe', sha256: await sha256(executable), machine: executablePe?.machine ?? 0x8664},
      source: {manifestSha256, releaseSha256: await sha256(path.join(project, 'src/lib/release.ts')), ...source},
      payload: {extractedFromInstaller: true, asarSha256: await sha256(asar), nextBuildId, standaloneFiles, staticFiles, publicFiles},
      extractionTools,
      desktopSmoke: {pass: true, report: 'desktop-smoke-report.json', sha256: digest(smokeReportBytes), routes: desktopSmoke.routes, freshProfile: true},
      claims: {windowsInstallerVerified: true, modelInferenceTested: false, liveOrganizationBackendTested: false},
    };
    const output = path.resolve(outputDir || path.join(project, 'ci-artifacts', 'windows-release'));
    assert.equal(inside(payload, output) || inside(unpacked, output), false, 'Release assets must stay outside application payload.');
    await fs.mkdir(output, {recursive: true});
    await fs.copyFile(installer, path.join(output, path.basename(installer)));
    await fs.writeFile(path.join(output, 'SHA256SUMS.txt'), `${installerHash}  ${path.basename(installer)}\n`);
    await fs.writeFile(path.join(output, 'desktop-smoke-report.json'), smokeReportBytes);
    await fs.writeFile(path.join(output, 'windows-build-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    return receipt;
  } finally {await fs.rm(temp, {recursive: true, force: true, maxRetries: 6, retryDelay: 500});}
}

async function main(args) {
  const options = {};
  const keys = {'--project': 'projectDir', '--output': 'outputDir', '--commit': 'commit', '--tag': 'tag'};
  for (let index = 0; index < args.length; index++) {
    assert.ok(Object.hasOwn(keys, args[index]) && args[index + 1] && !args[index + 1].startsWith('--'), `Invalid verifier argument: ${args[index]}`);
    options[keys[args[index]]] = args[++index];
  }
  const receipt = await verifyWindowsArtifact(options);
  console.log(`PASS: ${receipt.installer.file}; ${receipt.installer.sha256}; exact source ${receipt.commit}; installer-extracted desktop smoke passed.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {console.error(`Windows artifact verification failed: ${error.message}`); process.exitCode = 1;});
}
