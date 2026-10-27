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
const fixture = { financeReadFailure: false, holdFinance: null, releaseFinance: null, financeWrite: 'conflict', writes: [], role: 'owner', holdA: null, releaseA: null, sendMode: 'invalid-duplicate', messageWrites: [], holdSend: null, releaseSend: null, caseMode: 'error', caseWrites: [], holdCase: null, releaseCase: null, appointmentMode: 'error', appointmentWrites: [], holdAppointment: null, releaseAppointment: null };
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
    else if (table === 'create_case_from_patient' && method === 'POST') {
      fixture.caseWrites.push(req.postDataJSON());
      if (fixture.holdCase) await fixture.holdCase;
      if (fixture.caseMode === 'error') { status = 503; result = { message: 'Synthetic case network failure', code: 'NETWORK_TEST' }; }
      else result = ids.caseB;
    } else if (table === 'appointments' && method === 'POST') {
      fixture.appointmentWrites.push(req.postDataJSON());
      if (fixture.holdAppointment) await fixture.holdAppointment;
      if (fixture.appointmentMode === 'error') { status = 503; result = { message: 'Synthetic appointment network failure', code: 'NETWORK_TEST' }; }
      else result = [];
    }
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
async function settleRenderer(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function dismissedConfirmation(page, action, label) {
  const dialogReady = page.waitForEvent('dialog');
  const pendingAction = action();
  const dialog = await dialogReady;
  assert.equal(dialog.type(), 'confirm', `${label} asks before discarding a dirty form`);
  await dialog.dismiss();
  await pendingAction;
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

  const casePage = await browser.newPage({ viewport: { width: 1440, height: 1100 } }); casePage.setDefaultTimeout(30000); await installBackend(casePage);
  await casePage.goto(`${base}/cases`);
  const newCase = casePage.getByRole('button', { name: 'Yeni Vaka', exact: true });
  await newCase.click();
  const caseModal = casePage.getByRole('dialog', { name: 'Laboratuvara gönder', exact: true });
  await caseModal.waitFor();
  await caseModal.getByLabel('Laboratuvar', { exact: true }).selectOption(ids.labA);
  await caseModal.getByRole('button', { name: 'Üstten', exact: true }).click();
  await caseModal.locator('[data-tooth="11"]').click();
  const caseNotes = caseModal.getByLabel('Klinik Not', { exact: true });
  await caseNotes.fill('RC62 pending case draft must remain unchanged');
  await caseModal.getByLabel('Materyal', { exact: true }).fill('RC62 ceramic');
  const caseSend = caseModal.getByRole('button', { name: 'Vakayı Gönder', exact: true });
  fixture.holdCase = new Promise(resolve => { fixture.releaseCase = resolve; });
  const firstCaseRequest = casePage.waitForRequest(request => request.method() === 'POST' && request.url().includes('/rpc/create_case_from_patient'));
  await caseSend.evaluate(button => {
    button.click(); button.click();
    // These same-turn callbacks run before React can paint disabled controls.
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const label of ['Kapat', 'Vazgeç', 'Yeni Vaka']) buttons.find(item => item.textContent?.trim() === label)?.click();
  });
  await firstCaseRequest; await caseModal.locator('fieldset:disabled').waitFor(); await settleRenderer(casePage);
  assert.equal(fixture.caseWrites.length, 1, 'A same-turn case double click dispatches one RPC');
  assert.equal(await caseNotes.inputValue(), 'RC62 pending case draft must remain unchanged', 'Immediate close/reopen callbacks cannot reset a pending case draft');
  assert.equal(await caseModal.getByLabel('Materyal', { exact: true }).inputValue(), 'RC62 ceramic');
  assert.equal(await caseModal.locator('input,select,textarea').evaluateAll(nodes => nodes.length > 0 && nodes.every(node => node.matches(':disabled'))), true, 'All mutable case fields inherit the pending fieldset lock');
  assert.equal(await newCase.isDisabled(), true, 'New case cannot replace the submitted form while its RPC is pending');
  for (const label of ['Kapat', 'Vazgeç']) assert.equal(await caseModal.getByRole('button', { name: label, exact: true }).isDisabled(), true, `${label} cannot abandon a pending case commit`);
  if (process.env.DENTAYA_SCREENSHOT_DIR) await caseModal.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'case-pending-commit.png'), animations: 'disabled' });
  const failedCaseResponse = casePage.waitForResponse(response => response.url().includes('/rpc/create_case_from_patient'));
  fixture.releaseCase(); fixture.holdCase = null; await (await failedCaseResponse).finished();
  await casePage.waitForFunction(() => !document.querySelector('[role="dialog"] fieldset')?.disabled);
  await caseModal.getByRole('alert').waitFor();
  assert.equal(await caseNotes.inputValue(), 'RC62 pending case draft must remain unchanged', 'A failed case commit retains the editable draft');
  assert.equal(await caseModal.locator('[data-tooth="11"]').getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(casePage.url()).pathname, '/cases', 'Failure cannot navigate to a fabricated case');
  const failedCaseIdentity = fixture.caseWrites[0].p_request_id;
  assert.match(failedCaseIdentity, /^[0-9a-f-]{36}$/i);

  // Retry the identical draft, then leave the real route before the RPC ends.
  // Its late success belongs to the old component and cannot redirect this page.
  fixture.caseMode = 'success'; fixture.holdCase = new Promise(resolve => { fixture.releaseCase = resolve; });
  const retryCaseRequest = casePage.waitForRequest(request => request.method() === 'POST' && request.url().includes('/rpc/create_case_from_patient'));
  await caseSend.click(); await retryCaseRequest; await settleRenderer(casePage);
  assert.equal(fixture.caseWrites.length, 2); assert.equal(fixture.caseWrites[1].p_request_id, failedCaseIdentity, 'An unchanged case retry reuses its idempotency identity');
  casePage.once('dialog', dialog => dialog.accept());
  await casePage.getByRole('link', { name: 'Muhasebe', exact: true }).evaluate(link => link.click());
  await casePage.waitForURL(`${base}/finance`); await casePage.locator('.finance-case').first().waitFor();
  const lateCaseResponse = casePage.waitForResponse(response => response.url().includes('/rpc/create_case_from_patient'));
  fixture.releaseCase(); fixture.holdCase = null; await (await lateCaseResponse).finished(); await settleRenderer(casePage);
  assert.equal(new URL(casePage.url()).pathname, '/finance', 'A case RPC that resolves after unmount cannot navigate the new route');
  await casePage.close();
  console.log('PASS: case commit locks same-turn open/close/duplicate callbacks and every mutable field; failed retry preserves draft and identity; late unmounted RPC cannot navigate.');

  const appointmentPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); appointmentPage.setDefaultTimeout(30000); await installBackend(appointmentPage);
  await appointmentPage.goto(`${base}/appointments`);
  const addAppointment = appointmentPage.getByRole('button', { name: '+ Randevu Ekle', exact: true }).first();
  await addAppointment.click();
  const appointmentModal = appointmentPage.getByRole('dialog', { name: 'Randevu formu', exact: true });
  await appointmentModal.waitFor();
  let pristinePrompts = 0;
  const unexpectedPristinePrompt = dialog => { pristinePrompts++; void dialog.dismiss(); };
  appointmentPage.on('dialog', unexpectedPristinePrompt);
  await appointmentModal.getByRole('button', { name: '×', exact: true }).click(); await appointmentModal.waitFor({ state: 'hidden' });
  appointmentPage.off('dialog', unexpectedPristinePrompt);
  assert.equal(pristinePrompts, 0, 'Closing an unchanged appointment form does not ask to discard changes');
  await addAppointment.click(); await appointmentModal.waitFor();
  const appointmentNotes = appointmentModal.getByLabel('Not', { exact: true });
  const appointmentDraft = 'RC62 appointment draft survives every dismissed close';
  await appointmentNotes.fill(appointmentDraft);
  const closeAppointment = appointmentModal.getByRole('button', { name: '×', exact: true });
  const cancelAppointment = appointmentModal.getByRole('button', { name: 'Vazgeç', exact: true });
  for (const [label, action] of [
    ['Escape', () => appointmentPage.keyboard.press('Escape')],
    ['backdrop', () => appointmentModal.locator('..').click({ position: { x: 2, y: 2 } })],
    ['close button', () => closeAppointment.click()],
    ['Cancel button', () => cancelAppointment.click()],
  ]) {
    await dismissedConfirmation(appointmentPage, action, label);
    assert.equal(await appointmentModal.isVisible(), true, `Dismissing ${label} keeps the appointment modal open`);
    assert.equal(await appointmentNotes.inputValue(), appointmentDraft, `Dismissing ${label} preserves the appointment draft`);
  }
  await dismissedConfirmation(appointmentPage, () => appointmentPage.getByRole('link', { name: '← Klinik Merkezi', exact: true }).evaluate(link => link.click()), 'route link');
  assert.equal(new URL(appointmentPage.url()).pathname, '/appointments');
  assert.equal(await appointmentNotes.inputValue(), appointmentDraft, 'A dismissed route confirmation preserves the appointment form');
  await dismissedConfirmation(appointmentPage, () => appointmentPage.evaluate(() => window.dispatchEvent(new Event('dentaya:before-navigation', { cancelable: true }))).then(allowed => assert.equal(allowed, false)), 'module launcher navigation');
  assert.equal(await appointmentNotes.inputValue(), appointmentDraft);

  const appointmentSave = appointmentModal.getByRole('button', { name: 'Randevuyu Kaydet', exact: true });
  await closeAppointment.focus(); await appointmentPage.keyboard.press('Shift+Tab');
  assert.equal(await appointmentSave.evaluate(node => node === document.activeElement), true, 'Shift+Tab wraps to the last enabled appointment control');
  await appointmentPage.keyboard.press('Tab');
  assert.equal(await closeAppointment.evaluate(node => node === document.activeElement), true, 'Tab wraps to the first enabled appointment control');
  const futureDay = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await appointmentModal.getByLabel('Tarih', { exact: true }).fill(futureDay);
  fixture.holdAppointment = new Promise(resolve => { fixture.releaseAppointment = resolve; });
  const appointmentRequest = appointmentPage.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/appointments'));
  await appointmentSave.evaluate(button => { button.click(); button.click(); }); await appointmentRequest; await settleRenderer(appointmentPage);
  await appointmentModal.locator('fieldset:disabled').waitFor();
  assert.equal(fixture.appointmentWrites.length, 1, 'An appointment double click commits once');
  assert.equal(await appointmentModal.locator('input,select,textarea').evaluateAll(nodes => nodes.length > 0 && nodes.every(node => node.matches(':disabled'))), true, 'All appointment form fields stay locked through the pending write');
  let pendingPrompts = 0;
  const unexpectedPendingPrompt = dialog => { pendingPrompts++; void dialog.dismiss(); };
  appointmentPage.on('dialog', unexpectedPendingPrompt);
  await appointmentPage.keyboard.press('Escape'); await appointmentModal.locator('..').click({ position: { x: 2, y: 2 } });
  assert.equal(await appointmentModal.isVisible(), true, 'Escape and backdrop cannot close a pending appointment commit');
  assert.equal(pendingPrompts, 0, 'A pending appointment cannot open a discard confirmation');
  appointmentPage.off('dialog', unexpectedPendingPrompt);
  assert.equal(await closeAppointment.isDisabled(), true); assert.equal(await cancelAppointment.isDisabled(), true); assert.equal(await addAppointment.isDisabled(), true);
  await appointmentModal.focus(); await appointmentPage.keyboard.press('Tab');
  assert.equal(await appointmentModal.evaluate(node => node.contains(document.activeElement)), true, 'Pending appointment focus stays inside the modal when all controls are disabled');
  await appointmentPage.keyboard.press('Shift+Tab');
  assert.equal(await appointmentModal.evaluate(node => node.contains(document.activeElement)), true, 'Pending Shift+Tab cannot escape to page controls');
  if (process.env.DENTAYA_SCREENSHOT_DIR) await appointmentModal.screenshot({ path: path.join(process.env.DENTAYA_SCREENSHOT_DIR, 'appointment-pending-commit.png'), animations: 'disabled' });
  const appointmentResponse = appointmentPage.waitForResponse(response => new URL(response.url()).pathname.endsWith('/appointments') && response.request().method() === 'POST');
  fixture.releaseAppointment(); fixture.holdAppointment = null; await (await appointmentResponse).finished();
  await appointmentPage.waitForFunction(() => !document.querySelector('[role="dialog"] fieldset')?.disabled);
  assert.equal(fixture.appointmentWrites.length, 1, 'The complete failed appointment operation still contains only one write');
  assert.equal(await appointmentNotes.inputValue(), appointmentDraft, 'A failed appointment write preserves the editable draft');
  assert.equal(await appointmentModal.getByLabel('Tarih', { exact: true }).inputValue(), futureDay);
  appointmentPage.once('dialog', dialog => dialog.accept()); await cancelAppointment.click(); await appointmentModal.waitFor({ state: 'hidden' });
  await appointmentPage.close();
  console.log('PASS: dirty appointment forms guard Escape/backdrop/close/Cancel/routes, pristine close has no prompt, and pending writes lock fields and trap focus.');

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
  const beforeImeWrites = fixture.messageWrites.length;
  await composer.fill('RC62 IME composition must not send');
  for (const mode of ['isComposing', 'keyCode229']) {
    await composer.evaluate((node, compositionMode) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, isComposing: compositionMode === 'isComposing' });
      if (compositionMode === 'keyCode229') Object.defineProperty(event, 'keyCode', { value: 229 });
      node.dispatchEvent(event);
    }, mode);
    await settleRenderer(chat);
    assert.equal(fixture.messageWrites.length, beforeImeWrites, `IME Enter (${mode}) cannot POST a message`);
    assert.equal(await composer.inputValue(), 'RC62 IME composition must not send', `IME Enter (${mode}) preserves the composed text`);
  }
  await composer.fill('Draft for Lab B');
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
  console.log(JSON.stringify({ status: 'pass', backend: 'synthetic intercepted Supabase HTTP', liveBackendVerified: false, finance: true, cases: true, casePendingCommitGuard: true, caseRetryIdentity: true, unmountedCaseResponseCannotNavigate: true, appointments: true, appointmentDirtyCloseGuards: true, appointmentPendingFocusTrap: true, messaging: true, imeEnterNeverPosts: true }));
} catch (error) { console.error(log); throw error; }
finally { fixture.releaseFinance?.(); fixture.releaseA?.(); fixture.releaseSend?.(); fixture.releaseCase?.(); fixture.releaseAppointment?.(); if (browser) await browser.close(); if (server) { server.kill('SIGTERM'); await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]); } }
