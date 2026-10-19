import assert from 'node:assert/strict';
import { CAD_STAGE_ORDER, CAD_GUIDED_TASKS, cadStagePolicy, cadTaskForStage, cadTaskIndex, cadTaskTransitionBlock, cadTransitionBlock, cadActivationAllowed, uniqueCadCommands, toolPanel } from '../src/lib/cad-workflow';
import { DENTAYA_CAD_TOOL_MATRIX } from '../src/lib/dentaya-cad-tool-matrix';
import { uniqueModuleDestinations } from '../src/lib/workspace-navigation';
const complete = { setupComplete: true, sourceReady: true, modelReady: true, marginReady: true };
for (const [index, stage] of CAD_STAGE_ORDER.entries()) {
    const policy = cadStagePolicy(stage, 'wizard');
    assert.equal(policy.tabs.length, 1, `${stage}: only the current task parameters`);
    assert.ok(!policy.tools.includes('margin') || stage === 'margin');
    assert.ok(!policy.tools.includes('connector') || stage === 'contacts');
    for (const tool of ['add', 'reduce', 'smooth', 'flatten'] as const) {
        assert.equal(policy.tools.includes(tool), stage === 'contacts' && tool !== 'flatten');
        assert.equal(cadActivationAllowed(`tool:${tool}`, stage, 'wizard'), policy.tools.includes(tool));
    }
    assert.ok(cadStagePolicy(stage, 'wizard', false).tools.every(tool => tool !== 'connector'));
    assert.equal(cadStagePolicy(stage, 'expert').tools.length, 8);
    assert.equal(cadStagePolicy(stage, 'expert').tabs.length, 8);
    assert.ok(policy.tabs.includes(toolPanel('measure', stage, 'wizard')));
    for (const [targetIndex, target] of CAD_STAGE_ORDER.entries()) {
        assert.equal(cadTransitionBlock(stage, target, 'wizard', complete), targetIndex > index + 1 ? 'sequence' : null);
        assert.equal(cadTransitionBlock(stage, target, 'expert', complete), null);
    }
}
assert.equal(cadTransitionBlock('scan', 'margin', 'wizard', { ...complete, setupComplete: false }), 'setup');
assert.equal(cadTransitionBlock('scan', 'margin', 'wizard', { ...complete, sourceReady: false }), 'source');
assert.equal(cadTransitionBlock('scan', 'margin', 'wizard', { ...complete, modelReady: false }), 'loading');
assert.equal(cadTransitionBlock('margin', 'design', 'wizard', { ...complete, marginReady: false }), 'margin');
assert.equal(cadTransitionBlock('scan', 'review', 'expert', { ...complete, marginReady: false }), 'margin');
assert.equal(cadTransitionBlock('review', 'scan', 'wizard', { setupComplete: false, sourceReady: false, modelReady: false, marginReady: false }), null);
assert.equal(cadActivationAllowed('command:crown-shell', 'scan', 'wizard'), false);
assert.equal(cadActivationAllowed('command:crown-shell', 'design', 'wizard'), false);
assert.equal(cadActivationAllowed('command:crown-shell', 'margin', 'wizard', true, 'fit'), true);
assert.equal(cadActivationAllowed('setting:brush-round', 'margin', 'wizard'), false);
assert.equal(cadActivationAllowed('command:clear-connectors', 'contacts', 'wizard', false), false);
assert.equal(cadActivationAllowed('stage:review', 'scan', 'wizard'), false);
const commands = uniqueCadCommands(DENTAYA_CAD_TOOL_MATRIX);
assert.equal(new Set(commands.map(item => item.activation)).size, commands.length);
assert.ok(commands.every(item => item.availability === 'live' && item.activation));
assert.equal(commands.filter(item => item.activation === 'command:crown-shell').length, 1);
assert.equal(commands.filter(item => item.activation === 'tool:margin').length, 1);
assert.equal(commands.find(item => item.activation === 'command:kernel-qc')?.id, 'kernel-qc');
const modules = uniqueModuleDestinations([{ href: '/design', title: 'CAD' }, { href: '/cad', title: 'Alias' }, { href: '/design/', title: 'Again' }, { href: '/cases/47', title: 'Case 47' }, { href: '/cases/46', title: 'Case 46' }]);
assert.deepEqual(modules.map(item => item.title), ['CAD', 'Case 47', 'Case 46']);
assert.deepEqual(CAD_GUIDED_TASKS.map(task => task.tab), ['files', 'margin', 'fit', 'anatomy', 'freeform', 'contacts', 'inspect', 'review']);
for (const [index, task] of CAD_GUIDED_TASKS.entries()) {
    const policy = cadStagePolicy(task.stage, 'wizard', true, task.tab);
    assert.deepEqual(policy.tabs, [task.tab]);
    assert.equal(cadTaskIndex(task.stage, task.tab), index);
    assert.ok(!policy.tools.includes('margin') || task.tab === 'margin');
    assert.ok(!policy.tools.includes('connector') || task.tab === 'contacts');
    assert.ok(!policy.tools.includes('add') || ['freeform', 'contacts'].includes(task.tab));
    for (const tool of ['orbit', 'margin', 'measure', 'add', 'reduce', 'smooth', 'flatten', 'connector'] as const) {
        assert.equal(cadActivationAllowed(`tool:${tool}`, task.stage, 'wizard', true, task.tab), policy.tools.includes(tool));
        assert.equal(toolPanel(tool, task.stage, 'wizard', task.tab), task.tab, 'Tool shortcuts do not open future tasks');
    }
    assert.ok(!cadStagePolicy(task.stage, 'wizard', false, task.tab).tools.includes('connector'));
    for (const [targetIndex, target] of CAD_GUIDED_TASKS.entries()) {
        assert.equal(cadTaskTransitionBlock(task.stage, task.tab, target.stage, target.tab, complete), targetIndex > index + 1 ? 'sequence' : null);
    }
}
assert.deepEqual(cadStagePolicy('scan', 'wizard').tools, ['orbit']);
assert.deepEqual(cadStagePolicy('design', 'wizard', true, 'anatomy').tools, ['orbit']);
assert.deepEqual(cadStagePolicy('design', 'wizard', true, 'freeform').tools, ['orbit', 'add', 'reduce', 'smooth', 'flatten']);
assert.equal(cadTaskForStage('design', 'freeform'), 'freeform', 'Saved subtask is resumed');
assert.equal(cadTaskForStage('scan', 'review'), 'files', 'Old/incompatible subtask cannot open a future group');
assert.equal(cadTaskForStage('margin', undefined), 'margin', 'Old projects resume their stored stage');
assert.equal(cadTaskTransitionBlock('scan', 'files', 'margin', 'margin', { ...complete, setupComplete: false }), 'setup');
assert.equal(cadTaskTransitionBlock('scan', 'files', 'margin', 'margin', { ...complete, sourceReady: false }), 'source');
assert.equal(cadTaskTransitionBlock('scan', 'files', 'margin', 'margin', { ...complete, modelReady: false }), 'loading');
assert.equal(cadTaskTransitionBlock('margin', 'margin', 'margin', 'fit', { ...complete, marginReady: false }), 'margin');
assert.equal(cadTaskTransitionBlock('margin', 'margin', 'design', 'anatomy', complete), 'sequence', 'Internal fit is a separate task');
assert.equal(cadTaskTransitionBlock('design', 'freeform', 'margin', 'fit', { setupComplete: false, sourceReady: false, modelReady: false, marginReady: false }), null);
assert.equal(cadTaskTransitionBlock('design', 'anatomy', 'design', 'inspect', complete), 'sequence');
assert.equal(cadActivationAllowed('setting:brush-round', 'design', 'wizard', true, 'anatomy'), false);
assert.equal(cadActivationAllowed('setting:brush-round', 'design', 'wizard', true, 'freeform'), true);
console.log(JSON.stringify({ pass: true, storedStages: 6, guidedTasks: 8, oneParameterGroup: true, explicitExpertOnly: true, taskPrerequisites: true, backNavigation: true, bridgeContext: true, savedTaskResume: true, distinctCommands: commands.length, moduleAliasesMerged: true }, null, 2));
