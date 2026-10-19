export type KnowledgeItem={id:string;title:string;content:string;kind:'document'|'memory'};
export type CadContext={unit:string;restoration:string;stage:string;task?:string;setupComplete:boolean;sourceReady:boolean;modelReady:boolean;marginPoints:number;placed:boolean;visible:boolean;unsaved:boolean;saveFailed:boolean;isSaving?:boolean;upperReady?:boolean;lowerReady?:boolean;openingMm?:number};
export function normalizeKnowledge(input:unknown):KnowledgeItem[];
export function retrieveKnowledge(query:string,input:unknown,limit?:number):KnowledgeItem[];
export function answerOwned(prompt:string,context?:{knowledge?:unknown;cadContext?:CadContext|null;history?:{role:string;content:string;references?:{id:string;title:string;href:string}[]}[];options?:{style?:string;useKnowledge?:boolean};locale?:string;includeCatalog?:boolean},t?:(s:string)=>string):{ok:true;error?:string;engine:'core';output:string;references:{id:string;title:string;href:string}[]}|null;
export function normalizeCad(input:unknown):CadContext|null;
export function ownedContext(input:unknown):{version:string;cad:CadContext|null;personalKnowledge:KnowledgeItem[];references:{id:string;title:string;href:string}[]};
export function calculate(expression:string):{expression:string;result:number}|null;
export const CORE_VERSION:string;
export function localSetupGuide(t?:(s:string)=>string):string;

export type CadCheckItem={id:"setup"|"scan"|"marginStep"|"position"|"visibility"|"bite"|"save";state:"ready"|"pending"|"attention";message:string};
export function cadChecklist(context:unknown,t?:(s:string)=>string):CadCheckItem[];
export function nextCadAction(context:unknown):""|"save"|"setup"|"show"|"next"|"place";

export function answerWorkTool(prompt:string,context?:{cadContext?:CadContext|null;locale?:string},t?:(s:string)=>string):{ok:true;error?:string;engine:'core';output:string;references:[]}|null;
