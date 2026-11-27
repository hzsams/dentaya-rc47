import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'http://127.0.0.1:3074';
const backend = 'http://127.0.0.1:54321';
const output = process.env.DENTAYA_SCREENSHOT_DIR || path.join(os.tmpdir(), 'dentaya-scan-validation');
const playwright = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const { chromium } = playwright.default ?? playwright;
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const clinic = { id: id(1), org_type: 'clinic', name: 'Synthetic Clinic' };
const patient = { id: id(2), first_name: 'Example', last_name: 'Patient', external_ref: 'SYNTHETIC' };
const visit = { id: id(3), case_number: 'SCAN-TEST', patient_id: patient.id, patient_reference: 'SYNTHETIC', title: 'Scan fixture', tooth_codes: ['46'], status: 'design' };
const user = { id: id(4), email: 'scan-fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const writes = [], errors = [];

async function installBackend(page) {
  await page.route(`${backend}/**`, async route => {
    const request = route.request(), url = new URL(request.url());
    const table = url.pathname.split('/').at(-1), method = request.method();
    let body = [];
    if (method === 'OPTIONS') body = {};
    else if (url.pathname.startsWith('/auth/')) body = { user };
    else if (table === 'memberships') body = [{ organization_id: clinic.id, user_id: user.id, role: 'owner', status: 'active' }];
    else if (table === 'organizations') body = [clinic];
    else if (table === 'patients') body = [patient];
    else if (table === 'cases') body = [visit];
    else if (table === 'profiles') body = [{ id: user.id, full_name: 'Fixture Operator' }];
    else if (url.pathname.startsWith('/storage/v1/object/dentaya-files/') && method === 'POST') {
      writes.push({ table: 'storage', path: decodeURIComponent(url.pathname.slice('/storage/v1/object/dentaya-files/'.length)) });
      body = { Key: url.pathname, Id: id(5) };
    } else if (['scan_sessions', 'attachments'].includes(table) && method === 'POST') {
      writes.push({ table, payload: request.postDataJSON() });
    } else if (table === 'scan_sessions') {
      body = writes.filter(item => item.table === 'scan_sessions').map(item => ({ ...item.payload, id: id(6) }));
    }
    if (request.headers().accept?.includes('application/vnd.pgrst.object+json') && Array.isArray(body)) body = body[0] ?? null;
    await route.fulfill({ status: 200, json: body, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
  });
  await page.addInitScript(account => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal{visibility:hidden!important}';
      document.head.appendChild(style);
    });
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const payload = btoa(JSON.stringify({ sub: account.id, exp, aud: 'authenticated', role: 'authenticated' }));
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 86400, expires_at: exp, user: account }));
    localStorage.setItem('dentaya:locale:v1', 'tr');
    localStorage.setItem('dentaya:experience:v1', JSON.stringify({ motion: 'reduced' }));
  }, user);
  page.on('pageerror', error => errors.push(error.message));
}

const upperGeometry = new THREE.BoxGeometry(32, 18, 12);
const upper = {
  name: 'sentetik-ust.stl', mimeType: 'model/stl',
  buffer: Buffer.from(new STLExporter().parse(new THREE.Mesh(upperGeometry))),
};
upperGeometry.dispose();
const lower = {
  name: 'sentetik-alt.ply', mimeType: 'application/octet-stream',
  buffer: Buffer.from(`ply
format ascii 1.0
element vertex 4
property float x
property float y
property float z
element face 4
property list uchar int vertex_indices
end_header
0 0 0
32 0 0
0 18 0
0 0 12
3 0 2 1
3 0 1 3
3 0 3 2
3 1 2 3
`),
};

async function inspectLayout(page, width, height, resize = true) {
  if (resize) await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const evidence = await page.evaluate(() => {
    function bounds(selector) {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    }
    const canvas = document.querySelector('.scan-workspace-viewer canvas'), gl = canvas?.getContext('webgl2');
    return {
      width: innerWidth, height: innerHeight,
      devicePixelRatio,
      documentWidth: document.documentElement.scrollWidth,
      studio: bounds('.scan-studio'), viewer: bounds('.scan-workspace-viewer'), save: bounds('[data-scan-save]'),
      webGL: Boolean(gl) && !gl.isContextLost(), pixels: [gl?.drawingBufferWidth, gl?.drawingBufferHeight],
    };
  });
  assert.equal(evidence.width, width);
  assert.equal(evidence.height, height);
  assert.ok(evidence.documentWidth <= width + 1, `No horizontal overflow at ${width}×${height}: ${JSON.stringify(evidence)}`);
  assert.ok(evidence.webGL && evidence.pixels.every(value => value > 0), 'The SCAN viewer renders with WebGL2');
  assert.ok(evidence.viewer.width > evidence.studio.width * 0.64 && evidence.viewer.height >= 350, 'The model has the main working area');
  for (const key of ['viewer', 'save']) {
    const rect = evidence[key];
    assert.ok(rect && rect.left >= -1 && rect.right <= width + 1 && rect.top >= -1 && rect.bottom <= height + 1,
      `${key} fits on screen at ${width}×${height}: ${JSON.stringify(evidence)}`);
  }
  return evidence;
}

let server, browser, log = '', serverExit;
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3074'], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: backend, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dentaya-scan-fixture' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { log = (log + data).slice(-20000); });
  server.on('exit', code => { serverExit = code ?? 1; });
  const deadline = Date.now() + 65000;
  let ready = false;
  while (Date.now() < deadline) {
    if (serverExit !== undefined) throw Error(log);
    try { if ((await fetch(`${base}/scan-studio`, { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch (error) {
      if (Date.now() >= deadline) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Scan editor server did not start');
  browser = await chromium.launch({
    headless: true,
    ...(process.env.DENTAYA_CHROMIUM_PATH ? { executablePath: process.env.DENTAYA_CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20000);
  await installBackend(page);
  await page.goto(`${base}/scan-studio?case=${visit.id}`);
  const studio = page.locator('.scan-studio'), save = studio.locator('[data-scan-save]');
  const fileInput = studio.locator('[data-scan-file]').and(studio.getByLabel('STL / PLY dosyası', { exact: true }));
  const stage = name => studio.getByRole('button', { name, exact: true });
  const viewer = studio.locator('.scan-workspace-viewer');
  const visibleFile = name => viewer.locator('.scan-view-caption').filter({ hasText: name });
  const triangles = count => page.waitForFunction(expected => Number(document.querySelector('.scan-workspace-viewer')?.dataset.scanTriangles) === expected, count);
  const open = async name => {
    await studio.getByRole('button', { name, exact: true }).click();
    const dialog = page.getByRole('dialog', { name, exact: true });
    await dialog.waitFor();
    return dialog;
  };
  const close = async dialog => { await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); };
  await studio.waitFor();
  await studio.locator('.scan-stage').first().waitFor();
  assert.ok(await save.isDisabled(), 'No save with an empty slot');
  assert.equal(await studio.getByText('Bağlı', { exact: true }).count(), 0, 'No connected-device claim without an SDK');
  assert.equal(await studio.getByText('98%', { exact: true }).count(), 0, 'No default measured quality claim');

  await stage('Üst çene').click();
  await fileInput.setInputFiles(upper);
  await visibleFile(upper.name).waitFor();
  await triangles(12);
  assert.ok(await save.isDisabled(), 'Valid STL alone cannot bypass the millimetre gate');
  const geometry = await open('Geometri kontrolü');
  await geometry.getByText('12', { exact: true }).first().waitFor();
  await close(geometry);
  let records = await open('Kayıt bilgileri');
  const unit = records.locator('[data-scan-unit]');
  assert.equal(await unit.isChecked(), false);
  await unit.check();
  await close(records);
  assert.equal(await save.isEnabled(), true);

  await stage('Alt çene').click();
  assert.ok(await save.isDisabled(), 'Changing stage cannot reuse an approved upper file');
  await fileInput.setInputFiles(lower);
  await visibleFile(lower.name).waitFor();
  await triangles(4);
  assert.ok(await save.isDisabled(), 'The PLY file needs separate unit confirmation');
  const canvas = viewer.locator('canvas');
  const originalView = await canvas.screenshot();
  const canvasBounds = await canvas.boundingBox();
  const dragX = canvasBounds.x + canvasBounds.width * .45;
  const dragY = canvasBounds.y + canvasBounds.height * .45;
  await page.mouse.move(dragX, dragY);
  await page.mouse.down();
  await page.mouse.move(dragX + 100, dragY + 48, { steps: 6 });
  await page.mouse.up();
  assert.ok(!originalView.equals(await canvas.screenshot()), 'Orbit changes the rendered mesh');
  await stage('Kapanış').click();
  assert.ok(await save.isDisabled(), 'An empty bite slot cannot save the lower file');
  await fileInput.setInputFiles({ name: 'unsupported.obj', mimeType: 'text/plain', buffer: Buffer.from('v 0 0 0\n') });
  await studio.getByText('Bu sürüm yalnızca STL ve PLY mesh dosyalarını kabul eder.', { exact: true }).waitFor();
  assert.ok(await save.isDisabled(), 'Unsupported files cannot open the record gate');
  assert.ok(!Number(await viewer.getAttribute('data-scan-triangles')), 'The rejected file leaves no stale geometry evidence');

  await stage('Üst çene').click();
  await visibleFile(upper.name).waitFor();
  await triangles(12);
  assert.ok(await save.isEnabled(), 'Returning to an upper draft retains its own explicit unit approval');
  await fs.mkdir(output, { recursive: true });
  // A bundled, attributed research scan makes the visual evidence reflect actual dental geometry.
  await fileInput.setInputFiles(path.join(root, 'public', 'training-scans', '605.stl'));
  await page.waitForFunction(() => Number(document.querySelector('.scan-workspace-viewer')?.dataset.scanTriangles) > 10000);
  assert.ok(await save.isDisabled(), 'Replacing a draft requires consent for the new file');
  const layout = [];
  for (const [width, height] of [[1366, 768], [1600, 900], [1920, 1080], [3840, 2160]]) {
    layout.push(await inspectLayout(page, width, height));
    await page.screenshot({ path: path.join(output, `scan-studio-${width}x${height}.png`), animations: 'disabled', timeout: 35000 });
  }
  const zoom = await page.context().newCDPSession(page);
  await zoom.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1.25, mobile: false });
  try {
    const scaled = await inspectLayout(page, 1280, 720, false);
    assert.equal(scaled.devicePixelRatio, 1.25);
    layout.push(scaled);
  } finally {
    await zoom.send('Emulation.clearDeviceMetricsOverride');
    await zoom.detach();
  }

  await studio.getByRole('button', { name: 'Dosyayı kaldır', exact: true }).click();
  assert.ok(await save.isDisabled());
  await stage('Alt çene').click();
  await visibleFile(lower.name).waitFor();
  await triangles(4);
  records = await open('Kayıt bilgileri');
  assert.equal(await records.locator('[data-scan-unit]').isChecked(), false);
  await records.locator('[data-scan-unit]').check();
  await close(records);
  assert.deepEqual(writes, [], 'Preview, stage switching and local confirmation make no writes');
  await save.click();
  await page.waitForURL(url => url.pathname === '/scans' && url.searchParams.get('patient') === patient.id);
  assert.deepEqual(writes.map(item => item.table), ['storage', 'scan_sessions', 'attachments']);
  const [storage, scan, attachment] = writes;
  for (const payload of [scan.payload, attachment.payload]) {
    assert.equal(payload.patient_id, patient.id);
    assert.equal(payload.case_id, visit.id);
    assert.equal(payload.file_name, lower.name);
    assert.equal(payload.storage_path, storage.path);
  }
  assert.equal(scan.payload.arch, 'lower');
  assert.equal(scan.payload.triangle_count, 4);
  assert.equal(scan.payload.metrics.unit_confirmed, true);
  assert.equal(scan.payload.completeness_score, null);
  assert.equal(scan.payload.scanner_brand, null);
  assert.equal(scan.payload.scanner_model, null);
  assert.equal(scan.payload.capture_method, 'import');
  assert.deepEqual(errors, []);
  const report = { pass: true, layout, realMeshPreview: true, distinctDrafts: true, unitGate: true, invalidFileRejected: true, explicitSingleSave: true, metadataOnlyWhenEntered: true, backend: 'intercepted synthetic Supabase fixture' };
  await fs.writeFile(path.join(output, 'scan-studio-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error);
  if (log) console.error(log);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill();
}
