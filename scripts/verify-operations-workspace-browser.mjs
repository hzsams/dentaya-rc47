import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Real /operations route, synthetic intercepted Supabase HTTP; no live institution acceptance.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwright = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const { chromium } = playwright.default ?? playwright;
const base = 'http://127.0.0.1:3059';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const version = '2026-10-26T08:00:00.000Z';
const user = { id: id(1), email: 'work-tracking@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: version };
const organization = { id: id(2), name: 'Synthetic Operations Lab', org_type: 'laboratory' };
const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
const cases = [
  { id: id(3), case_number: 'R58-LATE', title: 'Synthetic overdue case', status: 'production', priority: 'urgent', due_date: yesterday },
  { id: id(4), case_number: 'R58-REV', title: 'Synthetic revision', status: 'design', priority: 'high', due_date: tomorrow },
  { id: id(5), case_number: 'R58-APPROVAL', title: 'Synthetic approval', status: 'approval', priority: 'normal', due_date: tomorrow },
  { id: id(6), case_number: 'R58-QC', title: 'Synthetic quality control', status: 'qc', priority: 'normal', due_date: tomorrow },
].map(row => ({ ...row, lab_org_id: organization.id, created_at: version, updated_at: version }));
const reviews = [{ case_id: id(4), version_number: 2, status: 'revision_requested', submitted_at: version, reviewed_at: version, updated_at: version }];
const shipments = [
  { id: id(7), case_id: id(3), tracking_code: 'R58-DELIVERY', status: 'in_transit', eta_at: new Date(Date.now() - 3600000).toISOString(), remaining_duration_seconds: 600, delivered_at: null, updated_at: version },
  { id: id(8), case_id: id(6), tracking_code: 'R58-PICKUP', status: 'pickup_requested', eta_at: new Date(Date.now() + 3600000).toISOString(), remaining_duration_seconds: 1800, delivered_at: null, updated_at: version },
];
let settings = { daily_case_capacity: 4, warning_load_percent: 75, target_turnaround_hours: 72, updated_at: version };
const fixture = { role: 'owner', writeMode: 'conflict', writes: [], reads: [], readFailure: false, holdRead: null, releaseRead: null, holdWrite: null, releaseWrite: null };
const errors = [], robotRequests = [];
let server, browser, log = '', serverExit = null;

async function installBackend(page) {
  await page.route('http://127.0.0.1:54321/**', async route => {
    const request = route.request(), url = new URL(request.url()), table = url.pathname.split('/').at(-1), method = request.method();
    let status = 200, result = [];
    if (method === 'OPTIONS') result = {};
    else if (url.pathname.startsWith('/auth/')) result = { user };
    else if (table === 'memberships') result = [{ organization_id: organization.id, user_id: user.id, role: fixture.role, status: 'active' }];
    else if (table === 'profiles') result = [{ id: user.id, full_name: 'Synthetic Technician' }];
    else if (table === 'organizations') result = [organization];
    else if (table === 'cases') { fixture.reads.push({ table, organization: url.searchParams.get('lab_org_id') }); result = cases; }
    else if (table === 'case_design_reviews') result = reviews;
    else if (table === 'shipments') result = shipments;
    else if (table === 'organization_operations_settings') {
      if (method === 'PATCH' || method === 'POST') {
        const payload = request.postDataJSON();
        fixture.writes.push({ method, payload, organization: url.searchParams.get('organization_id'), version: url.searchParams.get('updated_at') });
        if (fixture.holdWrite) await fixture.holdWrite;
        if (fixture.writeMode === 'success' && (method === 'POST' || url.searchParams.get('updated_at') === `eq.${settings?.updated_at}`)) {
          settings = { ...settings, ...payload, updated_at: new Date(Date.parse(settings?.updated_at ?? version) + 3600000).toISOString() };
          result = [{ updated_at: settings.updated_at }];
        } else if (fixture.writeMode === 'duplicate') { status = 409; result = { code: '23505', message: 'Synthetic concurrent insert' }; }
        else result = [];
      } else {
        fixture.reads.push({ table, organization: url.searchParams.get('organization_id') });
        if (fixture.holdRead) await fixture.holdRead;
        if (fixture.readFailure) { status = 503; result = { message: 'Synthetic settings read failure', code: 'NETWORK_TEST' }; }
        else result = settings ? [settings] : [];
      }
    }
    if (request.headers().accept?.includes('application/vnd.pgrst.object+json')) result = Array.isArray(result) ? result[0] ?? null : result;
    await route.fulfill({ status, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' }, body: JSON.stringify(result) });
  });
  await page.addInitScript(({ user }) => {
    const expiry = Math.floor(Date.now() / 1000) + 86400;
    const payload = btoa(JSON.stringify({ sub: user.id, exp: expiry, aud: 'authenticated', role: 'authenticated' }));
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 86400, expires_at: expiry, user }));
    localStorage.setItem('dentaya:locale:v1', 'tr');
    localStorage.setItem('dentaya:experience:v1', JSON.stringify({ motion: 'reduced' }));
  }, { user });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/aya\/aya-(?:idle|thinking|ready|alert|character-board)\.(?:png|webp)/.test(decodeURIComponent(request.url()))) robotRequests.push(request.url()); });
}

async function ready(page) {
  await page.goto(`${base}/operations`);
  await page.locator('main.operations-workspace').waitFor();
  await page.getByRole('heading', { name: 'İş takibi', exact: true }).waitFor();
}

try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3059'], { cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dentaya-synthetic-operations-fixture' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { log = (log + data).slice(-20000); });
  server.on('exit', code => { serverExit = code; });
  const deadline = Date.now() + 65000;
  let serverReady = false;
  while (Date.now() < deadline) {
    if (serverExit !== null) throw Error(log);
    try { if ((await fetch(`${base}/operations`)).ok) { serverReady = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(serverReady, `Operations server did not become ready: ${log}`);
  browser = await chromium.launch({ headless: true, ...(process.env.DENTAYA_CHROMIUM_PATH ? { executablePath: process.env.DENTAYA_CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000); await installBackend(page); await ready(page);
  const main = page.locator('main.operations-workspace');
  const capacity = main.getByLabel('Günlük kapasite', { exact: true });
  const warning = main.getByLabel('Uyarı eşiği %', { exact: true });
  const save = main.getByRole('button', { name: 'Kapasiteyi Kaydet', exact: true });
  const reload = main.getByRole('button', { name: 'Veriyi Yenile', exact: true });
  const queue = main.locator('.operations-attention-list');
  assert.equal(await main.locator('.operations-metrics article').count(), 8, 'All existing operational metrics remain available');
  assert.equal(await main.locator('.pipeline-grid > div').count(), 8, 'The complete case pipeline remains available');
  assert.equal(await main.locator('.module-quick-link').count(), 4);
  assert.equal(await main.locator('.aya-motion, .aya-orbit, img[alt^="AYA "]').count(), 0);
  assert.equal(await main.getByText(/OPERASYON KONTROL MERKEZİ|Günün bütün akışı tek ekranda|AYA · GÜNLÜK ÖNCELİK|AYA · Yerel|OPERASYON RİSKİ/).count(), 0);
  const header = await main.locator('header').evaluate(node => ({ height: node.getBoundingClientRect().height, titleSize: parseFloat(getComputedStyle(node.querySelector('h1')).fontSize) }));
  assert.ok(header.height <= 100 && header.titleSize <= 28, `Work tracking has a compact work header: ${JSON.stringify(header)}`);
  assert.equal(await capacity.inputValue(), '4');
  assert.ok(fixture.reads.some(read => read.table === 'cases' && read.organization === `eq.${organization.id}`), 'Cases remain scoped to the laboratory');
  assert.ok(fixture.reads.some(read => read.table === 'organization_operations_settings' && read.organization === `eq.${organization.id}`));

  const search = main.getByRole('textbox', { name: 'Vaka / gönderi ara', exact: true });
  await search.fill('R58-REV');
  await queue.getByRole('link', { name: /R58-REV/ }).waitFor();
  assert.equal(await queue.getByRole('link').count(), 1);
  assert.equal(await queue.getByRole('link').getAttribute('href'), `/design?case=${id(4)}`);
  await search.fill(''); await main.getByRole('button', { name: 'Kurye', exact: true }).click();
  assert.equal(await queue.getByRole('link').count(), 2, 'The shipment filter retains late and pickup queues');
  await main.getByRole('button', { name: 'Kritik', exact: true }).click();
  assert.equal(await queue.getByRole('link').count(), 3, 'Late cases, delayed delivery and full capacity remain critical');
  await main.getByRole('button', { name: 'Tümü', exact: true }).click();
  assert.equal(await queue.getByRole('link', { name: /R58-LATE/ }).getAttribute('href'), `/cases/${id(3)}`);

  await capacity.fill('8'); await warning.fill('85');
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  await save.click(); await main.getByText('Kapasite ayarı için bağlantı gerekli. Taslağınız korundu.', { exact: true }).waitFor();
  assert.equal(fixture.writes.length, 0); assert.equal(await capacity.inputValue(), '8');
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }));
  await save.click(); await main.getByText(/Kapasite ayarı başka bir oturumda değiştirildi/).waitFor();
  assert.equal(await capacity.inputValue(), '8', 'A zero-row concurrent update retains the capacity draft');
  assert.equal(fixture.writes[0].version, `eq.${version}`);
  assert.equal(fixture.writes[0].organization, `eq.${organization.id}`);
  assert.equal(settings.daily_case_capacity, 4);
  page.once('dialog', dialog => dialog.dismiss()); await reload.click();
  assert.equal(await capacity.inputValue(), '8', 'Cancelling reload preserves the capacity draft');

  fixture.writeMode = 'success'; fixture.writes.length = 0;
  fixture.holdWrite = new Promise(resolve => { fixture.releaseWrite = resolve; });
  await save.evaluate(button => { button.click(); button.click(); });
  await main.getByRole('button', { name: 'Kaydediliyor…', exact: true }).waitFor();
  assert.equal(await capacity.isDisabled(), true); assert.equal(await reload.isDisabled(), true);
  fixture.releaseWrite(); fixture.holdWrite = null;
  await main.getByText('Operasyon kapasitesi güncellendi.', { exact: true }).waitFor();
  assert.equal(fixture.writes.length, 1, 'A synchronous double click sends one capacity write');
  assert.equal(settings.daily_case_capacity, 8); assert.equal(settings.warning_load_percent, 85);
  assert.equal(fixture.writes[0].payload.updated_by, user.id);
  assert.ok(!('created_by' in fixture.writes[0].payload), 'Updating capacity does not replace its creator');
  await capacity.fill('9'); await save.click();
  await main.getByText('Operasyon kapasitesi güncellendi.', { exact: true }).waitFor();
  assert.equal(fixture.writes[1].version, 'eq.2026-10-26T09:00:00.000Z', 'The next write uses the server-confirmed version');

  fixture.holdRead = new Promise(resolve => { fixture.releaseRead = resolve; });
  await reload.click(); await main.getByRole('button', { name: 'Yenileniyor…', exact: true }).waitFor();
  assert.equal(await capacity.isDisabled(), true); assert.equal(await save.isDisabled(), true);
  fixture.releaseRead(); fixture.holdRead = null;
  await reload.waitFor(); await page.waitForFunction(() => !document.querySelector('.capacity-controls input')?.disabled);
  fixture.readFailure = true; await reload.click(); await main.getByRole('status').waitFor();
  await reload.waitFor();
  assert.equal(await main.locator('.operations-metrics article').count(), 8, 'Failed refresh retains the previous metrics');
  assert.equal(await capacity.inputValue(), '9'); assert.equal(await save.isDisabled(), true, 'An incomplete settings refresh cannot save defaults');
  fixture.readFailure = false; await reload.click(); await page.waitForFunction(() => !document.querySelector('.capacity-controls input')?.disabled);

  if (process.env.DENTAYA_SCREENSHOT_DIR) { await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'RC58_Operations_Workspace.png'), fullPage: true }); }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile work tracking has no horizontal overflow');
  if (process.env.DENTAYA_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'RC58_Operations_Workspace_Mobile.png'), fullPage: true });

  fixture.role = 'member'; await ready(page);
  assert.equal(await main.locator('#capacity').count(), 1, 'Members retain read access to lab capacity');
  assert.equal(await main.locator('.capacity-controls').count(), 0, 'Only owners and admins can edit capacity');
  fixture.role = 'admin'; await ready(page); assert.equal(await capacity.isEnabled(), true);
  settings = null; await ready(page); assert.equal(await capacity.inputValue(), '24');
  await capacity.fill('12'); fixture.writeMode = 'duplicate';
  await save.click(); await main.getByText(/Kapasite ayarı başka bir oturumda değiştirildi/).waitFor();
  assert.equal(await capacity.inputValue(), '12', 'Concurrent first insert retains the draft');
  assert.equal(fixture.writes.at(-1).method, 'POST');
  assert.equal(fixture.writes.at(-1).payload.organization_id, organization.id);
  assert.equal(fixture.writes.at(-1).payload.created_by, user.id);
  assert.deepEqual(robotRequests, [], 'No retired robot artwork is requested');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ pass: true, status: 'pass', backend: 'synthetic intercepted Supabase HTTP', liveBackendVerified: false, robotRemoved: true, compactWorkspace: true, capacityPermissions: true, optimisticConcurrency: true, offlineDraft: true, duplicateWriteGuard: true, queueFilters: true, mobileOverflow: false }));
} catch (error) { console.error(log); throw error; }
finally {
  fixture.releaseRead?.(); fixture.releaseWrite?.();
  if (browser) await browser.close();
  if (server) { server.kill('SIGTERM'); await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]); }
}
