'use strict';

// Behavioral checks for the offline conversational layer. No model is loaded.
const assert=require('node:assert/strict');
const {answerDialogue,isAcknowledgement}=require('../electron/aya/dialogue.cjs');
const {answerOwned}=require('../electron/aya/assistant.cjs');
const {answerCatalog}=require('../electron/aya/conversation.cjs');

let cases=0;
const groups={},failures=[];
function check(group,label,run){
 cases++;groups[group]=(groups[group]||0)+1;
 try{run();}catch(error){failures.push({group,label,error:error.message});}
}
function replyMatches(reply,patterns,label){
 assert.ok(reply?.ok,label+' must receive a supported reply');
 assert.equal(reply.engine,'core',label+' must honestly identify the offline engine');
 assert.equal(typeof reply.output,'string');
 assert.ok(reply.output.trim().length>15);
 assert.deepEqual(reply.references,[],label+' must not invent a document or notebook citation');
 for(const pattern of patterns)assert.match(reply.output,pattern,label);
}

const basics=[
 ['adın ne','tr',[/AYA/,/DentAYA/]],
 ['Amacın ne?','tr',[/yardım|yardim/i,/iş|is|araç|arac/i]],
 ['senin ismin nedir?','tr',[/AYA/,/DentAYA/]],
 ['Adın neydi?','tr',[/AYA/]],
 ['Adını söyler misin?','tr',[/AYA/]],
 ['Sana nasıl hitap edeyim?','tr',[/AYA/]],
 ['Sen kimsin?','tr',[/AYA/,/DentAYA/]],
 ['Kendini tanıtır mısın?','tr',[/AYA/,/DentAYA/]],
 ['Bana kısaca kendini tanıtır mısın lütfen?','tr',[/AYA/,/DentAYA/]],
 ['Ne işe yarıyorsun?','tr',[/yardım|yardim/i]],
 ['Neden varsın?','tr',[/yardım|yardim/i]],
 ['Görevin nedir?','tr',[/yardım|yardim/i]],
 ['Neler yapabilirsin?','tr',[/hesap/i,/CAD/]],
 ['Hangi konularda yardımcı olabilirsin?','tr',[/hesap/i,/tasla|not/i]],
 ['Bana yardım eder misin?','tr',[/hesap|iş akış|is akis/i]],
 ['Neleri yapamazsın?','tr',[/tanı|tani/i,/CAD/]],
 ['İnsan mısın?','tr',[/insan değil|insan degil/i,/Core/]],
 ['Bir yapay zeka mısın?','tr',[/AYA/,/Core/]],
 ['Model olmadan çalışabilir misin?','tr',[/Core/,/model/i]],
 ['Beni hatırlıyor musun?','tr',[/geçmiş|gecmis/i,/kalıcı|kalici|yeni oturum/i]],
 ['Mesajlarım buluta gidiyor mu?','tr',[/bulut/i,/cihaz|bilgisayar/i]],
 ['Merhaba!','tr',[/AYA/]],
 ['Nasılsın?','tr',[/yardım|yardim/i]],
 ['Moralim bozuk','tr',[/anlat|küçük|kucuk/i]],
 ['Devam etme','tr',[/bırak|birak|başka|baska/i]],
 ['what is your name?','en',[/AYA/,/DentAYA/]],
 ['What’s your name?','en',[/AYA/]],
 ['Who are you?','en',[/AYA/,/DentAYA/]],
 ['Please introduce yourself','en',[/AYA/,/DentAYA/]],
 ['What is your purpose?','en',[/help/i,/work|tools/i]],
 ['Why are you here?','en',[/help/i]],
 ['What can you do?','en',[/calculate|convert/i,/CAD/]],
 ['How can you help me?','en',[/workflow|checklist/i]],
 ['What are your limitations?','en',[/cannot/i,/diagnos|medication/i]],
 ['Are you human?','en',[/not a human|not human/i,/Core/]],
 ['Can you work offline?','en',[/Core/,/model/i]],
 ['Do you remember me?','en',[/history/i,/new session|saving/i]],
 ['Do you send my data to the cloud?','en',[/no automatic cloud/i,/device|computer/i]],
 ['Hi!','en',[/AYA/]],
 ['How are you?','en',[/help/i]],
 ['I am tired','en',[/difficult|small|tell me/i]],
 ['Stop explaining','en',[/leave|another/i]],
 ['Merhaba AYA, adın ne ve amacın ne?','tr',[/AYA/,/yardım|yardim/i]],
 ['Adın ve amacın ne?','tr',[/AYA/,/yardım|yardim/i]],
 ['Sen kimsin ve neler yapabilirsin?','tr',[/AYA/,/hesap/i]],
 ['Teşekkürler, amacın ne?','tr',[/yardım|yardim/i]],
 ['Teşekkür ederim, başka neler yapabilirsin?','tr',[/hesap/i,/CAD/]],
 ['Lütfen adını söyler misin, amacın nedir?','tr',[/AYA/,/yardım|yardim/i]],
 ['Hi, who are you and what can you do?','en',[/AYA/,/calculate|convert/i]],
 ['What’s your name and what is your purpose?','en',[/AYA/,/help/i]],
 ['Thanks, what can you do?','en',[/calculate|convert/i]]
];
for(const [prompt,locale,patterns] of basics){
 check('direct basics',prompt,()=>replyMatches(answerDialogue(prompt,{locale}),patterns,prompt));
 check('public integration',prompt,()=>replyMatches(answerOwned(prompt,{locale}),patterns,prompt));
}
for(const prompt of ['Adın ne?','Amacın ne?','Neler yapabilirsin?','İnsan mısın?']){
 check('knowledge disabled',prompt,()=>replyMatches(answerOwned(prompt,{options:{useKnowledge:false}}),prompt.startsWith('Adın')?[/AYA/]:[/./],prompt));
}

const declarations=[
 ['Benim adım Ahmet','Ahmet','tr'],
 ['Adım Çağrı','Çağrı','tr'],
 ['İsmim İpek','İpek','tr'],
 ['Bana Deniz de','Deniz','tr'],
 ['My name is Alex','Alex','en'],
 ['Call me Robin','Robin','en']
];
for(const [prompt,name,locale] of declarations){
 check('declared names',prompt,()=>{
  const reply=answerDialogue(prompt,{locale});replyMatches(reply,[new RegExp(name)],prompt);
  assert.match(reply.output,locale==='tr'?/geçmiş|gecmis/i:/history/i);
  const history=[{role:'user',content:prompt},{role:'assistant',content:reply.output,engine:'core'}];
  replyMatches(answerOwned(locale==='tr'?'Benim adım ne?':'What is my name?',{locale,history}),[new RegExp(name)],'recall '+name);
 });
}
const correctionHistories=[
 ['tr',[{role:'user',content:'Adım Ahmet'},{role:'assistant',content:'Memnun oldum, Ahmet'},{role:'user',content:'Hayır, adım Ece'}],'Benim adım ne?','Ece','Ahmet'],
 ['en',[{role:'user',content:'My name is Alex'},{role:'user',content:'No, my name is Robin'}],'What is my name?','Robin','Alex']
];
for(const [locale,history,prompt,current,old] of correctionHistories){
 check('name corrections',prompt,()=>{
  const reply=answerOwned(prompt,{locale,history});replyMatches(reply,[new RegExp(current)],prompt);
  assert.doesNotMatch(reply.output,new RegExp(old),'A correction must replace the older name');
 });
}
for(const [prompt,locale] of [['Benim adım ne?','tr'],['Adım neydi?','tr'],['Adımı hatırlıyor musun?','tr'],['What is my name?','en'],['Do you know my name?','en']]){
 check('missing names',prompt,()=>{
  const reply=answerOwned(prompt,{locale});replyMatches(reply,[locale==='tr'?/söylemedin|soylemedin|kayıtlı.*yok|kayitli.*yok/i:/haven.t told|not.*name|no.*name/i],prompt);
  assert.doesNotMatch(reply.output,/Memnun oldum|Nice to meet/i,'A name question is not a name declaration');
 });
}
for(const history of [
 [{role:'assistant',content:'Benim adım Ece'}],
 [{role:'assistant',content:'My name is Ece'}],
 [{role:'user',content:'Arkadaşımın adı Ece'}],
 [{role:'user',content:'“Adım Ece” cümlesini çevir'}],
 [{role:'user',content:'Bir hikayede karakterin adı Ece olsun'}],
 [{role:'user',content:'Adım Ahmet'},{role:'assistant',content:'Hayır, adım Ece'}]
]){
 check('name evidence boundaries',JSON.stringify(history),()=>{
  const reply=answerOwned('Benim adım ne?',{history});
  assert.ok(reply?.output);assert.doesNotMatch(reply.output,/Ece/,'Only the user’s own explicit introduction is name evidence');
  if(history[0].content==='Adım Ahmet')assert.match(reply.output,/Ahmet/);
 });
}
for(const [prompt,locale,forbiddenName] of [
 ['Adım Ahmet değil','tr',/Ahmet değil/],
 ['Adım artık Ahmet değil','tr',/artık Ahmet değil/],
 ['My name is not Alex','en',/not Alex/]
]){
 check('negative name evidence',prompt,()=>{
  const declaration=answerDialogue(prompt,{locale});
  if(declaration)assert.doesNotMatch(declaration.output,/Memnun oldum|Nice to meet/i,'A negative statement does not introduce a person');
  const recalled=answerOwned(locale==='tr'?'Adım ne?':'What is my name?',{locale,history:[{role:'user',content:prompt}]});
  assert.ok(recalled?.output);assert.doesNotMatch(recalled.output,forbiddenName,'A negation must not be stored as a name');
 });
}
for(const [locale,first,negation,question,staleClaim] of [
 ['tr','Adım Ahmet','Adım Ahmet değil','Adım ne?',/adını Ahmet(?: değil)? olarak|adın Ahmet/i],
 ['en','My name is Alex','My name is not Alex','What is my name?',/your name is (?:not )?Alex|you are Alex/i]
]){
 check('name revocation',negation,()=>{
  const recalled=answerOwned(question,{locale,history:[{role:'user',content:first},{role:'user',content:negation}]});
  assert.ok(recalled?.output);assert.doesNotMatch(recalled.output,staleClaim,'A revoked name must not be recovered from an older turn');
 });
}
for(const [prompt,locale] of [['Adımı unut','tr'],['İsmimi unut','tr'],['Bana bu isimle hitap etme','tr'],['Forget my name','en']]){
 check('explicit name clearing',prompt,()=>{
  const introduction=locale==='tr'?'Adım Ahmet':'My name is Robin';
  const history=[{role:'user',content:introduction},{role:'user',content:prompt}];
  const original=structuredClone(history);
  replyMatches(answerOwned(prompt,{locale,history}),[locale==='tr'?/kullanmayacağ|kullanmayac|unut/i:/won.t use|forget/i],prompt);
  const recalled=answerOwned(locale==='tr'?'Adım ne?':'What is my name?',{locale,history});
  assert.ok(recalled?.output);assert.doesNotMatch(recalled.output,/Ahmet|Robin/,'Do not revive a name after an explicit request to stop using it');
  assert.deepEqual(history,original,'Stopping use of a name must not silently delete conversation messages');
 });
}
for(const [locale,history,question] of [
 ['tr',[{role:'user',content:'Adım Ahmet'},{role:'user',content:'Adımı unut'},{role:'user',content:'Adım Ece'}],'Adım ne?'],
 ['en',[{role:'user',content:'My name is Alex'},{role:'user',content:'Forget my name'},{role:'user',content:'My name is Ece'}],'What is my name?']
]){
 check('name after clearing',locale,()=>{
  const recalled=answerOwned(question,{locale,history});replyMatches(recalled,[/Ece/],question);
  assert.doesNotMatch(recalled.output,/Ahmet|Alex/);
 });
}
for(const task of ['Adımı unut cümlesini İngilizceye çevir','Translate forget my name into Turkish']){
 check('quoted clearing task',task,()=>{
  assert.equal(answerDialogue(task),null,'A quoted translation request is not a request to clear a name');
  const history=[{role:'user',content:'Adım Ahmet'},{role:'user',content:task}];
  assert.match(answerOwned('Adım ne?',{history}).output,/Ahmet/);
 });
}

const identityHistory=[{role:'user',content:'Adın ne?'},{role:'assistant',content:'Adım AYA. DentAYA’nın çalışma asistanıyım.',engine:'core'}];
for(const prompt of ['devam','Peki devam et','biraz daha aç','Anlamadım','daha detaylı anlat']){
 check('identity followups',prompt,()=>replyMatches(answerOwned(prompt,{history:identityHistory}),[/AYA|iş akış|is akis|CAD/i],prompt));
}
for(const prompt of ['örnek ver','bir örnek ver','mesela']){
 check('identity followups',prompt,()=>replyMatches(answerOwned(prompt,{history:identityHistory}),[/12 cm|Teslim notu|CAD/],prompt));
}
for(const prompt of ['daha kısa','özetle']){
 check('identity followups',prompt,()=>replyMatches(answerOwned(prompt,{history:identityHistory}),[/AYA/,/DentAYA/],prompt));
}
check('identity followups','purpose immediately after name',()=>replyMatches(answerOwned('Peki amacın?',{history:identityHistory}),[/yardım|yardim/i],'Peki amacın?'));
check('identity followups','acknowledgement preserves identity',()=>replyMatches(answerOwned('devam',{history:[...identityHistory,{role:'user',content:'teşekkürler'},{role:'assistant',content:'Rica ederim.',engine:'core'}]}),[/CAD|iş akış|is akis/i],'identity after thanks'));
check('identity followups','new substantive request clears identity',()=>assert.equal(answerDialogue('devam',{history:[...identityHistory,{role:'user',content:'Bir davet metni yaz'},{role:'assistant',content:'Davet taslağı',engine:'model'}]}),null));
for(const [prompt,locale,patterns] of [
 ['Adın ne ve neler yapabilirsin?','tr',[/AYA/,/hesap|dönüş|donus|CAD/i]],
 ['Mesajlarım buluta gidiyor mu?','tr',[/cihaz|yerel|bulut/i]],
 ['Beni hatırlıyor musun?','tr',[/geçmiş|gecmis|bellek|oturum/i]],
 ['Model olmadan çalışabilir misin?','tr',[/Core|model/i]],
 ['Who are you and what can you do?','en',[/AYA/,/calculate|convert|CAD/i]],
 ['Are my messages saved?','en',[/device|local|cloud/i]],
 ['Do you remember me?','en',[/history|memory|session/i]],
 ['Can you work offline?','en',[/Core|model/i]]
]){
 check('shorter means shorter',prompt,()=>{
  const first=answerOwned(prompt,{locale});assert.ok(first?.output.length>150);
  const history=[{role:'user',content:prompt},{role:'assistant',content:first.output,engine:'core'}];
  const shorter=answerOwned(locale==='tr'?'daha kısa':'shorter',{locale,history});
  replyMatches(shorter,patterns,prompt+' then shorter');
  assert.ok(shorter.output.length<first.output.length,'The shortened response must actually be shorter');
 });
}
for(const [prompt,locale,patterns] of [
 ['Mesajlarım buluta gidiyor mu?','tr',[/cihaz|yerel|bulut/i]],
 ['Beni hatırlıyor musun?','tr',[/hedef|karar|oturum|geçmiş|gecmis|adını/i]],
 ['Do you send my data to the cloud?','en',[/device|local|cloud/i]],
 ['Do you remember me?','en',[/name|goal|decision|session|history/i]]
]){
 check('examples retain topic',prompt,()=>{
  const first=answerOwned(prompt,{locale});assert.ok(first?.output);
  const history=[{role:'user',content:prompt},{role:'assistant',content:first.output,engine:'core'}];
  const example=answerOwned(locale==='tr'?'örnek ver':'give an example',{locale,history});
  replyMatches(example,patterns,prompt+' then example');
  assert.doesNotMatch(example.output,/Teslim notu taslağı.*Sıradaki adım|Handoff draft.*next step/i,'A topical example must not fall back to the generic task list');
 });
}
for(const prompt of ['devam','örnek ver','daha kısa']){
 check('missing dialogue topic',prompt,()=>assert.equal(answerDialogue(prompt),null));
}

const quotedOrMixedTasks=[
 'Adın ne adlı bir hikaye yaz',
 'Sen kimsin adlı bir şiir yaz',
 'Arkadaşım bana adın ne diye sordu',
 'Amacın ne sorusunu İngilizceye çevir',
 'Kendini tanıt cümlesini çevir',
 'Merhaba, 12 cm kaç mm?',
 'Selam, STL nedir?',
 'Teşekkürler, implant nedir?',
 'Adın ne ve 12 cm kaç mm?',
 'Amacın ne, ayrıca STL nedir?',
 'Who are you is the title of my poem',
 'Translate what is your name into Turkish',
 'Hello, write an invitation for my colleague',
 'What is your purpose and what is STL?'
];
for(const prompt of quotedOrMixedTasks){
 check('substantive clause boundaries',prompt,()=>{
  assert.equal(answerDialogue(prompt),null,'Do not consume an unrelated task because one clause mentions identity');
  const reply=answerOwned(prompt);
  if(reply)assert.doesNotMatch(reply.output,/^Adım AYA|^My name is AYA/,'The public path must not restore the old identity prefix shortcut');
 });
}

const stl=answerCatalog('STL nedir');
const catalogHistory=[{role:'user',content:'STL nedir'},{role:'assistant',content:stl.output,engine:'core',references:stl.references}];
for(const prompt of ['Peki nasıl kontrol ederim?','neye dikkat','hangi hata?','devam','daha kısa']){
 check('catalog followups',prompt,()=>{
  const reply=answerCatalog(prompt,{history:catalogHistory});
  assert.ok(reply?.references.some(r=>r.id.startsWith('aya-qa-scan-stl-')),prompt+' should retain the STL topic');
 });
}
for(const prompt of ['teşekkürler','tamam','sağ ol kanka','Thanks']){
 check('acknowledgements preserve catalog',prompt,()=>{
  assert.equal(isAcknowledgement(prompt),true);
  const reply=answerCatalog('devam',{history:[...catalogHistory,{role:'user',content:prompt},{role:'assistant',content:'Rica ederim',engine:'core'}]});
  assert.ok(reply?.references.some(r=>r.id.startsWith('aya-qa-scan-stl-')));
 });
}
for(const prompt of ['nasıl yemek yapabilirim','Nasıl teşekkür ederim?','kontrolü sana bırakıyorum','anlat bana kendi hayatını','Devam etme','devam etmek istemiyorum','bunu anlatma','kısaca amacın ne','tekrar merhaba','Peki nasılsın?']){
 check('catalog false followups',prompt,()=>assert.equal(answerCatalog(prompt,{history:catalogHistory}),null,'A new request must not receive a stale STL answer'));
}
for(const prompt of ['adın ne','amacın ne','neler yapabilirsin','iyi değilim','Benim adım Ahmet','Yeni teslim planı yaz','12 cm kaç mm?','devam etme']){
 check('catalog topic boundaries',prompt,()=>{
  assert.equal(isAcknowledgement(prompt),false);
  const reply=answerCatalog('devam',{history:[...catalogHistory,{role:'user',content:prompt},{role:'assistant',content:'Yeni konu yanıtı',engine:'core'}]});
  assert.equal(reply,null,'A substantive intervening user turn must clear the old catalog topic');
 });
}
check('catalog topic boundaries','fresh dental topic after identity',()=>{
 const reply=answerCatalog('Dentin nedir',{history:identityHistory});
 assert.equal(reply?.references[0]?.id,'aya-qa-dentin-definition');
});
check('deterministic work preservation','conversion still works',()=>assert.match(answerOwned('12 cm kaç mm?').output,/120 mm/));
check('deterministic work preservation','emergency still precedes conversation',()=>assert.match(answerOwned('Dişim şişti nefes alamıyorum').output,/acil/i));
for(const prompt of ['tamam','hayır','okay','no']){
 check('acknowledgement meaning',prompt,()=>assert.doesNotMatch(answerDialogue(prompt,{locale:['okay','no'].includes(prompt)?'en':'tr'}).output,/Rica ederim|You’re welcome/));
}

if(failures.length){
 console.error(JSON.stringify({pass:false,cases,groups,failures},null,2));
 process.exitCode=1;
}else{
 console.log(JSON.stringify({pass:true,cases,groups,nativeInference:false,coverage:'TR/EN direct and polite dialogue, compounds, public offline routing, session name evidence and corrections, short followups, quoted task rejection, catalog topic boundaries and deterministic tool preservation'},null,2));
}
