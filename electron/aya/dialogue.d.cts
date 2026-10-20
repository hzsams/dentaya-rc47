import type {CoreReply,ConversationMessage} from './conversation.cjs';
import type {CadContext} from './assistant.cjs';
export const assistantProfile:Readonly<{name:string;product:string;purpose:string;capabilities:readonly string[];limits:readonly string[]}>;
export function profileInstructions():string;
export function answerDialogue(prompt:string,context?:{locale?:string;history?:ConversationMessage[];cadContext?:CadContext|null}):CoreReply|null;
export function isAcknowledgement(prompt:string):boolean;
export function followupMode(prompt:string):''|'detail'|'example'|'short';
export function declaredName(prompt:string):string;
export function isNameControl(prompt:string):boolean;
