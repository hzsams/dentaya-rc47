import content from './i18n/dental-facts.json';
export const DENTAL_FACTS=content.facts;
export type DentalFact=typeof DENTAL_FACTS[number];
export function dentalFactLanguage(locale:string){return locale==='tr'?'tr' as const:'en' as const;}
export function dentalFactSource(fact:DentalFact){return content.sources[fact.source as keyof typeof content.sources];}
export function shuffleFacts(random:()=>number=Math.random){const values=Array.from({length:DENTAL_FACTS.length},(_,i)=>i);for(let i=values.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[values[i],values[j]]=[values[j],values[i]];}return values;}
const bags=new Map<string,{remaining:number[];last:number}>();
export function nextDentalFact(locale:string){const language=dentalFactLanguage(locale);let bag=bags.get(language);if(!bag){bag={remaining:[],last:-1};bags.set(language,bag);}if(!bag.remaining.length){bag.remaining=shuffleFacts();if(bag.remaining.at(-1)===bag.last)[bag.remaining[0],bag.remaining[DENTAL_FACTS.length-1]]=[bag.remaining[DENTAL_FACTS.length-1],bag.remaining[0]];}const index=bag.remaining.pop()!;bag.last=index;return DENTAL_FACTS[index];}
