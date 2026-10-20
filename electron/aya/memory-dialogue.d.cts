import type {AyaWorkingMemory} from './agent.cjs';
import type {CoreReply} from './conversation.cjs';
export type MemoryReply=CoreReply&{workingMemory?:AyaWorkingMemory};
export function isMemoryCommand(prompt:unknown):boolean;
export function answerMemory(prompt:unknown,context?:{workingMemory?:AyaWorkingMemory;locale?:string}):MemoryReply|null;
