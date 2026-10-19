import {spawn, execFile} from 'node:child_process';
import {createRequire} from 'node:module';
import {openSync, writeSync, closeSync} from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {promisify} from 'node:util';

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export function supportsNode(version = process.versions.node) {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number);
  return Number.isInteger(major) && Number.isInteger(minor) && (major > 22 || (major === 22 && minor >= 12));
}
const inside = (parent, file) => {
  const relative = path.relative(parent, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

async function requireFile(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size === 0) throw new Error(`Eksik veya bos dosya: ${file}`);
}

async function verifyPe(file, expectedMachine) {
  const handle = await fs.open(file, 'r');
  try {
    const dos = Buffer.alloc(64);
    if ((await handle.read(dos, 0, 64, 0)).bytesRead !== 64 || dos.toString('ascii', 0, 2) !== 'MZ') {
      throw new Error(`Gecerli bir Windows dosyasi degil: ${file}`);
    }
    if (expectedMachine !== undefined) {
      const pe = Buffer.alloc(6);
      if ((await handle.read(pe, 0, 6, dos.readUInt32LE(60))).bytesRead !== 6 || pe.readUInt32LE(0) !== 0x4550 || pe.readUInt16LE(4) !== expectedMachine) {
        throw new Error(`Windows x64 Electron dagitimi gerekli: ${file}`);
      }
    }
  } finally {
    await handle.close();
  }
}

export function electronInstallEnvironment(source = process.env) {
  const env = {...source};
  for (const key of Object.keys(env)) {
    if (/^(ELECTRON_SKIP_BINARY_DOWNLOAD|ELECTRON_OVERRIDE_DIST_PATH|ELECTRON_CUSTOM_VERSION|ELECTRON_INSTALL_ARCH|ELECTRON_INSTALL_PLATFORM|npm_config_arch|npm_config_platform)$/i.test(key)) delete env[key];
  }
  return {...env, ELECTRON_INSTALL_ARCH: 'x64', ELECTRON_INSTALL_PLATFORM: 'win32', npm_config_arch: 'x64', npm_config_platform: 'win32'};
}

export async function probeElectronVersion(executable) {
  const env = {...process.env};
  for (const key of Object.keys(env)) if (key.toUpperCase() === 'ELECTRON_RUN_AS_NODE') delete env[key];
  const {stdout} = await promisify(execFile)(executable, ['--version'], {
    env, encoding: 'utf8', windowsHide: true, shell: false, timeout: 20000, maxBuffer: 1024 * 1024,
  });
  const version = /^v?(\d+\.\d+\.\d+)$/.exec(stdout.trim())?.[1];
  if (!version) throw new Error('Electron calistirilabilirinden surum okunamadi.');
  return version;
}

async function runtimeCandidates(req, electronDir) {
  const candidates = [];
  try {
    // The public package API also supports distributions stored in a cache,
    // instead of assuming all releases always install into electron/dist.
    const entry = req.resolve('electron');
    delete req.cache[entry];
    const exported = req('electron');
    const executable = typeof exported === 'string' ? exported : exported?.default;
    if (typeof executable === 'string' && path.isAbsolute(executable) && path.basename(executable).toLowerCase() === 'electron.exe') candidates.push(path.dirname(executable));
  } catch {
    // A package with no installed binary can throw from require('electron').
    // The explicit installer below handles that case.
  }
  return [...new Set([...candidates, path.join(electronDir, 'dist')])];
}

async function validateRuntime(dist, version, probe) {
  const executable = path.join(dist, 'electron.exe');
  await verifyPe(executable, 0x8664);
  await verifyPe(path.join(dist, 'd3dcompiler_47.dll'));
  for (const name of ['icudtl.dat', 'chrome_100_percent.pak', 'resources/default_app.asar']) await requireFile(path.join(dist, name));
  let installed;
  try {installed = (await fs.readFile(path.join(dist, 'version'), 'utf8')).trim();}
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Do not manufacture a version marker or reject an otherwise valid
    // distribution just because that optional file is absent.
    installed = await probe(executable);
  }
  if (installed !== version) throw new Error('Kurulu Electron surumu kaynak paketle eslesmiyor.');
}

export function runElectronInstaller(installer, {cwd, logPath, env}) {
  return runLoggedProcess(process.execPath, [installer], {cwd, logPath, env, timeout: 15 * 60 * 1000});
}

async function ensureElectronRuntime(info, {prepare, install, probe, log}) {
  const {project, req, electronDir, electron, electronVersion} = info;
  const findReady = async () => {
    let failure;
    for (const candidate of await runtimeCandidates(req, electronDir)) {
      try {await validateRuntime(candidate, electronVersion, probe); return candidate;}
      catch (error) {failure ??= error;}
    }
    throw failure ?? new Error('Electron dagitimi bulunamadi.');
  };
  try {return {dist: await findReady()};}
  catch (error) {if (!prepare) throw error;}

  // Invoke only the installed, version-pinned package's own installer. New
  // Electron packages declare install-electron; older packages use install.js.
  const relative = electron.bin?.['install-electron'] ?? 'install.js';
  if (typeof relative !== 'string') throw new Error('Electron kurulum komutu gecersiz.');
  const installer = path.resolve(electronDir, relative);
  if (!inside(electronDir, installer)) throw new Error('Electron kurulum komutu paket klasoru disinda.');
  await requireFile(installer);
  const parent = path.join(project, 'dist-desktop');
  await fs.mkdir(parent, {recursive: true});
  const setup = await fs.mkdtemp(path.join(parent, 'electron-setup-'));
  const logPath = path.join(setup, 'electron-install.log');
  log(`Electron ${electronVersion} dagitimi eksik veya gecersiz; kendi kurulum betigi calistiriliyor.\nGunluk: ${logPath}`);
  try {
    // Older installers only check the EXE and may skip an incomplete dist.
    // Preserve that package-local directory so they perform a complete install.
    const localDist = path.join(electronDir, 'dist');
    try {
      await fs.lstat(localDist);
      const backup = path.join(electronDir, `dist.dentaya-backup-${randomUUID()}`);
      await fs.rename(localDist, backup);
      log(`Eksik eski Electron dagitimi korundu: ${backup}`);
    } catch (error) {if (error.code !== 'ENOENT') throw error;}
    const result = await install(installer, {cwd: electronDir, project, logPath, env: electronInstallEnvironment()});
    if (result.code !== 0) throw new Error(`Kurulum cikis kodu: ${result.code ?? result.signal}`);
    const dist = await findReady();
    log('Electron dagitimi dogrulandi. Paketlemeye geciliyor.');
    return {dist, electronInstallLog: logPath};
  } catch (error) {
    throw new Error(`Electron kurulumu tamamlanamadi: ${error.message}\nGunluk: ${logPath}`, {cause: error});
  }
}

export async function inspectProject(projectDir, {prepareElectron = false, install = runElectronInstaller, probe = probeElectronVersion, log = console.log} = {}) {
  const project = await fs.realpath(projectDir);
  const pkg = await readJson(path.join(project, 'package.json'));
  if (pkg.name !== 'dentaya-production-rc' || !/^1\.0\.0-rc\.\d+$/.test(pkg.version)) {
    throw new Error('Bu klasor bir DentAYA RC kaynak/derleme klasoru degil.');
  }
  const version = pkg.devDependencies?.electron;
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Sabit Electron surumu bulunamadi.');
  const standalone = path.join(project, '.next', 'standalone');
  await requireFile(path.join(standalone, 'server.js'));
  await requireFile(path.join(standalone, 'node_modules', 'next', 'package.json'));
  const buildId = (await fs.readFile(path.join(project, '.next', 'BUILD_ID'), 'utf8')).trim();
  const standaloneId = (await fs.readFile(path.join(standalone, '.next', 'BUILD_ID'), 'utf8')).trim();
  if (!buildId || buildId !== standaloneId || (await readJson(path.join(standalone, 'package.json'))).version !== pkg.version) {
    throw new Error('Hazir Next derlemesi bu surumle eslesmiyor. once npm run build calistirin.');
  }
  if (!(await fs.stat(path.join(project, '.next', 'static'))).isDirectory()) throw new Error('Next static klasoru eksik.');
  const req = createRequire(path.join(project, 'package.json'));
  const electronPkg = req.resolve('electron/package.json');
  const electron = await readJson(electronPkg);
  if (electron.name !== 'electron' || electron.version !== version) {
    throw new Error('Kurulu Electron surumu kaynak paketle eslesmiyor. npm ci kurulumunu kontrol edin.');
  }
  const builderPkg = req.resolve('electron-builder/package.json');
  const builder = await readJson(builderPkg);
  const bin = typeof builder.bin === 'string' ? builder.bin : builder.bin?.['electron-builder'];
  if (!bin) throw new Error('electron-builder komutu bulunamadi.');
  const builderCli = path.resolve(path.dirname(builderPkg), bin);
  const baseConfig = path.join(project, 'electron-builder.yml');
  await requireFile(builderCli);
  await requireFile(baseConfig);
  const runtime = await ensureElectronRuntime({project, req, electronDir: path.dirname(electronPkg), electron, electronVersion: version}, {prepare: prepareElectron, install, probe, log});
  return {project, version: pkg.version, electronVersion: version, ...runtime, builderCli, baseConfig, buildId};
}

export function isFileLockFailure(text) {
  return /\b(?:EPERM|EBUSY|EACCES|ERROR_SHARING_VIOLATION)\b/i.test(text)
    && /win-unpacked|d3dcompiler_47\.dll|\.dll\b/i.test(text);
}

function runLoggedProcess(command, args, {cwd, logPath, env = process.env, timeout}) {
  return new Promise((resolve, reject) => {
    const fd = openSync(logPath, 'wx');
    let tail = '', settled = false;
    const child = spawn(command, args, {
      cwd, env, timeout, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      closeSync(fd);
      if (error) reject(error); else resolve(result);
    };
    const capture = (chunk, output) => {
      if (settled) return;
      tail = (tail + chunk.toString()).slice(-65536);
      try {writeSync(fd, chunk); output.write(chunk);} catch (error) {child.kill(); finish(error);}
    };
    child.stdout.on('data', chunk => capture(chunk, process.stdout));
    child.stderr.on('data', chunk => capture(chunk, process.stderr));
    child.once('error', error => finish(error));
    child.once('close', (code, signal) => finish(null, {code, signal, tail}));
  });
}

export function runBuilder(cli, configFile, {project, logPath}) {
  return runLoggedProcess(process.execPath, [cli, '--win', 'nsis', '--x64', '--publish', 'never', '--config', configFile], {cwd: project, logPath});
}

export async function packageWindows({projectDir = process.cwd(), platform = process.platform, run = runBuilder, install = runElectronInstaller, probe = probeElectronVersion, sleep = delay, log = console.log} = {}) {
  if (!supportsNode()) throw new Error('Bu Electron surumu icin Node.js 22.12.0 veya daha yeni surum gerekli.');
  if (platform !== 'win32') throw new Error('Windows kurulumu Windows uzerinde uretilmelidir.');
  const info = await inspectProject(projectDir, {prepareElectron: true, install, probe, log});
  const parent = path.join(info.project, 'dist-desktop');
  await fs.mkdir(parent, {recursive: true});
  const session = await fs.mkdtemp(path.join(parent, 'package-'));
  const installerName = `DentAYA-Setup-${info.version}.exe`;
  const logs = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Never clean/reuse the directory whose DLL Windows is still holding.
    const output = path.join(session, `attempt-${attempt}`);
    await fs.mkdir(output);
    const configFile = path.join(output, 'packaging-config.json');
    const logPath = path.join(output, 'packaging.log');
    logs.push(logPath);
    await fs.writeFile(configFile, JSON.stringify({
      extends: info.baseConfig, electronDist: info.dist, electronVersion: info.electronVersion,
      directories: {output},
    }, null, 2) + '\n', {flag: 'wx'});
    log(`DentAYA: kurulu Electron ${info.electronVersion}; paketleme ${attempt}/3.\nCikti: ${output}`);
    const result = await run(info.builderCli, configFile, {project: info.project, logPath});
    if (result.code === 0) {
      const installer = path.join(output, installerName);
      await requireFile(installer);
      await verifyPe(installer);
      const receipt = {version: info.version, buildId: info.buildId, installer, output, logs, ...(info.electronInstallLog ? {electronInstallLog: info.electronInstallLog} : {})};
      const temp = path.join(parent, `.latest-build-${randomUUID()}.json`);
      try {
        await fs.writeFile(temp, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
        await fs.rename(temp, path.join(parent, 'latest-build.json'));
      } finally {await fs.rm(temp, {force: true});}
      log(`Kurulum dosyasi hazir: ${installer}`);
      return receipt;
    }
    if (attempt === 3 || !isFileLockFailure(result.tail)) {
      throw new Error(`Paketleme tamamlanamadi (kod ${result.code ?? result.signal}). Gunluk: ${logPath}`);
    }
    log('Gecici DLL erisim hatasi. Bekleyip yeni bir cikti klasorunde yeniden deneniyor.');
    await sleep(attempt * 1500);
  }
}

export async function showResult(projectDir, reveal = false, log = console.log) {
  const project = await fs.realpath(projectDir);
  const pkg = await readJson(path.join(project, 'package.json'));
  const parent = path.join(project, 'dist-desktop');
  const receipt = await readJson(path.join(parent, 'latest-build.json'));
  if (receipt.version !== pkg.version || !inside(parent, receipt.installer) || path.basename(receipt.installer) !== `DentAYA-Setup-${pkg.version}.exe`) {
    throw new Error('Gecerli kurulum sonucu bulunamadi.');
  }
  await requireFile(receipt.installer);
  await verifyPe(receipt.installer);
  log(`Kurulum dosyasi: ${receipt.installer}`);
  if (reveal && process.platform === 'win32') {
    const explorer = spawn('explorer.exe', ['/select,', receipt.installer], {detached: true, stdio: 'ignore', shell: false});
    explorer.on('error', () => log('Gezgin acilamadi; yukaridaki kurulum yolunu kullanin.'));
    explorer.unref();
  }
  return receipt;
}

async function main(args) {
  if (args.length === 1 && args[0] === '--check-node') {
    if (!supportsNode()) throw new Error('Node.js 22.12.0 veya daha yeni surum gerekli.');
    return;
  }
  let projectDir = process.cwd(), show = false, reveal = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) projectDir = args[++i];
    else if (args[i] === '--show-result') show = true;
    else if (args[i] === '--reveal') reveal = true;
    else throw new Error(`Bilinmeyen secenek: ${args[i]}`);
  }
  if (!show) await packageWindows({projectDir});
  if (show || reveal) await showResult(projectDir, reveal);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`DentAYA paketleme hatasi: ${error.message}`);
    process.exitCode = 1;
  });
}
