import type {CoreReply} from './conversation.cjs';
import type {AyaProposal,AyaWorkingMemory} from './agent.cjs';
import type {AyaCadContext} from '../../src/lib/aya-cad-assistance';
export function suggestCadReply(prompt:string,context?:{cadContext?:AyaCadContext|null;locale?:string;workingMemory?:AyaWorkingMemory}):(CoreReply&{proposals:AyaProposal[]})|null;
