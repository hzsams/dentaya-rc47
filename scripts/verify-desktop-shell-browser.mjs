import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Real application routes, with synthetic Supabase HTTP responses only. The CAD
// geometry/save lifecycle is exercised separately by verify-cad-daily-browser.
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.DENTAYA_DESKTOP_BASE_URL || 'http://127.0.0.1:3064';
const screenshotDirectory = process.env.DENTAYA_SCREENSHOT_DIR || '/workspace/dentaya-desktop-ui-validation';
const playwright = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const { chromium } = playwright.default ?? playwright;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = { user: id(1), clinic: id(2), lab: id(3), patient: id(4), case: id(5), conversation: id(6) };
const timestamp = '2026-10-20T08:00:00.000Z';
const user = { id: ids.user, email: 'desktop-shell@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: timestamp };
const patient = { id: ids.patient, owning_org_id: ids.clinic, external_ref: 'SYNTHETIC-DESKTOP', first_name: 'Sentetik', last_name: 'Hasta', date_of_birth: null, sex: null, phone: null, email: null, blood_group: null, allergy_notes: null, medical_notes: null, dental_notes: null, consent_status: 'pending', demo_mode: false, created_at: timestamp };
const caseRow = { id: ids.case, case_number: 'DESKTOP-ONLY-001', clinic_org_id: ids.clinic, lab_org_id: ids.lab, patient_id: ids.patient, patient_reference: patient.external_ref, title: 'Sentetik masaüstü vakası', case_type: 'crown', priority: 'high', status: 'design', tooth_codes: ['11'], material: 'Zirconia', shade: 'A2', due_date: '2026-10-21', updated_at: timestamp };
const organizations = [{ id: ids.clinic, name: 'Sentetik Masaüstü Kliniği', org_type: 'clinic', demo_mode: false, country: 'TR' }, { id: ids.lab, name: 'Sentetik Laboratuvar', org_type: 'laboratory', demo_mode: false, country: 'TR' }];
const finance = { id: id(7), case_id: ids.case, patient_price: 1250.5, discount_amount: 0, paid_amount: 250, currency: 'EUR', payment_status: 'partial', overhead_pct: 20, target_margin_pct: 35, notes: null, updated_at: timestamp };
const conversation = { id: ids.conversation, clinic_org_id: ids.clinic, lab_org_id: ids.lab, status: 'active', last_message_at: timestamp, clinic_last_read_at: timestamp, lab_last_read_at: timestamp, created_at: timestamp };
const messages = Array.from({ length: 36 }, (_, index) => ({ id: id(100 + index), conversation_id: ids.conversation, sender_user_id: ids.user, sender_org_id: ids.lab, sender_name: 'Sentetik Teknisyen', sender_role: 'technician', body: `Sentetik çalışma mesajı ${String(index + 1).padStart(2, '0')}`, context_case_id: null, demo_mode: false, created_at: new Date(Date.parse(timestamp) + index * 1000).toISOString() }));
const errors = [], interceptedWrites = [], checks = [], layoutSamples = [];
let browser, server, serverExit = null, logs = '', debugPage;

async function installFixture(context, authenticated = true, { locale = 'tr', theme = 'midnight' } = {}) {
  context.on('page', page => {
    page.setDefaultTimeout(30_000);
    page.on('pageerror', error => errors.push({ url: page.url(), error: error.message }));
    page.on('console', message => {
      if (/hydration|Maximum update depth|unique "key"|useEffect must not return|destroy is not a function/i.test(message.text())) errors.push({ url: page.url(), error: message.text() });
    });
  });
  await context.route(/\/(?:auth|rest)\/v1\//, async route => {
    const request = route.request(), url = new URL(request.url()), table = url.pathname.split('/').at(-1), method = request.method();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range', 'content-type': 'application/json' };
    if (method === 'OPTIONS') { await route.fulfill({ status: 200, headers, body: '{}' }); return; }
    let rows = [];
    if (url.pathname.includes('/auth/')) rows = authenticated ? { user } : { user: null };
    else {
      if (!['GET', 'HEAD'].includes(method)) interceptedWrites.push({ table, method, payload: request.postDataJSON() });
      if (table === 'memberships') rows = authenticated ? [{ id: id(8), organization_id: ids.clinic, user_id: ids.user, role: 'owner', status: 'active' }] : [];
      else if (table === 'profiles') rows = [{ id: ids.user, full_name: 'Sentetik Kullanıcı', email: user.email, phone: '' }];
      else if (table === 'organizations') rows = organizations.filter(row => !url.searchParams.get('id')?.startsWith('eq.') || url.searchParams.get('id') === `eq.${row.id}`);
      else if (table === 'user_preferences') rows = [{ theme, motion_level: 'reduced', compact_mode: false, surface_style: 'soft', font_scale: 'normal', custom_accent: null, use_custom_accent: false }];
      else if (table === 'user_onboarding') rows = [{ user_id: ids.user, organization_id: ids.clinic, completed: true, dismissed: true, current_step: 1 }];
      else if (table === 'patients') rows = [patient];
      else if (table === 'cases') rows = [caseRow];
      else if (table === 'clinic_case_finance') rows = [finance];
      else if (table === 'lab_case_quotes') rows = [{ id: id(9), case_id: ids.case, amount: 300, currency: 'EUR', status: 'sent', notes: null, basis: {}, updated_at: timestamp }];
      else if (table === 'organization_conversations') rows = [conversation];
      else if (table === 'organization_messages') rows = [...messages].reverse();
      if (Array.isArray(rows)) {
        const status = url.searchParams.get('status'), priority = url.searchParams.get('priority');
        if (status?.startsWith('eq.')) rows = rows.filter(row => row.status === status.slice(3));
        if (priority?.startsWith('eq.')) rows = rows.filter(row => row.priority === priority.slice(3));
        if (url.searchParams.has('due_date')) {
          const filter = url.searchParams.get('due_date'), value = filter.slice(3);
          rows = rows.filter(row => filter.startsWith('lt.') ? row.due_date < value : row.due_date === value);
        }
        headers['content-range'] = rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0';
      }
    }
    if (request.headers().accept?.includes('application/vnd.pgrst.object+json')) rows = Array.isArray(rows) ? rows[0] ?? null : rows;
    // Every write is fulfilled locally. The assertions below allow only the
    // existing automatic conversation read receipt and onboarding progress sync, never a record submission.
    await route.fulfill({ status: 200, headers, body: method === 'HEAD' ? '' : JSON.stringify(rows) });
  });
  await context.addInitScript(({ authenticated, user, locale, theme }) => {
    if (!['http:', 'https:'].includes(location.protocol)) return;
    if (authenticated) {
      const exp = Math.floor(Date.now() / 1000) + 86400, payload = btoa(JSON.stringify({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' }));
      localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 86400, expires_at: exp, user }));
    }
    if (!sessionStorage.getItem('desktop-shell-fixture-seeded')) {
      localStorage.setItem('dentaya:locale:v1', locale);
      localStorage.setItem('dentaya:preferences', JSON.stringify({ theme, motion_level: 'reduced', compact_mode: false, surface_style: 'soft', font_scale: 'normal', custom_accent: null, use_custom_accent: false }));
      localStorage.setItem('dentaya:workspace-chrome-v1', JSON.stringify({ compact: true, navigation: true, reducedMotion: true }));
      localStorage.setItem('dentaya:experience:v1', JSON.stringify({ motion: 'reduced' }));
      localStorage.setItem('dentaya:aya-response-mode', 'core');
      sessionStorage.setItem('desktop-shell-fixture-seeded', 'true');
    }
  }, { authenticated, user, locale, theme });
}

async function ready(page, route) {
  await page.goto(`${base}${route}`);
  await page.locator('.desktop-shell').waitFor();
  await page.locator('h1').first().waitFor();
  assert.equal(await page.locator('[data-loading-reading]').count(),0,'Ready routes have no mandatory reading overlay');
  if (route === '/patients') await page.locator('.patient-card').waitFor();
  if (route === '/appointments') await page.locator('.planner-week>button').last().waitFor();
  if (route === '/finance') await page.locator('.finance-case').waitFor();
  if (route === '/messages') await page.locator('.message-bubble').last().waitFor();
  if (route === '/ai') await page.locator('#aya-local-message').waitFor();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function layout(page, route, viewport, { mobile = false } = {}) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const node of document.querySelectorAll('.desktop-content,.module-content')) node.scrollTop = 0;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.desktop-titlebar').count(), 1, `${route}: one shared application titlebar`);
  assert.equal(await page.locator('.desktop-statusbar').count(), 1, `${route}: one shared statusbar`);
  assert.equal(await page.locator('.desktop-document-tabs').count(), 1, `${route}: one document tab strip`);
  assert.equal(await page.locator('h1').count(), 1, `${route}: one page heading`);
  const brand = await page.locator('.desktop-brand img:visible').first().boundingBox();
  assert.ok(brand && brand.width > 20 && brand.height > 10, `${route}: the selected DentAYA brand remains visible`);
  const bounds = await page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector);
      if (!node || getComputedStyle(node).display === 'none') return null;
      const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, titlebar: rect('.desktop-titlebar'), tabs: rect('.desktop-document-tabs'), statusbar: rect('.desktop-statusbar'), content: rect('.desktop-content'), navigation: rect('.module-navigation'), module: rect('.module-content') };
  });
  const description = `${route} ${viewport.width}×${viewport.height}: ${JSON.stringify(bounds)}`;
  assert.ok(bounds.documentWidth <= bounds.width + 1, `No horizontal document overflow: ${description}`);
  for (const name of ['titlebar', 'statusbar', 'content']) {
    assert.ok(bounds[name] && bounds[name].left >= -1 && bounds[name].right <= bounds.width + 1, `${name} fits the screen: ${description}`);
  }
  if (!mobile) {
    assert.ok(Math.abs(bounds.titlebar.height - 42) <= 1, `Desktop application titlebar is 42px: ${description}`);
    assert.ok(Math.abs(bounds.statusbar.height - 26) <= 1, `Desktop application statusbar is 26px: ${description}`);
    assert.ok(bounds.documentHeight <= bounds.height + 1, `Desktop work scrolls inside its panels: ${description}`);
    assert.ok(bounds.content.top >= bounds.titlebar.bottom - 1 && bounds.content.bottom <= bounds.statusbar.top + 1, `Content stays between application chrome: ${description}`);
    assert.ok(bounds.statusbar.bottom <= bounds.height + 1, `Status remains on screen: ${description}`);
    assert.ok(bounds.navigation && Math.abs(bounds.navigation.width - 80) <= 1, `Desktop module activity dock is 80px: ${description}`);
  }
  if (bounds.module) assert.ok(bounds.module.left >= -1 && bounds.module.right <= bounds.width + 1, `Real module fits horizontally: ${description}`);
  layoutSamples.push({ route, viewport, ...bounds });
  await page.screenshot({ path: path.join(screenshotDirectory, `desktop-${route.slice(1)}-${viewport.width}.png`), animations: 'disabled', caret: 'initial', style: 'nextjs-portal{visibility:hidden!important}' });
}

async function keyboardAndPreferences(page) {
  const modules = page.locator('.desktop-modules-button');
  await modules.focus();
  await page.keyboard.press('Alt+m');
  const moduleMenu = page.locator('.desktop-module-menu');
  await moduleMenu.waitFor({ state: 'visible' });
  assert.equal(await moduleMenu.evaluate(node => node.matches(':modal')), true, 'Application module menu uses the native modal layer');
  const moduleSearch = moduleMenu.locator('input[type="search"]');
  assert.equal(await moduleSearch.evaluate(node => node === document.activeElement), true, 'Alt+M focuses module search');
  await moduleSearch.fill('Hastalar');
  await moduleMenu.locator('a[href="/patients"]').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await moduleMenu.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.matches('.desktop-modules-button'));
  assert.equal(await modules.evaluate(node => node === document.activeElement), true, 'Module menu Escape restores its trigger');
  const launcher = page.locator('[data-dentaya-launcher="true"]');
  assert.equal(await launcher.count(), 1, 'Exactly one keyboard navigation owner is exposed');
  await page.keyboard.press('Alt+m');
  await moduleMenu.waitFor({ state: 'visible' });
  await page.evaluate(() => new Promise(resolve => {
    const menu = document.querySelector('.desktop-module-menu');
    menu.addEventListener('close', () => requestAnimationFrame(() => requestAnimationFrame(() => resolve())), { once: true });
    menu.close();
    document.querySelector('[data-dentaya-launcher="true"]').focus();
  }));
  assert.equal(await launcher.evaluate(node => node === document.activeElement), true, 'A queued module-menu close preserves focus moved to the launcher in the same task');
  await launcher.focus();
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'DentAYA hızlı navigasyon', exact: true });
  await palette.waitFor();
  assert.equal(await palette.evaluate(node => node.matches(':modal')), true, 'Navigation uses native modal focus containment');
  const input = palette.getByRole('combobox');
  await input.fill('Hastalar');
  await page.keyboard.press('ArrowDown');
  const selected = palette.locator('[role="option"][aria-selected="true"]');
  assert.equal(await input.getAttribute('aria-activedescendant'), await selected.getAttribute('id'));
  await page.keyboard.press('Escape');
  await palette.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.matches('[data-dentaya-launcher="true"]'));
  assert.equal(await launcher.evaluate(node => node === document.activeElement), true, 'Escape restores launcher focus');
  await page.keyboard.press('Control+,');
  const preferences = page.getByRole('dialog', { name: 'Sana göre DentAYA', exact: true });
  await preferences.waitFor();
  assert.equal(await preferences.evaluate(node => node.matches(':modal')), true, 'Preferences use the native modal layer');
  await preferences.getByRole('button', { name: 'Çalışma düzeni', exact: true }).click();
  const reduced = preferences.getByRole('checkbox', { name: /Hareketi azalt/ });
  await reduced.uncheck();
  await reduced.check();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dentaya:workspace-chrome-v1')).reducedMotion), true);
  assert.equal(await page.locator('html').getAttribute('data-workspace-reduced-motion'), 'true');
  await page.keyboard.press('Escape');
  await preferences.waitFor({ state: 'hidden' });
  checks.push('Alt+M module menu and search; queued close preserves newer focus; single navigation owner; Ctrl+K search and active descendant; modal Escape/focus restoration; Ctrl+, local preferences');
}

async function mobileActionReachable(page, route) {
  const target = route === '/workspace' ? page.locator('.desktop-content a[href^="/cases/"]').first()
    : route === '/patients' ? page.getByRole('button', { name: '+ Yeni Hasta', exact: true })
      : route === '/appointments' ? page.locator('.apt-head').getByRole('button', { name: '+ Randevu Ekle', exact: true })
        : route === '/finance' ? page.getByRole('button', { name: 'Klinik Fiyatını Kaydet', exact: true })
          : route === '/messages' ? page.locator('.message-composer textarea') : page.locator('#aya-local-message');
  await target.scrollIntoViewIfNeeded();
  assert.equal(await target.isVisible(), true, `${route}: mobile primary control is visible`);
  assert.equal(await target.isEnabled(), true, `${route}: mobile primary control is enabled`);
  const bounds = await target.evaluate(node => { const { left, top, right, bottom } = node.getBoundingClientRect(); return { left, top, right, bottom, width: innerWidth, height: innerHeight }; });
  assert.ok(bounds.left >= -1 && bounds.right <= bounds.width + 1 && bounds.top >= 0 && bounds.bottom <= bounds.height, `${route}: mobile primary control is reachable: ${JSON.stringify(bounds)}`);
}

async function routeActions(page, route) {
  if (route === '/workspace') {
    await page.getByText('DESKTOP-ONLY-001', { exact: false }).first().waitFor();
    assert.ok(await page.locator('.desktop-content a[href^="/cases/"]').count() > 0, 'Workspace exposes a real case record');
  } else if (route === '/patients') {
    const search = page.getByPlaceholder('Ad, referans, telefon veya e-posta ara…');
    await search.fill('Sentetik');
    assert.equal(await page.locator('.patient-card').count(), 1);
    await search.fill('No matching synthetic patient');
    assert.equal(await page.locator('.patient-card').count(), 0, 'Patient search filters actual rows');
    await search.fill('');
    await page.getByRole('button', { name: '+ Yeni Hasta', exact: true }).click();
    await page.getByRole('heading', { name: 'Yeni Hasta', exact: true }).waitFor();
    await page.getByRole('button', { name: '×', exact: true }).click();
  } else if (route === '/appointments') {
    assert.equal(await page.locator('.planner-week>button').count(), 7);
    await page.locator('.apt-head').getByRole('button', { name: '+ Randevu Ekle', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Randevu formu', exact: true });
    await form.waitFor();
    assert.equal(await form.getByRole('combobox', { name: /^Hasta/ }).inputValue(), ids.patient);
    await form.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  } else if (route === '/finance') {
    assert.equal(await page.getByLabel('Hastaya verilen fiyat (EUR)', { exact: true }).inputValue(), '1250.5');
    assert.equal(await page.getByRole('button', { name: 'Klinik Fiyatını Kaydet', exact: true }).isEnabled(), true);
  } else if (route === '/messages') {
    const composer = page.locator('.message-composer textarea');
    await composer.fill('Gönderilmeyen arayüz doğrulama taslağı');
    assert.equal(await page.locator('.message-composer').getByRole('button', { name: 'Gönder', exact: true }).isEnabled(), true);
    const bounds = await page.locator('.message-composer').evaluate(node => { const rect = node.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, height: innerHeight }; });
    assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.height, 'Message draft and Send remain on screen');
    await composer.fill('');
  } else if (route === '/ai') {
    const composer = page.locator('#aya-local-message');
    await composer.fill('1800 × 0,18');
    await page.locator('.aya-chat-composer').getByRole('button', { name: /Gönder/ }).click();
    await page.locator('.aya-message--assistant').filter({ hasText: '324' }).waitFor();
    assert.equal(await page.locator('.aya-status--model').count(), 0, 'A browser Core response cannot claim a ready local model');
  }
}

try {
  await fs.mkdir(screenshotDirectory, { recursive: true });
  if (!process.env.DENTAYA_DESKTOP_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3064'], { cwd: project, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'desktop-shell-test-placeholder' }, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { logs = (logs + data).slice(-20_000); });
    server.on('exit', code => { serverExit = code; });
  }
  const deadline = Date.now() + 65_000;
  let available = false;
  while (Date.now() < deadline) {
    if (serverExit !== null) throw Error(logs);
    try { if ((await fetch(`${base}/workspace`)).ok) { available = true; break; } } catch { /* Server is still compiling. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(available, `Application server did not become ready at ${base}`);
  browser = await chromium.launch({ headless: true, ...(process.env.DENTAYA_CHROMIUM_PATH ? { executablePath: process.env.DENTAYA_CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await installFixture(guestContext, false);
  const guest = await guestContext.newPage(); debugPage = guest;
  await ready(guest, '/workspace');
  assert.equal(await guest.locator('.desktop-content a[href="/design"]').count() > 0, true, 'CAD entry remains available without account authentication');
  assert.equal(await guest.locator('.desktop-content a[href="/ai"]').count() > 0, true, 'AYA entry remains available without account authentication');
  await layout(guest, '/workspace-guest', { width: 1440, height: 1000 });
  await guest.locator('.desktop-content a[href="/ai"]').first().click();
  await guest.waitForURL('**/ai');
  await guest.locator('#aya-local-message').waitFor();
  assert.equal(new URL(guest.url()).pathname, '/ai', 'Guest AYA entry reaches the real local assistant');
  checks.push('unauthenticated workspace exposes local CAD and opens local AYA');
  await guestContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await installFixture(context);
  const page = await context.newPage(); debugPage = page;
  const routes = ['/workspace', '/patients', '/appointments', '/finance', '/messages', '/ai'];
  for (const route of routes) {
    console.log(`Checking desktop shell ${route}`);
    await ready(page, route);
    await layout(page, route, { width: 1366, height: 768 });
    await layout(page, route, { width: 1440, height: 1000 });
    await routeActions(page, route);
    await layout(page, route, { width: 390, height: 844 }, { mobile: true });
    await mobileActionReachable(page, route);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page, '/patients');
  await keyboardAndPreferences(page);
  await page.reload();
  await page.locator('.patient-card').waitFor();
  assert.equal(await page.locator('[data-loading-reading]').count(),0,'Reload exposes the ready module without a timer');
  assert.equal(await page.locator('html').getAttribute('data-workspace-reduced-motion'), 'true', 'Reduced motion preference persists after reload');
  await context.setOffline(true);
  await page.locator('.desktop-network-status i[data-online="false"]').waitFor();
  assert.match(await page.locator('.desktop-network-status').textContent(), /Çevrimdışı/);
  await context.setOffline(false);
  await page.locator('.desktop-network-status i[data-online="true"]').waitFor();
  checks.push('network status follows real browser online/offline events without a connected-backend claim');

  // Exercise the real settings controls so the shell cannot hard-code a dark
  // background or physical left/right positioning independently of preferences.
  await page.locator('.desktop-titlebar-actions').getByRole('button', { name: 'Görünüm ve tercihler', exact: true }).click();
  const preferences = page.getByRole('dialog', { name: 'Sana göre DentAYA', exact: true });
  await preferences.waitFor();
  await preferences.getByRole('button', { name: 'Renk ve görünüm', exact: true }).click();
  const appearance = preferences.locator('.appearance-palette select');
  await appearance.selectOption('theme:light');
  await page.waitForFunction(() => document.documentElement.dataset.dyColorFamily === 'light');
  await page.keyboard.press('Escape');
  await layout(page, '/patients-light', { width: 1440, height: 1000 });
  await page.keyboard.press('Control+,');
  await preferences.waitFor();
  await appearance.selectOption('theme:navy');
  await page.waitForFunction(() => document.documentElement.dataset.dyColorFamily === 'dark');
  await preferences.getByRole('button', { name: 'Dil ve bölge', exact: true }).click();
  await preferences.locator('.language-select select').selectOption('ar');
  await page.waitForFunction(() => document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl');
  await page.keyboard.press('Escape');
  await layout(page, '/patients-rtl', { width: 1440, height: 1000 });
  await layout(page, '/patients-rtl', { width: 390, height: 844 }, { mobile: true });
  checks.push('real patient search/create entry, appointment planner/form, finance record controls, bounded message composer, local AYA calculation');
  checks.push('persisted reduced motion; light and dark presets; Arabic RTL desktop and mobile');

  const submissions = interceptedWrites.filter(write => !(
    write.table === 'organization_conversations' && write.method === 'PATCH' && Object.keys(write.payload).every(key => key === 'clinic_last_read_at')
    || write.table === 'user_onboarding' && write.method === 'PATCH' && Number.isInteger(write.payload.current_step) && Object.keys(write.payload).every(key => ['current_step', 'updated_at'].includes(key))
  ));
  assert.deepEqual(submissions, [], 'Visual and navigation verification never submits case, patient, finance or message records');
  assert.deepEqual(errors, [], 'No runtime, hydration or React lifecycle errors');
  const report = { pass: true, routes, desktopViewports: ['1366×768', '1440×1000'], mobileViewport: '390×844', checks, samples: layoutSamples.length, screenshots: screenshotDirectory, backend: 'synthetic intercepted HTTP only; no live clinic/backend verification', automaticReadReceiptsIntercepted: interceptedWrites.filter(write => write.table === 'organization_conversations').length, automaticOnboardingSyncIntercepted: interceptedWrites.filter(write => write.table === 'user_onboarding').length, cadGeometryLifecycle: 'separate verify-cad-daily-browser test', pageErrors: 0 };
  await fs.writeFile(path.join(screenshotDirectory, 'desktop-shell-browser-report.json'), JSON.stringify({ ...report, layoutSamples }, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (debugPage && !debugPage.isClosed()) {
    await debugPage.screenshot({ path: path.join(screenshotDirectory, 'desktop-shell-failure.png'), animations: 'disabled', timeout: 15_000 }).catch(() => {});
    console.error(JSON.stringify(await debugPage.evaluate(() => ({ url: location.href, heading: [...document.querySelectorAll('h1')].map(node => node.textContent), width: innerWidth, documentWidth: document.documentElement.scrollWidth, activeElement: document.activeElement?.outerHTML, openDialogs: [...document.querySelectorAll('dialog[open]')].map(node => node.outerHTML.slice(0, 400)), titlebar: document.querySelector('.desktop-titlebar')?.textContent, statusbar: document.querySelector('.desktop-statusbar')?.textContent })).catch(() => null), null, 2));
  }
  console.error(logs);
  throw error;
} finally {
  await browser?.close();
  if (server) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); }), new Promise(resolve => setTimeout(resolve, 3000))]);
  }
}
