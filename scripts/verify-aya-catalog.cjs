'use strict';
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {entries,topics,stats,sources}=require('../electron/aya/qa-catalog.cjs');
const {fold,answerCatalog,safetyReply,smallTalk,fallbackReply,retrieveCatalog}=require('../electron/aya/conversation.cjs');
const {answerOwned}=require('../electron/aya/assistant.cjs');
const {prepareContext}=require('../electron/aya/core.cjs');
const fixture=require('./fixtures/aya-questions.cjs');
assert.ok(entries.length>=1000);assert.equal(entries.length,1008);assert.equal(topics.length,252);
assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
assert.equal(new Set(entries.map(e=>fold(e.question))).size,entries.length,'Questions must be different, not spelling variants.');
const started=performance.now();
for(const entry of entries){
 assert.match(entry.id,/^[a-z0-9-]{3,72}$/);assert.ok(entry.answer.length>35&&entry.answer.length<1600);
 assert.ok(entry.sourceIds.length&&entry.sourceIds.every(s=>sources[s]));
 const actual=answerOwned(entry.question);
 assert.equal(actual?.output,entry.answer,entry.id+' exact answer');
 assert.equal(actual.references[0]?.id,'aya-qa-'+entry.id,entry.id+' exact evidence');
}
for(const topic of topics)assert.equal(new Set(topic.answers).size,4,topic.id+' must have four genuinely different answers.');
const failures=[];
for(const [query,topic,facet] of fixture){const actual=answerCatalog(query),expected='aya-qa-'+topic+'-'+facet;if(actual?.references[0]?.id!==expected)failures.push({query,expected,actual:actual?.references[0]?.id||actual?.output});}
assert.deepEqual(failures,[],'Regression wording must route to the intended topic AND purpose.');
const unknowns=['kuantum kozmoloji çarpışması','python döngüsünü açıklar mısın','yarın yağmur yağacak mı','en güzel araba hangisi','dün seni gördüm','🙂','x','bu diş kuantum fiziğini çözer mi','randevu planı','futbol çizgisi','alışveriş listesi'];
for(const q of unknowns){assert.equal(answerCatalog(q),null,q+' must not get an invented dental answer');assert.ok(fallbackReply(q).output.length>30);}
let first=answerCatalog('STL nedir');
const history=[{role:'user',content:'STL nedir'},{role:'assistant',content:first.output,references:first.references}];
assert.match(answerCatalog('Peki nasıl kontrol ederim?',{history}).output,/bütünlüğü|boyut/);
assert.match(answerCatalog('daha kısa',{history}).output,/STL/);
assert.equal(answerCatalog('devam',{history}).references[0].id,'aya-qa-scan-stl-steps');
assert.equal(answerCatalog('Peki dentin nedir?',{history}).references[0].id,'aya-qa-dentin-definition');
assert.equal(answerCatalog('devam'),null);
assert.match(answerCatalog('STL ile OBJ farkı').output,/OBJ[\s\S]*STL|STL[\s\S]*OBJ/);
assert.equal(answerCatalog('STL ile OBJ farkı').references.length,2);
for(const q of ['kanka selam','nasılsın','teşekkürler kanka','tamam','moralim bozuk','neler yapabilirsin'])assert.ok(smallTalk(q)?.output.length>20,q);
for(const q of ['Dişim şişti nefes alamıyorum','implant vidası kaç Ncm tork','hangi antibiyotik kaç mg','dişlerim çok ağrıyor'])assert.ok(safetyReply(q)?.output,q);
assert.match(safetyReply('Dişim şişti nefes alamıyorum').output,/hemen/);
assert.equal(safetyReply('Dental implant nedir?'),null);
assert.ok(!/\b\d+\s*(mg|Ncm)\b/.test(safetyReply('implant torku 35 ncm olur mu').output));
assert.match(answerCatalog('51 hangi diş').output,/süt santral kesici/);
assert.match(answerCatalog('85 hangi diş').output,/alt sağ.*ikinci süt azı/);
assert.match(answerCatalog('48 hangi diş').output,/alt sağ.*üçüncü büyük azı/);
assert.equal(retrieveCatalog('kuantum kozmoloji').length,0);
const noKnowledge=prepareContext({prompt:'Dentin nedir',options:{useKnowledge:false}});assert.equal(noKnowledge.references.length,0);
const grounding=prepareContext({prompt:'Dentin nedir'});assert.ok(JSON.stringify(grounding.context.catalog).includes('mine ve kök'));assert.ok(!grounding.instructions.includes('mine ve kök'));assert.ok(grounding.references.some(r=>r.id==='aya-qa-dentin-definition'));assert.ok(grounding.instructions.length<18000);
assert.equal(answerOwned('Dentin nedir',{options:{useKnowledge:false}}),null);
console.log(JSON.stringify({pass:true,catalogue:stats,canonicalQuestionsVerified:entries.length,regressionQueries:fixture.length,unknownsRejected:unknowns.length,followup:true,safety:true,exactPassMs:Math.round(performance.now()-started)},null,2));
