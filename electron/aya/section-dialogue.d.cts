import type {CoreReply} from './conversation.cjs';
import type {AyaProposal} from './agent.cjs';
import type {AyaCadContext} from '../../src/lib/aya-cad-assistance';
export function suggestSectionReply(prompt:string,context?:{cadContext?:AyaCadContext|null;locale?:string;history?:readonly {role?:unknown;content?:unknown;cadScope?:unknown}[]}):(CoreReply&{proposals:AyaProposal[]})|null;
