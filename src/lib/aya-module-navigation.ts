import workflows from '../../electron/aya/module-workflows.json';
import { AYA_NEW_APPOINTMENT_DRAFT, type AyaModuleActionId } from '../../electron/aya/module-actions.cjs';
import { MODULE_TREE, moduleDestinations } from './module-navigation';

export type AyaModuleId = keyof typeof workflows;

const labels = new Map(moduleDestinations(MODULE_TREE).map(({ href, label }) => [href.slice(1), label]));
labels.set('lab', 'Laboratuvar');
labels.set('twin', 'Dijital model');

function isAyaModule(id: string | null | undefined): id is AyaModuleId {
    return typeof id === 'string' && Object.hasOwn(workflows, id);
}

export function ayaModuleFromParam(value: string | null) {
    if (!isAyaModule(value)) return null;
    return { id: value, ...ayaModuleActionDestination(value) };
}

export function ayaModuleActionDestination(id: AyaModuleActionId) {
    const appointmentDraft = id === AYA_NEW_APPOINTMENT_DRAFT;
    const moduleId = appointmentDraft ? 'appointments' : id;
    return { href: `/${moduleId}`, label: labels.get(moduleId) ?? moduleId, ...(appointmentDraft ? {appointmentDraft} : {}) };
}

export function ayaHrefFromPathname(pathname: string) {
    const moduleId = pathname.split('/')[1];
    return isAyaModule(moduleId) ? `/ai?module=${moduleId}` : '/ai';
}
