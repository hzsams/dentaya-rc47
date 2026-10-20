'use strict';
const {normalizeMemory}=require('./agent.cjs');

// These controls change session context only. Natural conversation, CAD requests
// and text that merely quotes a control remain the model's responsibility.
const LIMITS=Object.freeze({goal:500,decision:240,question:240,decisions:5,openQuestions:3,commands:16,prompt:8000});
const fold=s=>String(s??'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
// Labels accept convenient Turkish/ASCII spellings. Stored evidence needs a
// separate key: punctuation, operators, signs and non-Latin text carry meaning.
const memoryKey=s=>String(s??'').normalize('NFC').toLowerCase().replace(/\s+/gu,' ').trim().normalize('NFC');
const reply=output=>({ok:true,engine:'core',output,references:[]});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const quoted=s=>/^["'“”‘’«»`]/u.test(s)||/^[-*>#]/u.test(s);
const polite=s=>s.replace(/^lutfen /,'').replace(/ lutfen$/,'').replace(/^please /,'').replace(/ please$/,'');

function mixedValue(value,kind){
 const q=fold(value);
 // A second request on the same line is not a licence to save only its first
 // part. Require a separate, explicit control on each line instead.
 if(/[.;!?,]\s*(?:hedef(?:imiz|i)?|karar|açık soru|goal|decision|open question)\s*:/iu.test(value))return true;
 if(/[.;!?,]\s*(?:şimdi|simdi|sonra|ardından|ardindan|ayrıca|ayrica|ve|bunu|peki|now|also|then|after that|and)\b/iu.test(value))return true;
 if(kind!=='question'&&/\?/.test(value)&&/(?:^| )(?:nedir|nasil|kac|hangi|what|how|which|why)(?: |$)/.test(q))return true;
 return false;
}

function parseLine(line){
 if(quoted(line)||/[`]/.test(line))return null;
 const colon=line.indexOf(':');
 if(colon>=0){
  const rawLabel=line.slice(0,colon).trim();
  if(!/^[\p{L}\p{N}]/u.test(rawLabel)||/["'“”‘’«»]/u.test(rawLabel.replace(/(?<=\d)['’](?=[a-zıi])/giu,'')))return null;
  const label=polite(fold(rawLabel)),value=line.slice(colon+1).trim();let command;
  if(/^(?:hedefimiz|hedefim|hedef|hedefi degistir|hedefi duzelt|hedefimiz su olsun|yeni hedef|goal|set goal|change goal|replace goal)$/.test(label))command={kind:'goal',value};
  else if(/^(?:karar|karar ekle|yeni karar|decision|add decision)$/.test(label))command={kind:'decision',value};
  else if(/^(?:acik soru|acik soru ekle|yeni acik soru|open question|add open question)$/.test(label))command={kind:'question',value};
  else {
   let match=label.match(/^(?:karar|decision) (\d+)(?: (?:i|yi))?(?: (?:degistir|duzelt))?$/)||label.match(/^(\d+) karari (?:degistir|duzelt)$/)||label.match(/^(?:change|replace|correct) decision (\d+)$/);
   if(match)command={kind:'replaceDecision',index:Number(match[1]),value};
   match=label.match(/^(?:acik soru|open question) (\d+)(?: (?:i|yi))?(?: (?:degistir|duzelt))?$/)||label.match(/^(\d+) acik soruyu (?:degistir|duzelt)$/)||label.match(/^(?:change|replace|correct) open question (\d+)$/);
   if(match)command={kind:'replaceQuestion',index:Number(match[1]),value};
  }
  if(!command||mixedValue(value,command.kind==='question'||command.kind==='replaceQuestion'?'question':command.kind))return null;
  return command;
 }
 // A question about clearing memory is not itself a clear command.
 if(line.includes('?'))return null;
 const q=polite(fold(line));let match;
 if(/^(?:(?:tum |butun )?(?:calisma|oturum) bellegini (?:sifirla|temizle|sil)|(?:clear|reset|erase) (?:(?:all|the) )?(?:working|session) memory)$/.test(q))return {kind:'clear'};
 if(/^(?:hedefi (?:sil|temizle|sifirla)|(?:clear|remove|delete) (?:(?:the|our|my) )?goal)$/.test(q))return {kind:'clearGoal'};
 if(/^(?:tum kararlari sil|butun kararlari sil|(?:clear|remove|delete) all decisions)$/.test(q))return {kind:'clearDecisions'};
 if(/^(?:tum acik sorulari (?:sil|kapat)|butun acik sorulari (?:sil|kapat)|(?:clear|remove|delete|close) all open questions)$/.test(q))return {kind:'clearQuestions'};
 match=q.match(/^(?:karar|karari) (\d+)(?: (?:i|yi))? (?:sil|kaldir)$/)||q.match(/^(\d+) karari (?:sil|kaldir)$/)||q.match(/^(?:remove|delete) decision (\d+)$/);
 if(match)return {kind:'removeDecision',index:Number(match[1])};
 match=q.match(/^(?:acik soru|acik soruyu) (\d+)(?: (?:i|yi))? (?:sil|kaldir|kapat|coz|cozuldu)$/)||q.match(/^(\d+) acik soruyu (?:sil|kaldir|kapat|coz)$/)||q.match(/^(?:remove|delete|close|resolve) open question (\d+)$/);
 if(match)return {kind:'removeQuestion',index:Number(match[1])};
 const goal=/^hedefimiz .+ olsun$/.test(q)?line.match(/^\S+\s+(.+?)\s+\S+[.!]?$/u):null;
 if(goal&&!mixedValue(goal[1],'goal')&&!/\b(?:eğer|eger|dersem|desem|if)\b/iu.test(goal[1]))return {kind:'goal',value:goal[1].trim()};
 return null;
}

function parseCommands(prompt){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>LIMITS.prompt)return null;
 const lines=prompt.trim().split(/\r\n|[\n\r\u2028\u2029]/).map(line=>line.trim()).filter(Boolean);
 const commands=[];
 for(const line of lines){const command=parseLine(line);if(!command)return null;commands.push(command);}
 return commands.length?commands:null;
}

function isMemoryCommand(prompt){return parseCommands(prompt)!==null;}

function isRecall(prompt){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>LIMITS.prompt||/[\r\n\u2028\u2029]/.test(prompt)||quoted(prompt.trim()))return false;
 const q=polite(fold(prompt));
 return [
  /^(?:(?:onceki|son|mevcut|simdiki|su anki|kayitli|bu oturumdaki) )?(?:hedefimiz|hedefim|hedef) (?:ne|neydi|nedir|ne oldu|ne olarak kayitli)$/,
  /^(?:bana )?(?:hedefimizi|hedefimi|hedefi) (?:hatirlat|hatirliyor musun|goster|soyle|tekrar et)$/,
  /^(?:(?:onceki|son|aldigimiz|kayitli|bu oturumdaki) )?(?:kararimiz|kararim|kararlarimiz|kararlarim|kararlar|karar) (?:ne|neydi|nedir|neler|nelerdi|neler oldu)$/,
  /^(?:neye karar vermistik|hangi kararlari aldik|hangi karari almistik|hangi kararlari almistik|hangi kararlari vermistik|hangi kararlar kayitli)$/,
  /^(?:bana )?(?:aldigimiz |kayitli )?kararlari (?:hatirlat|goster|listele|soyle)$/,
  /^(?:acik sorularimiz|acik sorularim|acik sorular|acik sorumuz|acik soru) (?:ne|neydi|neler|nelerdi|nedir|hangileri)$/,
  /^(?:hangi acik sorular var|hangi sorular acik|yanitlanmamis sorular neler)$/,
  /^(?:bana )?(?:acik sorulari|acik sorularimizi) (?:hatirlat|goster|listele|soyle)$/,
  /^(?:(?:bu )?oturum(?:daki|un)? |calisma )?belle(?:k|gi|gini) (?:goster|ozetle|ozeti)$/,
  /^(?:(?:bu )?oturum|calisma) belleginde ne var$/,
  /^(?:bu oturumdan ne hatirliyorsun|bu oturumda ne hatirliyorsun|hedef ve kararlarimizi hatirlat|hedef karar ve acik sorulari goster)$/,
  /^what (?:is|was) (?:our|my|the|our current|the current|our previous) goal$/,
  /^what goal did we set$/,
  /^(?:show|recall|repeat|tell me|remind me of) (?:our|my|the|current|our current) goal$/,
  /^(?:what (?:are|were) (?:our|my|the|our previous) decisions|what did we decide|which decisions did we make)$/,
  /^(?:show|list|recall|repeat|remind me of) (?:(?:our|my|the) )?decisions$/,
  /^(?:what (?:are|were) (?:(?:our|my|the) )?open questions|which questions are still open)$/,
  /^(?:show|list|recall|repeat|remind me of) (?:(?:our|my|the) )?open questions$/,
  /^(?:show|summarize|recap) (?:(?:our|my|the) )?(?:working|session) memory$/,
  /^what (?:is|s) in (?:(?:our|my|the) )?(?:working|session) memory$/,
  /^what do you remember (?:from this session|about our work)$/
 ].some(pattern=>pattern.test(q));
}

function summary(memory,tr){
 if(!memory.goal&&!memory.decisions.length&&!memory.openQuestions.length)return tr?'Bu oturumda kayıtlı hedef veya karar yok; açık soru da yok.':'No goal, decisions or open questions are stored for this session.';
 const list=items=>items.map((item,index)=>(index+1)+'. '+item).join('\n');
 return tr?'Bu oturumun çalışma belleği:\nHedef: '+(memory.goal||'Henüz belirlenmedi.')+'\nKararlar:\n'+(list(memory.decisions)||'Henüz karar yok.')+'\nAçık sorular:\n'+(list(memory.openQuestions)||'Açık soru yok.'):
  'Working memory for this session:\nGoal: '+(memory.goal||'Not set yet.')+'\nDecisions:\n'+(list(memory.decisions)||'No decisions yet.')+'\nOpen questions:\n'+(list(memory.openQuestions)||'No open questions.');
}

function applyCommands(commands,memory,tr){
 const next={goal:memory.goal,decisions:[...memory.decisions],openQuestions:[...memory.openQuestions]};
 const fail=message=>({error:tr?'Çalışma belleğini değiştirmedim. '+message:'Working memory was not changed. '+message});
 if(commands.length>LIMITS.commands)return fail(tr?'Tek mesajda en fazla '+LIMITS.commands+' bellek komutu kullan.':'Use at most '+LIMITS.commands+' memory controls in one message.');
 for(const command of commands){
  const {kind,value,index}=command;
  if(value!==undefined){
   const max=kind==='goal'?LIMITS.goal:LIMITS.decision;
   if(!value)return fail(tr?'Bellek alanı boş olamaz. Temizlemek için açık bir silme komutu kullan.':'A memory value cannot be empty. Use an explicit clear or remove control.');
   if(value.length>max)return fail(tr?'Hedef en fazla 500, her karar ve açık soru en fazla 240 karakter olabilir. Metni kısaltıp yeniden gönder.':'The goal can contain up to 500 characters; each decision or open question can contain up to 240. Shorten the text and try again.');
  }
  if(kind==='clear'){next.goal='';next.decisions=[];next.openQuestions=[];continue;}
  if(kind==='clearGoal'){next.goal='';continue;}
  if(kind==='clearDecisions'){next.decisions=[];continue;}
  if(kind==='clearQuestions'){next.openQuestions=[];continue;}
  if(kind==='goal'){next.goal=value;continue;}
  const question=kind==='question'||kind==='replaceQuestion'||kind==='removeQuestion';
  const items=question?next.openQuestions:next.decisions;
  if(kind==='decision'||kind==='question'){
   if(!items.some(item=>memoryKey(item)===memoryKey(value)))items.push(value);
   continue;
  }
  if(!Number.isSafeInteger(index)||index<1||index>items.length)return fail(tr?(question?'Açık soru':'Karar')+' numarası bulunamadı. Kayıtlı listeyi isteyip 1’den başlayan geçerli numarayı kullan.':(question?'Open question':'Decision')+' number was not found. Ask for the stored list and use a valid number starting at 1.');
  if(kind==='removeDecision'||kind==='removeQuestion'){items.splice(index-1,1);continue;}
  if(items.some((item,i)=>i!==index-1&&memoryKey(item)===memoryKey(value)))return fail(tr?'Bu içerik listede zaten var. Diğer kaydı değiştirmek yerine numarasıyla açıkça sil.':'That content is already in the list. Explicitly remove the other numbered entry instead of replacing it with a duplicate.');
  items[index-1]=value;
 }
 if(next.decisions.length>LIMITS.decisions||next.openQuestions.length>LIMITS.openQuestions)return fail(tr?'En fazla 5 karar ve 3 açık soru tutulabilir. Mevcut bir kaydı numarasıyla sil veya açık soruyu kapat; sonra yeniden ekle. Hiçbir kayıt silinmedi.':'Working memory holds up to 5 decisions and 3 open questions. Remove a numbered entry or close an open question before adding another. No entries were removed.');
 return {next};
}

function answerMemory(prompt,{workingMemory,locale='tr'}={}){
 const commands=parseCommands(prompt),tr=locale==='tr';
 if(!commands&&!isRecall(prompt))return null;
 const memory=normalizeMemory(workingMemory);
 if(!commands)return reply(summary(memory,tr));
 const result=applyCommands(commands,memory,tr);
 if(result.error)return reply(result.error);
 const changed=!same(memory,result.next)||commands.some(command=>command.kind==='clear');
 const output=(changed?(tr?'Bu oturumdaki çalışma belleğini güncelledim.':'Updated working memory for this session.'):(tr?'Bu içerik çalışma belleğinde zaten aynı; değişiklik yapmadım.':'Working memory already matches; no changes were made.'))+'\n\n'+summary(result.next,tr);
 return changed?{...reply(output),workingMemory:normalizeMemory(result.next)}:reply(output);
}

module.exports={answerMemory,isMemoryCommand};
