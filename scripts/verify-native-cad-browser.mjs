import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeWorkspace } from '../electron/aya/agent.cjs';

// The existing fixture owns the 3D scene and synthetic backend. These bindings
// pass renderer calls to the caller's already installed, live local AYA runtime.
export async function registerNativeCadBridge(page, url, aya, evidence) {
  const origin = new URL(url).origin;
  const assertFixtureFrame = ({ page: source, frame }) => {
    assert.equal(source, page);
    assert.equal(frame, page.mainFrame());
    assert.equal(new URL(frame.url()).origin, origin);
  };
  await page.exposeBinding('dentayaFixtureAyaStatus', async source => {
    assertFixtureFrame(source);
    const status = await aya.status();
    return { ...status, models: status.models.filter(item => item.name === aya.model) };
  });
  await page.exposeBinding('dentayaFixtureAyaCancel', (source, requestId) => {
    assertFixtureFrame(source);
    return aya.cancel(requestId);
  });
  await page.exposeBinding('dentayaFixtureAyaChat', async (source, input) => {
    assertFixtureFrame(source);
    assert.equal(input.model, aya.model);
    assert.equal(input.agent, true);
    const call = { kind: input.task === 'memory' ? 'memory' : 'cad', prompt: input.prompt, context: input.cadContext };
    evidence.calls.push(call);
    const reply = await aya.chat(input);
    call.reply = { ok: reply.ok, error: reply.error, output: reply.output?.slice(0, 2400),
      proposals: reply.proposals, metrics: reply.metrics };
    return reply;
  });
}

export async function verifyPlacedCrownWithAya({page, save, writes, errors, aya, evidence}) {
  evidence.stage = 'place';
  await page.getByRole('button', {name: 'Sonraki', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('.cad-professional')?.dataset.cadTask === 'fit');
  const saved = await save();
  const crown = saved.units['unit-46-0'];
  assert.ok(crown.anchor.placed, 'The real CAD editor must place its synthetic FDI 46 crown');

  const inspection = page.locator('[data-cad-inspection-state]');
  const geometry = () => inspection.evaluate(node => JSON.parse(node.dataset.cadInspectionState).geometry.hash);
  const before = await geometry();
  const writesBefore = writes.length;
  assert.ok(before, 'The working CAD crown must have a geometry fingerprint');

  evidence.stage = '4k-layout';
  await page.locator('.cad-main-header').getByRole('button', {name: 'AYA', exact: true}).click();
  const panel = page.getByRole('dialog', {name: 'AYA çalışma asistanı', exact: true});
  const composer = panel.getByRole('textbox', {name: 'AYA’ya mesajınız', exact: true});
  const send = panel.getByRole('button', {name: 'Gönder', exact: true});
  const report = panel.locator('[data-aya-fact=report]');
  const model = panel.getByRole('combobox', {name: 'Kurulu yerel model', exact: true});
  await model.selectOption(aya.model);
  await panel.getByRole('combobox', {name: 'Yanıt kaynağı', exact: true}).selectOption('conversation');
  const viewport = await page.evaluate(() => {
    const canvas = document.querySelector('.cad-scene-viewport canvas');
    const gl = canvas?.getContext('webgl2');
    return {width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
      devicePixelRatio, webGL2: Boolean(gl) && !gl.isContextLost(),
      framebuffer: {width: gl?.drawingBufferWidth, height: gl?.drawingBufferHeight}};
  });
  evidence.viewport = viewport;
  assert.deepEqual([viewport.width, viewport.height], [3840, 2160]);
  assert.ok(viewport.documentWidth <= viewport.width + 1 && viewport.webGL2, '4K CAD must render WebGL2 without horizontal overflow');
  for (const control of [composer, send]) {
    const bounds = await control.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 &&
      bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1,
    'The AYA composer and send button must fit within the 4K viewport');
  }
  assert.equal(await report.getAttribute('data-state'), 'missing');

  evidence.stage = 'proposal';
  const messages = panel.locator('.cad-aya-messages article');
  const alert = panel.getByRole('alert');
  await composer.fill('Aktif kuronu değiştirmeden geometri kontrolünü öner. Sonuç çıkmadan ölçüm veya kayıt sonucu söyleme.');
  await send.click();
  await messages.nth(1).or(alert).first().waitFor({timeout: 195000});
  const initial = evidence.calls.find(call => call.kind === 'cad');
  assert.ok(initial?.reply?.ok, 'The local model must return a structured CAD reply');
  assert.ok(initial.context?.scope && initial.context.snapshot && initial.context.dataToken);
  assert.equal(initial.context.unit, '46');
  assert.equal(initial.context.placed, true);
  assert.equal(initial.context.antagonistReady, false);
  assert.ok(initial.context.availableTools.includes('inspect'));
  assert.ok(initial.reply.proposals?.some(item => item.tool === 'inspect' &&
    item.scope === initial.context.scope && item.snapshot === initial.context.snapshot),
  'The actual model must propose inspect for the live unit and snapshot');
  const apply = messages.nth(1).locator('[data-proposal-tool=inspect]').getByRole('button', {name: 'Uygula', exact: true});
  await apply.waitFor();
  assert.equal(await report.getAttribute('data-state'), 'missing', 'A suggestion cannot run the check before Apply');
  assert.equal(await geometry(), before, 'A suggestion alone cannot alter the crown');
  assert.equal(writes.length, writesBefore, 'A suggestion alone cannot save the crown');

  evidence.stage = 'apply-and-interpret';
  const originalProposal = messages.nth(1).locator('[data-proposal-tool=inspect] button');
  await apply.click();
  await panel.locator('[data-aya-fact=report][data-state=current]').waitFor();
  await messages.nth(4).or(alert).first().waitFor({timeout: 195000});
  const interpreted = evidence.calls.filter(call => call.kind === 'cad').at(1);
  assert.ok(interpreted?.reply?.ok, 'The actual model must receive and interpret the post-Apply host report');
  const current = normalizeWorkspace(interpreted.context);
  const action = current.recentActions?.at(-1);
  assert.equal(current.unit, '46');
  assert.equal(current.scope, initial.context.scope);
  assert.notEqual(current.snapshot, initial.context.snapshot, 'A completed check must have a new committed snapshot');
  assert.ok(current.report?.triangles > 0, 'The actual kernel must return triangle evidence');
  assert.equal(current.report.dataToken, current.dataToken);
  assert.equal(current.report.contactReference, 'unavailable');
  assert.equal(action?.tool, 'inspect');
  assert.equal(action?.ok, true);
  assert.equal(action?.scope, current.scope);
  assert.equal(action?.snapshot, current.snapshot);
  assert.equal(action?.dataToken, current.dataToken);
  assert.equal(await originalProposal.isDisabled(), true, 'The previous proposal becomes stale after the committed report');
  assert.equal(await geometry(), before, 'Inspect must not modify the crown');
  assert.equal(writes.length, writesBefore, 'Inspect must not save the crown');
  assert.deepEqual(errors, []);
  evidence.kernel = {triangles: current.report.triangles, contactReference: current.report.contactReference,
    hostInspectReceipt: true, previousProposalDisabled: true, crownUnchanged: true};
  if (aya.screenshotDirectory) {
    await fs.mkdir(aya.screenshotDirectory, {recursive: true});
    const screenshot = 'native-aya-cad-4k.png';
    await page.screenshot({path: path.join(aya.screenshotDirectory, screenshot), timeout: 30000,
      animations: 'disabled', style: 'nextjs-portal{visibility:hidden!important}'});
    evidence.screenshot = screenshot;
  }
  evidence.stage = 'complete';
  return evidence;
}
