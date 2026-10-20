import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Real route components with synthetic intercepted Supabase HTTP responses.
// This verifies renderer/data contracts, not a live clinic backend.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwright = await import(process.env.DENTAYA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DENTAYA_PLAYWRIGHT_MODULE).href : 'playwright');
const { chromium } = playwright.default ?? playwright;
const base = 'http://127.0.0.1:3057';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = { user: id(1), clinic: id(2), labA: id(3), labB: id(4), caseA: id(5), caseB: id(6), conversationA: id(7), conversationB: id(8), patient: id(9) };
const version = '2026-10-19T08:00:00.000Z';
const user = { id: ids.user, email: 'workflow@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: version };
const cases = [ids.caseA, ids.caseB].map((caseId, index) => ({ id: caseId, case_number: `CASE-${index + 1}`, clinic_org_id: ids.clinic, lab_org_id: index ? ids.labB : ids.labA, patient_reference: 'SYNTHETIC', title: `Synthetic case ${index + 1}`, case_type: 'crown', priority: 'normal', status: 'design', tooth_codes: ['11'], material: 'Zirconia', shade: 'A2', updated_at: version }));
const organizations = [{ id: ids.clinic, name: 'Synthetic Clinic', org_type: 'clinic' }, { id: ids.labA, name: 'Synthetic Lab A', org_type: 'laboratory' }, { id: ids.labB, name: 'Synthetic Lab B', org_type: 'laboratory' }];
const conversations = [ids.conversationA, ids.conversationB].map((conversationId, index) => ({ id: conversationId, clinic_org_id: ids.clinic, lab_org_id: index ? ids.labB : ids.labA, status: 'active', last_message_at: version, clinic_last_read_at: null, lab_last_read_at: null, created_at: version }));
const message = (conversationId, index, body) => ({ id: id(1000 + index), conversation_id: conversationId, sender_user_id: ids.user, sender_org_id: ids.labA, sender_name: 'Synthetic Technician', sender_role: 'technician', body, context_case_id: null, demo_mode: false, created_at: new Date(Date.parse(version) + index * 1000).toISOString() });
const threadA = Array.from({ length: 120 }, (_, index) => message(ids.conversationA, index, `A_HISTORY_${String(index).padStart(3, '0')}`));
const threadB = [message(ids.conversationB, 200, 'B_CURRENT')];
let finance = { id: id(10), case_id: ids.caseA, patient_price: 1000.50, discount_amount: 0, paid_amount: 0, currency: 'EUR', payment_status: 'pending', overhead_pct: 20, target_margin_pct: 35, notes: null, updated_at: version };
const quotes = [{ id: id(11), case_id: ids.caseA, amount: 100.25, currency: 'EUR', status: 'sent', notes: null, basis: {}, updated_at: version }];
const fixture = { financeReadFailure: false, holdFinance: null, releaseFinance: null, financeWrite: 'conflict', writes: [], role: 'owner', holdA: null, releaseA: null, sendMode: 'invalid-duplicate', messageWrites: [], holdSend: null, releaseSend: null };
const errors = [];
let server, browser, log = '', serverExit = null;
async function installBackend(page) {
  await page.route('http://127.0.0.1:54321/**', async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').at(-1), method = req.method();
    let status = 200, result = [];
    if (method === 'OPTIONS') result = {};
    else if (url.pathname.startsWith('/auth/')) result = { user };
    else if (table === 'memberships') result = [{ organization_id: ids.clinic, user_id: ids.user, role: fixture.role, status: 'active' }];
    else if (table === 'profiles') result = [{ id: ids.user, full_name: 'Synthetic Dentist' }];
    else if (table === 'organizations') result = organizations.filter(row => !url.searchParams.get('id')?.startsWith('eq.') || url.searchParams.get('id') === `eq.${row.id}`);
    else if (table === 'cases') { if (fixture.holdFinance) await fixture.holdFinance; result = cases.filter(row => !url.searchParams.get('lab_org_id') || url.searchParams.get('lab_org_id') === `eq.${row.lab_org_id}`); }
    else if (table === 'patients') result = [{ id: ids.patient, external_ref: 'SYNTHETIC', first_name: 'Test', last_name: 'Patient' }];
    else if (table === 'lab_case_quotes') {
      if (fixture.financeReadFailure) { status = 503; result = { message: 'Synthetic network failure', code: 'NETWORK_TEST' }; }
      else result = quotes;
    } else if (table === 'clinic_case_finance') {
      if (method === 'PATCH' || method === 'POST') {
        const payload = req.postDataJSON(); fixture.writes.push({ method, payload, version: url.searchParams.get('updated_at') });
        if (fixture.financeWrite === 'success' && url.searchParams.get('updated_at') === `eq.${finance.updated_at}`) { finance = { ...finance, ...payload, updated_at: '2026-10-19T09:00:00.000Z' }; result = [{ id: finance.id }]; }
        else result = [];
      } else result = [finance];
    } else if (table === 'organization_conversations') result = conversations;
    else if (table === 'organization_messages') {
      if (method === 'POST') {
        const payload = req.postDataJSON(); fixture.messageWrites.push(payload);
        if (fixture.holdSend) await fixture.holdSend;
        if (fixture.sendMode === 'invalid-duplicate') { status = 409; result = { code: '23505', message: 'Synthetic duplicate unrelated to this request' }; }
        else { const row = { ...message(payload.conversation_id, 500 + fixture.messageWrites.length, payload.body), ...payload, id: id(2000 + fixture.messageWrites.length) }; (payload.conversation_id === ids.conversationA ? threadA : threadB).push(row); result = [row]; }
      } else if (url.searchParams.has('client_request_id')) result = [];
      else {
        const target = url.searchParams.get('conversation_id') === `eq.${ids.conversationA}` ? threadA : threadB;
        if (target === threadA && fixture.holdA) await fixture.holdA;
        let rows = [...target].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        const before = url.searchParams.get('or')?.match(/created_at\.lt\.([^,]+)/)?.[1];
        if (before) rows = rows.filter(row => row.created_at < before);
        result = rows.slice(0, Number(url.searchParams.get('limit') || 100));
      }
    }
    if (req.headers().accept?.includes('application/vnd.pgrst.object+json')) result = Array.isArray(result) ? result[0] ?? null : result;
    await route.fulfill({ status, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' }, body: JSON.stringify(result) });
  });
  await page.addInitScript(({ user }) => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style'); style.textContent = 'nextjs-portal{visibility:hidden!important}'; document.head.appendChild(style);
    });
    const exp = Math.floor(Date.now() / 1000) + 86400, payload = btoa(JSON.stringify({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' }));
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 86400, expires_at: exp, user }));
    localStorage.setItem('dentaya:locale:v1', 'tr');
    localStorage.setItem('dentaya:experience:v1', JSON.stringify({ motion: 'reduced' }));
  }, { user });
  page.on('pageerror', error => errors.push(error.message));
}
async function desktopMessageLayout(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => { window.scrollTo(0, 0); const content = document.querySelector('.module-content'); if (content) content.scrollTop = 0; });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const layout = await page.evaluate(() => {
    const composer = document.querySelector('.message-composer'), send = composer.querySelector('button'), history = document.querySelector('.message-history'), content = document.querySelector('.module-content');
    const bounds = node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    return { composer: bounds(composer), send: bounds(send), historyHeight: history.clientHeight, historyScrollHeight: history.scrollHeight, contentScrollTop: content?.scrollTop ?? 0, contentHeight: content?.scrollHeight ?? 0, bodyHeight: document.scrollingElement.scrollHeight, width: innerWidth, height: innerHeight };
  });
  for (const [name, bounds] of [['composer', layout.composer], ['send', layout.send]]) {
    assert.ok(bounds.top >= 0 && bounds.bottom <= height && bounds.left >= 0 && bounds.right <= width, `${name} must fit the first desktop viewport at ${width}×${height}: ${JSON.stringify(layout)}`);
  }
  assert.equal(layout.contentScrollTop, 0, 'Opening a thread cannot scroll the module to reveal its composer');
  assert.ok(layout.historyHeight >= 60, `The remaining desktop history area must remain usable: ${JSON.stringify(layout)}`);
  assert.ok(layout.historyScrollHeight > layout.historyHeight + 100, 'A long thread must scroll inside its history area');
  return layout;
}
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3057'], { cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dentaya-synthetic-module-fixture' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { log = (log + data).slice(-20000); });
  server.on('exit', code => { serverExit = code; });
  const deadline = Date.now() + 65000;
  while (Date.now() < deadline) { if (serverExit !== null) throw Error(log); try { if ((await fetch(`${base}/finance`)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
  browser = await chromium.launch({ headless: true, ...(process.env.DENTAYA_CHROMIUM_PATH ? { executablePath: process.env.DENTAYA_CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(30000); await installBackend(page);
  await page.goto(`${base}/finance`); await page.locator('.finance-case').first().waitFor();
  const price = page.getByLabel('Hastaya verilen fiyat (EUR)', { exact: true });
  const save = page.getByRole('button', { name: 'Klinik Fiyatını Kaydet', exact: true });
  await price.waitFor(); assert.equal(await price.inputValue(), '1000.5');
  fixture.holdFinance = new Promise(resolve => { fixture.releaseFinance = resolve; });
  const reload = page.getByRole('button', { name: 'Güncel kayıtları yükle', exact: true });
  await reload.click();
  await page.waitForFunction(() => document.querySelector('fieldset')?.disabled === true);
  assert.equal(await price.isDisabled(), true, 'Refresh cannot accept a draft that its result would replace');
  assert.equal(await save.isDisabled(), true, 'Saving cannot race an in-flight refresh');
  assert.equal(await reload.isDisabled(), true, 'A second refresh cannot overlap the first');
  fixture.releaseFinance(); fixture.holdFinance = null;
  await page.waitForFunction(() => document.querySelector('fieldset')?.disabled === false);
  assert.equal(await price.inputValue(), '1000.5');

  fixture.financeReadFailure = true;
  await page.getByRole('button', { name: 'Güncel kayıtları yükle', exact: true }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button => button.textContent?.trim() === 'Klinik Fiyatını Kaydet' && button.disabled));
  assert.equal(await page.locator('.finance-case').count(), 2, 'A failed finance refresh must retain existing case rows');
  assert.equal(await price.inputValue(), '1000.5', 'A failed refresh must not substitute a zero-valued record');
  fixture.financeReadFailure = false;
  await page.getByRole('button', { name: 'Güncel kayıtları yükle', exact: true }).click(); await save.waitFor(); await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Klinik Fiyatını Kaydet')?.disabled);
  await price.fill('1200.25');
  page.once('dialog', dialog => dialog.dismiss()); await page.locator('.finance-case').nth(1).click();
  assert.equal(await price.inputValue(), '1200.25', 'Cancelling a case switch preserves the price draft');
  page.once('dialog', dialog => dialog.dismiss());
  const navigation = page.evaluate(() => window.dispatchEvent(new Event('dentaya:before-navigation', { cancelable: true })));
  assert.equal(await navigation, false, 'Programmatic launcher navigation respects the unsaved draft guard');
  await save.click(); await page.getByText(/Fiyat başka bir oturumda|Muhasebe kaydı başka bir oturumda/).waitFor();
  assert.equal(await price.inputValue(), '1200.25', 'A zero-row write must retain the draft'); assert.equal(finance.patient_price, 1000.50);
  fixture.financeWrite = 'success'; fixture.writes.length = 0;
  await save.evaluate(button => { button.click(); button.click(); });
  await page.getByText('Hasta fiyatı ve ödeme kaydı güncellendi.', { exact: true }).waitFor();
  assert.equal(fixture.writes.length, 1, 'A synchronous double click dispatches one financial write');
  assert.equal(fixture.writes[0].method, 'PATCH'); assert.equal(fixture.writes[0].payload.currency, 'EUR'); assert.ok(!('created_by' in fixture.writes[0].payload)); assert.equal(finance.patient_price, 1200.25);
  if (process.env.DENTAYA_SCREENSHOT_DIR) { await fs.mkdir(process.env.DENTAYA_SCREENSHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'finance-records.png'), fullPage: true }); }
  console.log('PASS: financial loading failure, stale/zero-row write, exact currency, draft protection and duplicate submission guards.');

  const chat = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); chat.setDefaultTimeout(30000); await installBackend(chat);
  fixture.holdA = new Promise(resolve => { fixture.releaseA = resolve; });
  await chat.goto(`${base}/messages`); await chat.locator('.thread-row').nth(1).waitFor();
  const loadingComposer = chat.locator('.message-composer textarea');
  await loadingComposer.fill('Draft while the initial thread loads');
  assert.equal(await chat.locator('.message-composer').getByRole('button', { name: 'Gönder', exact: true }).isDisabled(), true);
  await loadingComposer.press('Enter');
  assert.equal(fixture.messageWrites.length, 0, 'Enter cannot send into a thread whose initial snapshot is pending');
  assert.equal(await loadingComposer.inputValue(), 'Draft while the initial thread loads');
  await loadingComposer.fill('');

  await chat.locator('.thread-row').nth(1).click(); await chat.getByText('B_CURRENT', { exact: true }).waitFor();
  const oldThreadResponse = chat.waitForResponse(response => response.url().includes('organization_messages') && new URL(response.url()).searchParams.get('conversation_id') === `eq.${ids.conversationA}`);
  fixture.releaseA(); fixture.holdA = null;
  await (await oldThreadResponse).finished();
  await chat.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await chat.getByText('A_HISTORY_119', { exact: true }).count(), 0, 'An earlier thread response cannot replace the selected thread');
  const composer = chat.locator('.message-composer textarea');
  await composer.fill('Draft for Lab B');
  await chat.locator('.thread-row').first().click(); await chat.getByText('A_HISTORY_119', { exact: true }).waitFor();
  assert.equal(await composer.inputValue(), '', 'A draft cannot leak into another recipient');
  assert.equal(await chat.locator('.message-bubble').count(), 100, 'The initial page shows the newest one hundred messages');
  assert.equal(await chat.getByText('A_HISTORY_000', { exact: true }).count(), 0);
  await desktopMessageLayout(chat, 1366, 768);
  const beforeHistory = await desktopMessageLayout(chat, 1440, 1000);
  const innerScroll = await chat.locator('.message-history').evaluate(node => { node.scrollTop = 0; node.scrollTop = 100; return node.scrollTop; });
  assert.ok(innerScroll > 0, 'The message history itself handles scrolling');
  await chat.getByRole('button', { name: 'Önceki mesajları yükle', exact: true }).click(); await chat.getByText('A_HISTORY_000', { exact: true }).waitFor();
  assert.equal(await chat.locator('.message-bubble').count(), 120, 'Earlier history loads without replacing the latest page');
  const afterHistory = await desktopMessageLayout(chat, 1440, 1000);
  assert.ok(afterHistory.contentHeight <= beforeHistory.contentHeight + 1 && afterHistory.bodyHeight <= beforeHistory.bodyHeight + 1, 'Adding message history cannot grow the document or module body');
  assert.ok(afterHistory.historyScrollHeight > beforeHistory.historyScrollHeight, 'Additional history increases only the inner scroll extent');
  await composer.fill('Draft for Lab A');
  await chat.locator('.thread-row').nth(1).click(); await chat.getByText('B_CURRENT', { exact: true }).waitFor();
  assert.equal(await composer.inputValue(), 'Draft for Lab B', 'Each recipient retains a separate draft');
  await chat.locator('.message-composer').getByRole('button', { name: 'Gönder', exact: true }).click();
  await chat.getByText(/Bu işlem zaten kaydedilmiş|Mesaj gönderilemedi/).waitFor();
  assert.equal(await composer.inputValue(), 'Draft for Lab B', 'An unrelated duplicate-key error must not clear the message');
  fixture.sendMode = 'success';
  fixture.holdSend = new Promise(resolve => { fixture.releaseSend = resolve; });
  await chat.locator('.message-composer').getByRole('button', { name: 'Gönder', exact: true }).click();
  await chat.getByRole('button', { name: 'Gönderiliyor…', exact: true }).waitFor();
  await composer.fill('Next message while sending'); fixture.releaseSend(); fixture.holdSend = null;
  await chat.getByText('Draft for Lab B', { exact: true }).waitFor();
  assert.equal(await composer.inputValue(), 'Next message while sending', 'Completion cannot erase text entered during the send');
  if (process.env.DENTAYA_SCREENSHOT_DIR) await chat.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'message-records.png'), fullPage: true });
  await chat.setViewportSize({ width: 390, height: 844 });
  await chat.locator('.message-composer').scrollIntoViewIfNeeded();
  const mobile = await chat.evaluate(() => {
    const composer = document.querySelector('.message-composer').getBoundingClientRect(), list = document.querySelector('.thread-list').getBoundingClientRect(), panel = document.querySelector('.chat-panel').getBoundingClientRect();
    return { composerTop: composer.top, composerBottom: composer.bottom, listLeft: list.left, panelLeft: panel.left, panelTop: panel.top, listBottom: list.bottom, width: innerWidth, documentWidth: document.documentElement.scrollWidth, height: innerHeight };
  });
  assert.ok(mobile.composerTop >= 0 && mobile.composerBottom <= mobile.height, `Mobile composer and Send remain reachable: ${JSON.stringify(mobile)}`);
  assert.ok(Math.abs(mobile.listLeft - mobile.panelLeft) <= 1 && mobile.panelTop >= mobile.listBottom, 'Mobile threads and chat form a single column');
  assert.ok(mobile.documentWidth <= mobile.width + 1, `Mobile messaging must not overflow horizontally: ${JSON.stringify(mobile)}`);
  if (process.env.DENTAYA_SCREENSHOT_DIR) await chat.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'message-records-mobile.png'), fullPage: true });
  console.log('PASS: desktop composer and Send fit 1366×768 / 1440×1000, long histories scroll internally without body growth, and mobile remains accessible without horizontal overflow.');
  console.log('PASS: newest message paging, stale thread isolation, per-recipient drafts, verified duplicate recovery and send-in-flight editing.');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'pass', backend: 'synthetic intercepted Supabase HTTP', liveBackendVerified: false, finance: true, messaging: true }));
} catch (error) { console.error(log); throw error; }
finally { fixture.releaseFinance?.(); fixture.releaseA?.(); fixture.releaseSend?.(); if (browser) await browser.close(); if (server) { server.kill('SIGTERM'); await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]); } }
