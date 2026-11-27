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

export async function verifyPlacedCrownWithAya({page, save, readSavedWorkspace, writes, errors, aya, evidence}) {
  evidence.stage = 'place';
  await page.getByRole('button', {name: 'Sonraki', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('.cad-professional')?.dataset.cadTask === 'fit');
  const saved = await save();
  const crown = saved.units['unit-46-0'];
  assert.ok(crown.anchor.placed, 'The real CAD editor must place its synthetic FDI 46 crown');
  assert.equal(crown.shell, undefined, 'The starting crown has no shell');

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

  evidence.stage = 'shell-proposal';
  const messages = panel.locator('.cad-aya-messages article');
  const alert = panel.getByRole('alert');
  const cadCalls = () => evidence.calls.filter(call => call.kind === 'cad');
  const proposal = (call, tool) => call.reply.proposals?.some(item => item.tool === tool &&
    item.scope === call.context.scope && item.snapshot === call.context.snapshot);
  const control = (message, tool) => messages.nth(message).locator(`[data-proposal-tool=${tool}] button`);
  const assertReceipt = (current, tool) => {
    const action = current.recentActions?.at(-1);
    assert.equal(action?.tool, tool);
    assert.equal(action.ok, true);
    assert.equal(action.scope, current.scope);
    assert.equal(action.snapshot, current.snapshot);
    assert.equal(action.dataToken, current.dataToken);
  };
  await composer.fill('Aktif 46 numaralı tek kuronun mevcut ayarlarla ilk kabuğunu oluşturmak için uygun CAD işlemini öner. Geometri kontrolünü kabuk gerçekten oluştuktan sonra ayrı bir adım olarak istiyorum.');
  await send.click();
  await messages.nth(1).or(alert).first().waitFor({timeout: 195000});
  const initial = cadCalls()[0];
  assert.ok(initial?.reply?.ok, 'The local model must return a structured CAD reply');
  assert.ok(initial.context?.scope && initial.context.snapshot && initial.context.dataToken);
  assert.equal(initial.context.unit, '46');
  assert.equal(initial.context.placed, true);
  assert.equal(initial.context.antagonistReady, false);
  assert.ok(initial.context.availableTools.includes('crown-shell'));
  assert.ok(proposal(initial, 'crown-shell'), 'The actual model must propose shell creation for the live unit and snapshot');
  assert.equal(await geometry(), before, 'A suggestion alone cannot alter the crown');
  assert.equal(writes.length, writesBefore, 'A suggestion alone cannot save the crown');

  evidence.stage = 'shell-apply-and-inspect-proposal';
  const shellApply = control(1, 'crown-shell');
  assert.equal(await shellApply.textContent(), 'Uygula');
  await shellApply.click();
  await messages.nth(4).or(alert).first().waitFor({timeout: 195000});
  const postShell = cadCalls()[1];
  assert.ok(postShell?.reply?.ok, 'The actual model must receive the committed shell result');
  const built = normalizeWorkspace(postShell.context);
  assert.equal(built.unit, initial.context.unit);
  assert.equal(built.scope, initial.context.scope);
  assert.notEqual(built.snapshot, initial.context.snapshot);
  assert.notEqual(built.dataToken, initial.context.dataToken, 'Applying shell creation must change the CAD data revision');
  assert.equal(built.isSaving, false, 'The shell follow-up waits for the editor to save the mesh');
  assert.equal(built.unsaved, false);
  assertReceipt(built, 'crown-shell');
  assert.ok(!built.availableTools.includes('crown-shell'), 'An existing shell is not eligible for initial creation again');
  assert.ok(built.availableTools.includes('inspect'));
  assert.ok(proposal(postShell, 'inspect'), 'The actual model must propose a fresh check with the post-shell snapshot');
  assert.equal(await shellApply.isDisabled(), true, 'The original shell proposal becomes stale');
  const shelled = await geometry();
  assert.ok(shelled && shelled !== before, 'The real WebGL geometry changes after shell creation');
  const shell = (await readSavedWorkspace())?.units['unit-46-0']?.shell;
  assert.ok(shell?.indices.length > 0 && shell.positions.length > 0, 'The synthetic server contains a full saved shell mesh');
  assert.equal(await report.getAttribute('data-state'), 'missing', 'The next proposal cannot execute QC before separate approval');
  const writesAfterShell = writes.length;

  evidence.stage = 'inspect-apply-and-interpret';
  const inspectApply = control(4, 'inspect');
  assert.equal(await inspectApply.textContent(), 'Uygula');
  await inspectApply.click();
  await panel.locator('[data-aya-fact=report][data-state=current]').waitFor();
  await messages.nth(7).or(alert).first().waitFor({timeout: 195000});
  const interpreted = cadCalls()[2];
  assert.ok(interpreted?.reply?.ok, 'The actual model must receive and interpret the post-Apply host report');
  const current = normalizeWorkspace(interpreted.context);
  assert.equal(current.unit, '46');
  assert.equal(current.scope, built.scope);
  assert.notEqual(current.snapshot, built.snapshot, 'A completed check must have a new committed snapshot');
  assert.equal(current.dataToken, built.dataToken, 'The check must use the exact shell geometry');
  assert.equal(current.report?.triangles, shell.indices.length/3, 'The actual kernel report must match the saved shell');
  assert.equal(current.report.dataToken, current.dataToken);
  assert.equal(current.report.contactReference, 'unavailable');
  assertReceipt(current, 'inspect');
  assert.equal(await inspectApply.isDisabled(), true, 'The inspect proposal becomes stale after the committed report');
  assert.equal(await geometry(), shelled, 'Inspect must not modify the shell');
  assert.equal(writes.length, writesAfterShell, 'Inspect must not save the shell');
  assert.deepEqual(errors, []);
  evidence.kernel = {triangles: current.report.triangles, contactReference: current.report.contactReference,
    hostShellReceipt: true, generatedShellSaved: true, separateApprovals: true,
    hostInspectReceipt: true, previousProposalDisabled: true, shellUnchangedOnInspect: true};
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
