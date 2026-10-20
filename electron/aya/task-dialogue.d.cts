import type {CoreReply,ConversationMessage} from './conversation.cjs';
import type {AyaWorkingMemory} from './agent.cjs';
import type {CadContext} from './assistant.cjs';
export function answerTasks(prompt:string,context?:{cadContext?:CadContext|null;workingMemory?:AyaWorkingMemory|null;locale?:string;history?:ConversationMessage[];options?:{useKnowledge?:boolean};t?:(s:string)=>string}):CoreReply|null;
