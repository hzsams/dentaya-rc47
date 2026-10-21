'use strict';
// The reading cards and model grounding deliberately share the same curated corpus.
// This module retrieves evidence; it never chooses or generates a user's answer.
const corpus=require('../../src/lib/i18n/dental-facts.json');
const fold=value=>String(value??'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
const segmenter=new Intl.Segmenter(undefined,{granularity:'word'});
const ignored=new Set(fold('ve veya bir bu bunu bunun buna şu şunu o onu onun için ile nasıl ne neden nerede bana kanka ben sen biz peki sonra daha biraz çok kısa anlat anlatır anlatabilir açıkla açıklayabilir misin mı mi mısın devam edelim etsek hakkında konusunda hangi nedir neye dikkat ederiz yapalım istiyorum the and of to is are be in how what why where can could would you me please tell explain more it its this that about then continue contains contain lies').split(' '));
const generic=new Set(fold('diş dental tooth teeth cad aya model çalışma work bilgi information').split(' '));
function terms(value){return [...segmenter.segment(fold(value).slice(0,12000))].filter(w=>w.isWordLike&&w.segment.length>=3&&!ignored.has(w.segment)&&!generic.has(w.segment)&&!/^(?:anlat|acikla|acabil|acarim|ogren|bulun|icer|yapabil|edebil)\p{L}*$/u.test(w.segment)).map(w=>w.segment);}
function matches(a,b){return a===b||Math.min(a.length,b.length)>=4&&(a.startsWith(b)||b.startsWith(a));}
const weakTerm=word=>/^(?:risk|etki|sonuc|yapi|fark|adim|ornek|avantaj|dezavantaj|structure|effect|step|example|difference)/.test(word);
const index=corpus.facts.map(fact=>({fact,words:[...new Set(terms(fact.tr+' '+fact.en))]}));
const frequency=new Map();for(const item of index)for(const word of item.words)frequency.set(word,(frequency.get(word)||0)+1);
function retrieveFacts(query,{locale='tr',limit=4}={}){
 const words=[...new Set(terms(query))];if(!words.some(word=>!weakTerm(word)))return [];
 return index.map(({fact,words:content})=>{
  let score=0,matched=0,anchors=0;
  for(const word of words){const term=content.find(t=>matches(t,word));if(!term)continue;matched++;if(!weakTerm(word))anchors++;score+=Math.log(1+index.length/(frequency.get(term)||1))*(term===word?1:.8);}
  // A rare incidental dental word must not ground an otherwise unrelated request.
  return {fact,score,anchors,coverage:matched/words.length};
 }).filter(hit=>hit.anchors&&hit.score>=2&&hit.coverage>=.4).sort((a,b)=>b.score-a.score||a.fact.id.localeCompare(b.fact.id)).filter((hit,_i,all)=>hit.score>=all[0].score*.55).slice(0,Math.max(1,Math.min(6,limit))).map(({fact})=>{
  const source=corpus.sources[fact.source];
  return {id:fact.id,text:(locale==='tr'?fact.tr:fact.en).slice(0,1200),source:{id:fact.source,name:source.name,url:source.url},clinicalReviewStatus:corpus.clinicalReviewStatus,contentUpdatedAt:corpus.contentUpdatedAt};
 });
}
function contextualQueries(input,{hasDirectEvidence=false}={}){
 const prompt=typeof input?.prompt==='string'?input.prompt.slice(0,8000):'',words=terms(prompt).filter(word=>!weakTerm(word));
 // Expansion helps an underspecified follow-up; a named new subject stays authoritative.
 const referential=/\b(bunu|bunun|buna|onu|onun|this|that|it|its)\b/.test(fold(prompt));
 if(/\b(baska konu|yeni konu|new topic|instead)\b/.test(fold(prompt))||words.length>(referential?6:2)||hasDirectEvidence&&!referential)return [];
 const history=(Array.isArray(input?.history)?input.history:[]).slice(-24);
 const previous=history.filter(m=>m?.role==='user'&&typeof m.content==='string'&&terms(m.content).length&&!/\b(bunu|bunun|buna|onu|onun|this|that|it|its)\b/.test(fold(m.content))).slice(-1).map(m=>m.content.slice(0,1200));
 const goal=typeof input?.workingMemory?.goal==='string'?input.workingMemory.goal.slice(0,500):'';
 const relevantGoal=!previous.length||terms(goal).some(term=>terms(previous[0]).some(word=>matches(term,word)))?goal:'';
 return [...new Set([...previous,relevantGoal].filter(Boolean))].filter(q=>fold(q)!==fold(prompt)).slice(0,2);
}
module.exports={retrieveFacts,contextualQueries,terms};
