import numberWords from './number-words.json';
const words=numberWords as Record<string,string>;
export function validTranslation(source:string,value:unknown):value is string {
 if(typeof value!=='string'||!value.trim()||value.length>Math.max(2000,source.length*6)||/<\/?[a-z][^>]*>/i.test(value))return false;
 const slots=(text:string)=>[...text.matchAll(/\{\d+\}/g)].map(match=>match[0]).sort();
 if(JSON.stringify(slots(source))!==JSON.stringify(slots(value)))return false;
 const numbers=(text:string)=>(text.replace(/\{\d+\}/g,'').match(/\d+(?:[.,]\d+)?/g)||[]).map(number=>number.replace(',','.'));
 const remaining=numbers(value);
 for(const number of numbers(source)){const index=remaining.indexOf(number);if(index<0)return false;remaining.splice(index,1);}
 const permitted=(source.match(/\p{L}+/gu)||[]).map(word=>words[word.toLowerCase().replace(/\u0307/g,'')]).filter(Boolean);
 for(const number of remaining){const index=permitted.indexOf(number);if(index<0)return false;permitted.splice(index,1);}return true;
}
