import type { CadTool, CadViewMode } from '../app/design/DesignViewport';
import type { CadToolMatrixItem } from './dentaya-cad-tool-matrix';

export type CadWorkflowStage = 'scan' | 'margin' | 'design' | 'contacts' | 'thickness' | 'review';
export type CadWorkspaceMode = 'wizard' | 'expert';
export type CadPanelTab = 'files' | 'margin' | 'fit' | 'anatomy' | 'freeform' | 'contacts' | 'inspect' | 'review';
export const CAD_STAGE_ORDER: CadWorkflowStage[] = ['scan', 'margin', 'design', 'contacts', 'thickness', 'review'];
export const CAD_GUIDED_TASKS: { stage: CadWorkflowStage; tab: CadPanelTab }[] = [
    { stage: 'scan', tab: 'files' },
    { stage: 'margin', tab: 'margin' },
    { stage: 'margin', tab: 'fit' },
    { stage: 'design', tab: 'anatomy' },
    { stage: 'design', tab: 'freeform' },
    { stage: 'contacts', tab: 'contacts' },
    { stage: 'thickness', tab: 'inspect' },
    { stage: 'review', tab: 'review' },
];
const POLICIES: Record<CadWorkflowStage, { tabs: CadPanelTab[]; tools: CadTool[]; views: CadViewMode[]; tool: CadTool; view: CadViewMode }> = {
    scan: { tabs: ['files'], tools: ['orbit', 'measure'], views: ['natural', 'wireframe'], tool: 'orbit', view: 'natural' },
    margin: { tabs: ['margin', 'fit'], tools: ['orbit', 'margin', 'measure'], views: ['natural', 'undercut', 'thickness', 'section', 'wireframe'], tool: 'margin', view: 'natural' },
    design: { tabs: ['anatomy', 'freeform', 'fit'], tools: ['orbit', 'add', 'reduce', 'smooth', 'flatten', 'measure'], views: ['natural', 'thickness', 'undercut', 'section', 'wireframe'], tool: 'orbit', view: 'natural' },
    contacts: { tabs: ['contacts', 'freeform'], tools: ['orbit', 'add', 'reduce', 'smooth', 'flatten', 'measure', 'connector'], views: ['natural', 'contact', 'section', 'wireframe'], tool: 'orbit', view: 'contact' },
    thickness: { tabs: ['inspect'], tools: ['orbit', 'measure'], views: ['natural', 'thickness', 'contact', 'undercut', 'section', 'wireframe'], tool: 'orbit', view: 'thickness' },
    review: { tabs: ['review'], tools: ['orbit', 'measure'], views: ['natural', 'thickness', 'contact', 'section', 'wireframe'], tool: 'orbit', view: 'natural' },
};
const ALL_TOOLS: CadTool[] = ['orbit', 'margin', 'measure', 'add', 'reduce', 'smooth', 'flatten', 'connector'];
const ALL_VIEWS: CadViewMode[] = ['natural', 'contact', 'thickness', 'undercut', 'section', 'wireframe'];
const ALL_TABS: CadPanelTab[] = ['freeform', 'anatomy', 'margin', 'fit', 'contacts', 'inspect', 'review', 'files'];
const TASK_POLICIES: Record<CadPanelTab, { tools: CadTool[]; views: CadViewMode[]; tool: CadTool; view: CadViewMode }> = {
    files: { tools: ['orbit'], views: ['natural', 'wireframe'], tool: 'orbit', view: 'natural' },
    margin: { tools: ['orbit', 'margin'], views: ['natural', 'undercut', 'section', 'wireframe'], tool: 'margin', view: 'natural' },
    fit: { tools: ['orbit', 'measure'], views: ['natural', 'undercut', 'thickness', 'section', 'wireframe'], tool: 'orbit', view: 'natural' },
    anatomy: { tools: ['orbit'], views: ['natural', 'wireframe'], tool: 'orbit', view: 'natural' },
    freeform: { tools: ['orbit', 'add', 'reduce', 'smooth', 'flatten'], views: ['natural', 'thickness', 'section', 'wireframe'], tool: 'add', view: 'natural' },
    contacts: { tools: ['orbit', 'measure', 'add', 'reduce', 'smooth', 'connector'], views: ['natural', 'contact', 'section', 'wireframe'], tool: 'orbit', view: 'contact' },
    inspect: { tools: ['orbit', 'measure'], views: ALL_VIEWS, tool: 'orbit', view: 'thickness' },
    review: { tools: ['orbit'], views: ['natural', 'thickness', 'contact', 'section', 'wireframe'], tool: 'orbit', view: 'natural' },
};
export function cadTaskForStage(stage: CadWorkflowStage, saved?: string): CadPanelTab {
    return CAD_GUIDED_TASKS.find(task => task.stage === stage && task.tab === saved)?.tab ?? stagePanel(stage);
}
export function cadTaskIndex(stage: CadWorkflowStage, tab: CadPanelTab): number {
    return CAD_GUIDED_TASKS.findIndex(task => task.stage === stage && task.tab === cadTaskForStage(stage, tab));
}
export function cadStagePolicy(stage: CadWorkflowStage, mode: CadWorkspaceMode, bridge = true, task?: CadPanelTab) {
    const tab = cadTaskForStage(stage, task);
    const policy = mode === 'expert' ? POLICIES[stage] : TASK_POLICIES[tab];
    return {
        tabs: mode === 'expert' ? ALL_TABS : [tab],
        tools: (mode === 'expert' ? ALL_TOOLS : policy.tools).filter(tool => bridge || tool !== 'connector'),
        views: mode === 'expert' ? ALL_VIEWS : policy.views,
        tool: policy.tool,
        view: policy.view,
    };
}
export function stagePanel(stage: CadWorkflowStage): CadPanelTab { return POLICIES[stage].tabs[0]; }
export function toolPanel(tool: CadTool, stage: CadWorkflowStage, mode: CadWorkspaceMode, current?: CadPanelTab): CadPanelTab {
    if (mode === 'wizard') return cadTaskForStage(stage, current);
    const preferred: Partial<Record<CadTool, CadPanelTab>> = { add: 'freeform', reduce: 'freeform', smooth: 'freeform', flatten: 'freeform', margin: 'margin', connector: 'contacts', measure: 'inspect' };
    const panel = preferred[tool];
    return panel && cadStagePolicy(stage, mode).tabs.includes(panel) ? panel : stagePanel(stage);
}
export type CadTransitionContext = { setupComplete: boolean; sourceReady: boolean; modelReady: boolean; marginReady: boolean };
export function cadTaskTransitionBlock(currentStage: CadWorkflowStage, currentTab: CadPanelTab, targetStage: CadWorkflowStage, targetTab: CadPanelTab, context: CadTransitionContext): 'loading' | 'sequence' | 'setup' | 'source' | 'margin' | null {
    const from = cadTaskIndex(currentStage, currentTab), to = cadTaskIndex(targetStage, targetTab);
    if (cadTaskForStage(targetStage, targetTab) !== targetTab || to < 0 || from < 0) return 'sequence';
    if (to <= from) return null;
    if (to > from + 1) return 'sequence';
    if (!context.setupComplete) return 'setup';
    if (!context.sourceReady) return 'source';
    if (!context.modelReady) return 'loading';
    if (to >= 2 && !context.marginReady) return 'margin';
    return null;
}
export function cadTransitionBlock(current: CadWorkflowStage, target: CadWorkflowStage, mode: CadWorkspaceMode, context: CadTransitionContext): 'loading' | 'sequence' | 'setup' | 'source' | 'margin' | null {
    const from = CAD_STAGE_ORDER.indexOf(current), to = CAD_STAGE_ORDER.indexOf(target);
    if (from < 0 || to < 0) return 'sequence';
    if (to <= from) return null;
    if (mode === 'wizard' && to > from + 1) return 'sequence';
    if (!context.setupComplete) return 'setup';
    if (!context.sourceReady) return 'source';
    if (!context.modelReady) return 'loading';
    if (to >= CAD_STAGE_ORDER.indexOf('design') && !context.marginReady) return 'margin';
    return null;
}
export function cadActivationAllowed(activation: string | undefined, stage: CadWorkflowStage, mode: CadWorkspaceMode, bridge = true, task?: CadPanelTab): boolean {
    if (!activation) return false;
    const policy = cadStagePolicy(stage, mode, bridge, task);
    if (activation.startsWith('tool:')) return policy.tools.includes(activation.slice(5) as CadTool);
    if (activation.startsWith('view:')) return policy.views.includes(activation.slice(5) as CadViewMode);
    if (activation.startsWith('stage:')) return mode === 'expert';
    if (activation === 'command:job-setup' || activation === 'command:save' || activation === 'command:undo' || activation === 'command:redo' || activation === 'command:fit') return true;
    if (mode === 'expert') return bridge || activation !== 'command:clear-connectors';
    if (activation.startsWith('setting:')) return policy.tabs.includes('freeform');
    if (['command:project-margin', 'command:margin-up', 'command:margin-down', 'command:clear-margin', 'command:smooth-margin'].includes(activation)) return policy.tabs.includes('margin');
    if (['command:internal-fit', 'command:set-axis', 'command:blockout', 'command:crown-shell', 'command:repair-shell'].includes(activation)) return policy.tabs.includes('fit');
    if (activation === 'command:kernel-qc') return policy.tabs.includes('fit') || ['contacts', 'thickness', 'review'].includes(stage);
    if (activation === 'command:clear-connectors') return stage === 'contacts' && bridge;
    if (activation === 'command:reset-design') return policy.tabs.includes('anatomy') || policy.tabs.includes('freeform');
    return false;
}
export function uniqueCadCommands(items: CadToolMatrixItem[]): CadToolMatrixItem[] {
    const commands = new Map<string, CadToolMatrixItem>();
    for (const item of items) {
        if (item.availability !== 'live' || !item.activation) continue;
        const existing = commands.get(item.activation);
        // Prefer the actual general command over a specialized label that called it.
        if (!existing || ['margin-free', 'kernel-qc', 'sectional-view'].includes(item.id)) commands.set(item.activation, item);
    }
    return [...commands.values()];
}
