import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {verifyPe} from './package-windows.mjs';
import {verifyWindowsCiSource} from './verify-windows-ci-source.mjs';

const sha256 = data => createHash('sha256').update(data).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const check = (condition, message) => {if (!condition) throw Error(message);};

export async function prepareWindowsRelease({project = process.cwd(), releaseDir, nativeDir, commit, tag}, {verifySource = verifyWindowsCiSource, checkPe = verifyPe} = {}) {
  const source = await verifySource({project, commit, ref: `refs/tags/${tag}`});
  check([source.version, `v${source.version}`].includes(tag), 'A matching release tag is required.');
  const manifestData = await fs.readFile(path.join(project, 'PAKET_BUTUNLUK.json'));
  const manifest = JSON.parse(manifestData);
  check(manifest.release === source.version && Array.isArray(manifest.files) && manifest.files.length > 0, 'Invalid source integrity manifest.');
  for (const item of manifest.files) {
    const relative = path.normalize(item.path), target = path.resolve(project, relative);
    check(!path.isAbsolute(item.path) && !relative.startsWith('..') && target.startsWith(path.resolve(project) + path.sep), 'Unsafe source manifest path.');
    const data = await fs.readFile(target);
    check(data.length === item.size && sha256(data) === item.sha256, `Source integrity mismatch: ${item.path}`);
  }
  const receipt = await json(path.join(releaseDir, 'windows-build-receipt.json'));
  check(receipt.schemaVersion === 1 && receipt.pass === true && receipt.commit === commit && receipt.tag === tag && receipt.version === source.version, 'Build receipt does not identify this tagged source.');
  check(receipt.source?.manifestSha256 === sha256(manifestData), 'Receipt source manifest does not match this checkout.');
  check(receipt.payload?.extractedFromInstaller === true && receipt.payload.nextBuildId === receipt.buildId && typeof receipt.buildId === 'string' && receipt.buildId.length > 0, 'Installer payload was not verified.');
  check(receipt.desktopSmoke?.pass === true && receipt.desktopSmoke.freshProfile === true && receipt.desktopSmoke.report === 'desktop-smoke-report.json', 'Packaged desktop smoke evidence is missing.');
  const installerName = `DentAYA-Setup-${source.version}.exe`;
  check(receipt.installer?.file === installerName, 'Unexpected installer filename.');
  const installer = await fs.readFile(path.join(releaseDir, installerName));
  check(installer.length === receipt.installer.bytes && sha256(installer) === receipt.installer.sha256, 'Installer hash or size does not match its receipt.');
  const pe = await checkPe(path.join(releaseDir, installerName));
  check(pe.machine === receipt.installer.machine, 'Installer architecture does not match its receipt.');
  const sums = await fs.readFile(path.join(releaseDir, 'SHA256SUMS.txt'), 'utf8');
  check(sums.replace(/\r\n/g, '\n') === `${receipt.installer.sha256}  ${installerName}\n`, 'Installer checksum file does not match.');
  const smokeData = await fs.readFile(path.join(releaseDir, 'desktop-smoke-report.json'));
  check(sha256(smokeData) === receipt.desktopSmoke.sha256, 'Desktop smoke report hash does not match its receipt.');
  const smoke = JSON.parse(smokeData);
  check(smoke.pass === true && smoke.commit === commit && smoke.version === source.version && smoke.freshProfile === true && smoke.packagedServer === true && smoke.bridgeIpc === true && smoke.rendererExceptions === 0, 'Actual desktop smoke did not pass for this source.');
  for (const route of ['/workspace', '/ai', '/settings']) check(smoke.routes?.some(item => item.requested === route && item.documentReady === true && item.bridge === true && item.ipc === true && item.unauthenticated === true), `Desktop route was not checked: ${route}`);
  const provenance = await json(path.join(nativeDir, 'source-provenance.json'));
  check(provenance.commit === commit && provenance.version === source.version && provenance.job === 'windows-native' && /^\d+$/.test(provenance.runId), 'Native evidence belongs to another source or CI run.');
  const native = await json(path.join(nativeDir, 'windows-native-result.json'));
  const inference = await json(path.join(nativeDir, 'native-inference-report.json'));
  check(native.release === source.version && native.provenance === 'controlled-windows-native' && ['passed', 'failed', 'blocked'].includes(native.status), 'Actual Windows native result is missing.');
  check(native.semanticReviewRequired === true && native.semanticAcceptance === 'pending-human-review' && native.weightsIncludedInInstaller === false && inference.mock === false && inference.semanticReviewRequired === true, 'Native evidence must retain its semantic review limits.');
  if (native.status === 'passed') check(native.nativeInferenceObserved === true && inference.nativeInference === true && inference.contractPass === true && inference.caseCounts?.attempted === 9 && inference.caseCounts?.succeeded === 9, 'Native contract pass is not supported by actual inference evidence.');
  const nativeText = await fs.readFile(path.join(nativeDir, 'native-acceptance.txt'));
  check(nativeText.length > 0, 'Native diagnostic output is missing.');
  const names = [installerName, 'SHA256SUMS.txt', 'windows-build-receipt.json', 'desktop-smoke-report.json'];
  const nativeNames = ['native-inference-report.json', 'windows-native-result.json', 'native-acceptance.txt', 'source-provenance.json'];
  const assets = [];
  for (const [directory, files] of [[releaseDir, names], [nativeDir, nativeNames]]) for (const name of files) {
    const file = path.join(directory, name), stat = await fs.lstat(file);
    check(stat.isFile() && !stat.isSymbolicLink(), 'Release assets must be ordinary files.');
    const data = await fs.readFile(file);
    assets.push({name, file, data, sha256: sha256(data)});
  }
  const body = `Windows installer verified against source commit ${commit}. The executable extracted from this installer passed fresh-profile desktop checks for /workspace, /ai and /settings, including the real desktop bridge.\n\nReal Windows native AYA contract result: **${native.status}**. The attached reports contain the actual result. Model weights are downloaded separately and are absent from this installer and these assets.\n\nSemantic response quality still requires human review, including when the native contract passes. Clinical/production acceptance is not completed by these checks.\n\nVerify the installer with SHA256SUMS.txt before installing.`;
  return {commit, tag, version: source.version, nativeStatus: native.status, body, assets};
}

export async function publishWindowsRelease(input, {env = process.env, request = fetch, prepare = prepareWindowsRelease} = {}) {
  check(env.GITHUB_REF === `refs/tags/${input.tag}` && env.GITHUB_SHA === input.commit, 'Publishing is restricted to the exact tag workflow commit.');
  check(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY ?? '') && typeof env.GITHUB_TOKEN === 'string' && env.GITHUB_TOKEN.length > 0, 'GitHub release credentials or repository are missing.');
  const release = await prepare(input);
  const base = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  const headers = {Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  const api = async (url, options = {}, allowed = []) => {
    const response = await request(url, {...options, headers: {...headers, ...options.headers}, signal: AbortSignal.timeout(120000)});
    if (!response.ok && !allowed.includes(response.status)) throw Error(`GitHub release request failed (${response.status}).`);
    return response;
  };
  const existingResponse = await api(`${base}/releases/tags/${encodeURIComponent(release.tag)}`, {}, [404]);
  let remote = existingResponse.status === 404 ? null : await existingResponse.json();
  if (remote) {
    check(remote.tag_name === release.tag && remote.target_commitish === release.commit, 'Existing release belongs to a different source.');
    for (const asset of remote.assets ?? []) {
      const expected = release.assets.find(item => item.name === asset.name);
      check(expected && asset.digest === `sha256:${expected.sha256}`, 'Existing release assets differ; refusing to overwrite them.');
    }
    if (!remote.draft) {
      check(remote.assets.length === release.assets.length, 'Published release is incomplete; refusing to change it.');
      return {url: remote.html_url, unchanged: true};
    }
  } else {
    remote = await (await api(`${base}/releases`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tag_name: release.tag, target_commitish: release.commit, name: `DentAYA ${release.version} Windows`, body: release.body, draft: true, prerelease: true})})).json();
  }
  for (const asset of release.assets) {
    if (remote.assets?.some(item => item.name === asset.name)) continue;
    const uploadBase = remote.upload_url?.replace(/\{.*$/, '');
    check(typeof uploadBase === 'string' && uploadBase.startsWith(`https://uploads.github.com/repos/${env.GITHUB_REPOSITORY}/`), 'Unexpected GitHub release upload endpoint.');
    const uploaded = await (await api(`${uploadBase}?name=${encodeURIComponent(asset.name)}`, {method: 'POST', headers: {'Content-Type': 'application/octet-stream'}, body: asset.data})).json();
    check(uploaded.name === asset.name && uploaded.size === asset.data.length && uploaded.digest === `sha256:${asset.sha256}`, 'GitHub did not retain the expected asset bytes.');
  }
  const published = await (await api(`${base}/releases/${remote.id}`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({draft: false, prerelease: true, body: release.body})})).json();
  return {url: published.html_url, nativeStatus: release.nativeStatus};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {'release-dir': {type: 'string'}, 'native-dir': {type: 'string'}, commit: {type: 'string'}, tag: {type: 'string'}}});
  publishWindowsRelease({releaseDir: values['release-dir'], nativeDir: values['native-dir'], commit: values.commit, tag: values.tag}).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.message); process.exitCode = 1;});
}
