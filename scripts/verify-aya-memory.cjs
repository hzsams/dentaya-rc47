'use strict';
const assert=require('node:assert/strict');
const {answerMemory,isMemoryCommand}=require('../electron/aya/memory-dialogue.cjs');
const blank={goal:'',decisions:[],openQuestions:[]};
const existing={goal:'Teslimi cuma hazırla',decisions:['Önce prova kontrolü'],openQuestions:['Kurye saati?']};
let checks=0;
function memory(prompt,current=blank,locale='tr'){
 const original=JSON.stringify(current),answer=answerMemory(prompt,{workingMemory:current,locale});
 assert.equal(JSON.stringify(current),original,'The input memory must never be mutated: '+prompt);
 assert.ok(answer,'Expected a memory response: '+prompt);assert.equal(answer.ok,true);assert.equal(answer.engine,'core');assert.deepEqual(answer.references,[]);checks++;
 return answer;
}
function noControl(prompt){assert.equal(isMemoryCommand(prompt),false,prompt);assert.equal(answerMemory(prompt,{workingMemory:existing}),null,prompt);checks++;}
function error(prompt,current=existing,locale='tr'){
 const answer=memory(prompt,current,locale);assert.equal(answer.workingMemory,undefined,prompt);assert.match(answer.output,locale==='tr'?/değiştirmedim/:/not changed/);return answer;
}

const frozen=Object.freeze({goal:existing.goal,decisions:Object.freeze([...existing.decisions]),openQuestions:Object.freeze([...existing.openQuestions])});
for(const prompt of ['Hedefimiz neydi?','Önceki kararımız neydi?','Açık sorularımız neler?','Çalışma belleğini göster','Hedefi hatırlıyor musun?','What is our goal?','What did we decide?','Show our open questions','What is in working memory?']){
 assert.equal(isMemoryCommand(prompt),false,'Recall keeps normal model priority.');
 const answer=memory(prompt,frozen,prompt.startsWith('What')||prompt.startsWith('Show')?'en':'tr');
 assert.equal(answer.workingMemory,undefined);for(const value of [existing.goal,...existing.decisions,...existing.openQuestions])assert.ok(answer.output.includes(value));
}
assert.match(memory('Hedefimiz neydi?').output,/kayıtlı hedef veya karar yok/);
assert.match(memory('What is our goal?',blank,'en').output,/No goal/);

for(const [prompt,goal] of [['Hedefimiz: Cuma teslimi',['Cuma teslimi']],['Hedefi değiştir: Koleyi doğrula',['Koleyi doğrula']],['Goal: Prepare delivery',['Prepare delivery']],['Change goal: Check the margin',['Check the margin']],['Hedefimiz güvenilir kayıt olsun.',['güvenilir kayıt']],['HEDEFİMİZ güvenilir kayıt OLSUN!',['güvenilir kayıt']]]){
 assert.equal(isMemoryCommand(prompt),true);assert.deepEqual(memory(prompt).workingMemory,{...blank,goal:goal[0]});
}
const combined=memory('Hedefimiz: Vakayı tamamla\nKarar: Önce prova\nAçık soru: Antagonist yüklü mü?').workingMemory;
assert.deepEqual(combined,{goal:'Vakayı tamamla',decisions:['Önce prova'],openQuestions:['Antagonist yüklü mü?']});
const english=memory('Goal: Finish the case\nDecision: Check the margin first\nOpen question: Is the antagonist loaded?',blank,'en');
assert.deepEqual(english.workingMemory,{goal:'Finish the case',decisions:['Check the margin first'],openQuestions:['Is the antagonist loaded?']});assert.match(english.output,/this session/);
const deduped=memory('Karar: ÖNCE  PROVA KONTROLÜ\nAçık soru: Kurye saati?',existing);
assert.equal(deduped.workingMemory,undefined);assert.match(deduped.output,/zaten aynı/);
assert.deepEqual(memory('Decision: Inspect\nDecision: inspect\nDecision: Save',blank,'en').workingMemory.decisions,['Inspect','Save']);
// Similar-looking values may be different evidence. Never silently collapse
// non-Latin text, negative values, operators, diacritics or punctuation.
for(const [prompt,expected] of [
 ['Decision: 检查边缘\nDecision: 完成生产',['检查边缘','完成生产']],
 ['Decision: Проверить край\nDecision: Завершить работу',['Проверить край','Завершить работу']],
 ['Karar: Boşluğu -0,2 mm yap\nKarar: Boşluğu +0,2 mm yap',['Boşluğu -0,2 mm yap','Boşluğu +0,2 mm yap']],
 ['Decision: a != b\nDecision: a = b',['a != b','a = b']],
 ['Decision: Inspect\nDecision: Inspect.',['Inspect','Inspect.']],
 ['Decision: résumé\nDecision: resume',['résumé','resume']]
])assert.deepEqual(memory(prompt,blank,'en').workingMemory.decisions,expected);
assert.deepEqual(memory('Open question: A != B?\nOpen question: A = B?',blank,'en').workingMemory.openQuestions,['A != B?','A = B?']);
const differentSigns={goal:'Check',decisions:['Offset +0.2 mm','Offset 0.1 mm'],openQuestions:[]};
assert.deepEqual(memory('Replace decision 2: Offset -0.2 mm',differentSigns,'en').workingMemory.decisions,['Offset +0.2 mm','Offset -0.2 mm']);

for(const prompt of ['Karar 1: Önce koleyi doğrula',"Karar 1'i değiştir: Önce koleyi doğrula",'1. kararı düzelt: Önce koleyi doğrula','Replace decision 1: Önce koleyi doğrula'])assert.deepEqual(memory(prompt,existing).workingMemory.decisions,['Önce koleyi doğrula']);
for(const prompt of ['Açık soru 1: Hangi kurye?',"Açık soru 1’i değiştir: Hangi kurye?",'1. açık soruyu düzelt: Hangi kurye?','Change open question 1: Hangi kurye?'])assert.deepEqual(memory(prompt,existing).workingMemory.openQuestions,['Hangi kurye?']);
for(const prompt of ["Karar 1'i sil",'1. kararı sil','Delete decision 1'])assert.deepEqual(memory(prompt,existing).workingMemory,{...existing,decisions:[]});
for(const prompt of ["Açık soru 1'i kapat",'1. açık soruyu kapat','Close open question 1'])assert.deepEqual(memory(prompt,existing).workingMemory,{...existing,openQuestions:[]});
for(const prompt of ['Çalışma belleğini sıfırla','Tüm oturum belleğini sil','Please reset session memory','Clear working memory']){
 assert.deepEqual(memory(prompt,existing).workingMemory,blank);assert.deepEqual(memory(prompt).workingMemory,blank,'An explicit reset returns an empty memory even when already empty.');
}
assert.deepEqual(memory('Hedefi temizle',existing).workingMemory,{...existing,goal:''});
assert.deepEqual(memory('Tüm kararları sil',existing).workingMemory,{...existing,decisions:[]});
assert.deepEqual(memory('Close all open questions',existing,'en').workingMemory,{...existing,openQuestions:[]});

const full={goal:'Dolu',decisions:['Karar A','Karar B','Karar C','Karar D','Karar E'],openQuestions:['Soru A?','Soru B?','Soru C?']};
for(const [label,limit,field] of [['Goal',500,'goal'],['Decision',240,'decisions'],['Open question',240,'openQuestions']]){
 const value='x'.repeat(limit);const answer=memory(label+': '+value);
 assert.equal(field==='goal'?answer.workingMemory.goal:answer.workingMemory[field][0],value);
 error(label+': '+'x'.repeat(limit+1));error(label+':   ');
}
for(const prompt of ['Karar: Taşan karar','Açık soru: Taşan soru?','Hedefimiz: Değişmeyecek\nKarar: Taşan karar'])assert.match(error(prompt,full).output,/5 karar ve 3 açık soru/);
assert.equal(memory('Karar: KARAR A!',full).workingMemory,undefined,'Duplicates do not consume capacity.');
assert.deepEqual(memory('Decision: New decision\nRemove decision 1',full).workingMemory.decisions,['Karar B','Karar C','Karar D','Karar E','New decision'],'Atomic batches may explicitly make room.');
for(const prompt of ['Karar 0: Yanlış','Karar 2: Yanlış','Remove decision 0','Close open question 2','Hedef: Yarım değişiklik yok\nKarar 2: Yanlış','Karar: Yarım değişiklik yok\nAçık soru: '])error(prompt);
error('Karar 1: Karar B',full);
error(Array.from({length:17},()=> 'Decision: Same').join('\n'));
error('Karar: Bir\nKarar: İki\nKarar: Üç\nKarar: Dört\nKarar: Beş\nKarar: Altı',blank);
const atom=memory('Karar: Yeni\r\nAçık soru: Yeni soru?\rHedef: Yeni hedef',existing).workingMemory;
assert.deepEqual(atom,{goal:'Yeni hedef',decisions:[...existing.decisions,'Yeni'],openQuestions:[...existing.openQuestions,'Yeni soru?']});
assert.notEqual(atom.decisions,existing.decisions);assert.notEqual(atom.openQuestions,existing.openQuestions);

for(const prompt of [
 '',null,42,{},'x'.repeat(8001),'Goal: '+'x'.repeat(8000),
 'Dentin nedir?','Hedefimiz hava durumu mu?','What is our goal weather?','What is our goal and how do I measure the margin?',
 'How much memory does this model need?','Explain working memory','Fix the memory leak','Show memory usage','Bellek kullanımı ne kadar?','Çalışma belleği nedir?',
 '"Çalışma belleğini sıfırla"','“Hedefimiz: Teslim”',"'Clear working memory'",'```\nClear working memory\n```','> Karar: Kayıt',
 'Şunu çevir: çalışma belleğini sıfırla','Translate: Clear working memory','Write a story: Clear session memory','Hikâyede çalışma belleğini sıfırla',
 'Eğer çalışma belleğini sıfırla dersem ne olur?','If I say clear working memory, what happens?','Çalışma belleğini sıfırla dersem ne olur?','Hedefimiz teslim olsun eğer süre kalırsa',
 'Clear working memory?','Her şeyi unut','Beni unutma','Hafızanı sil','Forget everything',
 'Karar: Kaydet\nSTL nedir?','STL nedir?\nKarar: Kaydet','Karar: Kaydet\nBunu İngilizceye çevir','Karar: Kaydet\nHayır, başka bir şey',
 'Karar: Kaydet; Açık soru: Kurye?','Hedefimiz: Teslim. Şimdi STL nedir?','Decision: Save. Also explain STL','Goal: Finish the case, and tell me the weather',
 'Açık soru: Hangi materyal? Sonra teslim notu yaz','Açık soru: Hangi materyal? Ardından teslim notu yaz',
 'Açık soru: Hangi materyal? Ve teslim notu yaz','Hedef: Cuma teslim et; ardından teslim notu yaz',
 'Hedef: Cuma teslim et, sonra teslim notu yaz','Karar: Önce prova. Sonra bir şiir yaz',
 'Açık soru: Hangi materyal?Sonra teslim notu yaz','Hedef: Cuma teslim et;ardından teslim notu yaz',
 'Open question: Which material? Then prepare a handoff draft','Open question: Which material? And write a handoff note',
 'Goal: Finish the case. After that prepare a handoff draft','Goal: Finish the case. Decision: Inspect first',
 'Karar: Önce prova, açık soru: Hangi materyal?',
 'Karar: Yeni kayıt\nAçık soru: Hangi materyal? Sonra teslim notu yaz',
 'Hedef: Cuma teslim et; ardından teslim notu yaz\nKarar: Yeni kayıt',
 'Hedefimiz neydi?\nSTL nedir?','Hedefimiz neydi? Hava nasıl?'
])noControl(prompt);
// Ordinary conjunctions and sequential wording inside one stored note remain
// data; only a separately introduced request invalidates the control batch.
assert.deepEqual(memory('Karar: Kole ve temas kontrolü',blank).workingMemory.decisions,['Kole ve temas kontrolü']);
assert.deepEqual(memory('Karar: Önce prova ve sonra üretim',blank).workingMemory.decisions,['Önce prova ve sonra üretim']);
assert.deepEqual(memory('Open question: Which material and which manufacturer?',blank,'en').workingMemory.openQuestions,['Which material and which manufacturer?']);
const literal=memory('Karar: "Çalışma belleğini sıfırla" cümlesini alıntı olarak sakla',existing).workingMemory;
assert.equal(literal.goal,existing.goal);assert.equal(literal.decisions.length,2,'Quoted payloads are data, never nested controls.');
assert.equal(literal.openQuestions.length,1);
console.log('PASS: '+checks+' pure TR/EN session-memory cases: explicit controls, bounded atomic updates, correction/removal, dedupe, recall, unchanged inputs and quoted/mixed-request fallthrough. No model inference.');
