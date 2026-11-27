import workflows from './module-workflows.json';

export type AyaModuleActionId = keyof typeof workflows | 'workspace' | 'design';
export const AYA_MODULE_ACTION_IDS: readonly AyaModuleActionId[];
export function isAyaModuleActionId(value: unknown): value is AyaModuleActionId;
export function allowsAyaModuleActions(input: unknown): boolean;
export function parseModuleActionReply(output: string): {output:string;openModuleId?:AyaModuleActionId};
export function moduleActionStreamText(output: string): string;
