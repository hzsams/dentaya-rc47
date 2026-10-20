'use strict';
// Bounded composition of existing read-only tools. No generated code or CAD
// operation is executed here; every clause has to match a supported task.
const {convertLength,percentage,toolAnswer}=require('./work-tools.cjs');
const {normalizeMemory}=require('./agent.cjs');
const {answerDialogue,isNameControl,followupMode,isAcknowledgement}=require('./dialogue.cjs');
const {answerCatalog,isCatalogQuestion}=require('./conversation.cjs');
const fold=s=>String(s??'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const reply=(output,references=[])=>({ok:true,engine:'core',output,references});
function cleanTask(raw){return raw.trim().replace(/^\d+[.)]\s+/,'').replace(/^(?:(?:önce|once|sonra|ardından|ardindan|ayrıca|ayrica|first|then|please|lütfen|lutfen)\s+)+/iu,'').replace(/^[,\s]+|[,\s]+$/g,'');}
function taskKind(raw){
 const q=fold(raw).replace(/^(?:hedefimize gore|hedefe gore|based on our goal) /,'');
 if(/^(?:calisma kontrolu|neler eksik|eksikleri goster|workspace check|what is missing)$/.test(q))return 'checklist';
 if(/^(?:(?:bir|bana|calisma) )?(?:kontrol listesi|checklist|workspace checklist)(?: (?:hazirla|olustur|yaz|ver|prepare|create))?$/.test(q)||/^(?:prepare|create|write) (?:a )?(?:workspace )?checklist$/.test(q))return 'checklist';
 if(/^(?:(?:bir|bana) )?(?:teslim notu|devir notu|handoff|handover)(?: (?:taslagi|mesaji|draft|note))*?(?: (?:hazirla|olustur|yaz|ver))?$/.test(q)||/^(?:prepare|create|write) (?:a )?(?:handoff|handover)(?: note| draft)*$/.test(q))return 'handoff';
 return '';
}
function memoryRows(memory,tr,short){
 const rows=[];
 if(memory.goal)rows.push((tr?'Çalışma hedefi: ':'Work goal: ')+memory.goal);
 if(memory.decisions.length)rows.push((tr?'Kararlar: ':'Decisions: ')+(short?memory.decisions.join('; '):'\n'+memory.decisions.map((x,i)=>`${i+1}. ${x}`).join('\n')));
 if(memory.openQuestions.length)rows.push((tr?'Açık sorular: ':'Open questions: ')+(short?memory.openQuestions.join('; '):'\n'+memory.openQuestions.map((x,i)=>`${i+1}. ${x}`).join('\n')));
 return rows;
}
function handoff(context,short){
 const tr=context.locale==='tr',memory=normalizeMemory(context.workingMemory),cad=context.cadContext;
 const rows=memoryRows(memory,tr,short);
 if(short)return reply([(tr?'Teslim taslağı':'Handoff draft'),...rows,cad?.unit?(tr?'Ünite: ':'Unit: ')+cad.unit:'',tr?'Eksik vaka, materyal, gerçek kontrol sonuçları ve teslim zamanını doğrula.':'Confirm missing case details, material, actual checks and delivery time.'].filter(Boolean).join('\n'));
 return reply([(tr?'Teslim notu taslağı — gönderilmedi':'Handoff draft — not sent'),...rows,
  (tr?'Vaka: ':'Case: ')+'[…]'
  ,(tr?'Üniteler: ':'Units: ')+(cad?.unit||'[…]')
  ,(tr?'Restorasyon / materyal: ':'Restoration / material: ')+(cad?.restoration||'[…]')
  ,tr?'Yapılan kontroller: […] — gerçek sonuçları ekle':'Completed checks: […] — add actual results'
  ,tr?'Açık kalan işler: […]':'Open items: […]'
  ,tr?'İstenen teslim: […] — tarih ve saati doğrula':'Requested delivery: […] — confirm date and time'
  ,tr?'Ekler / sürüm: […]':'Attachments / version: […]'
  ,tr?'Hedef ve kararlar sohbet notudur; tamamlanmış işlem veya onay sayılmaz.':'Goals and decisions are conversation notes, not evidence of completed work or approval.'
 ].join('\n'));
}
function atomicTask(raw,context,short){
 const kind=taskKind(raw),tr=context.locale==='tr';
 if(kind==='handoff')return handoff(context,short);
 if(kind==='checklist'){
  const output=toolAnswer('checklist',context,context.t);
  const memory=normalizeMemory(context.workingMemory),notes=memoryRows(memory,tr,short);
  return reply([...notes,output].join('\n\n'));
 }
 const conversion=convertLength(raw);if(conversion)return reply(`${conversion.value} ${conversion.from} = ${conversion.result} ${conversion.to}`);
 const percent=percentage(raw);if(percent)return reply(`${percent.amount} × ${percent.percent} / 100 = ${percent.result}`);
 const expression=raw.replace(/^(?:hesapla|calculate)\s*:?\s*/iu,'').replace(/[?!.]+$/,'').trim();
 // Defer the import: assistant.cjs also exposes this composition to its callers.
 const arithmetic=require('./assistant.cjs').calculate(expression);
 if(arithmetic)return reply(arithmetic.expression+' = '+Number(arithmetic.result.toPrecision(12)).toString());
 if(expression.length<=180&&/^[\d\s.,+*/()×÷-]+$/.test(expression)&&/[+*/×÷-]/.test(expression))return reply(tr?'Bu hesaplama tamamlanamadı. Parantezleri, sıfıra bölmeyi ve sayı aralığını kontrol et.':'This calculation could not be completed. Check parentheses, division by zero and the numeric range.');
 return null;
}
function previousTask(history){
 const messages=Array.isArray(history)?history.slice(-48):[];
 for(let i=messages.length-1;i>=0;i--){const m=messages[i];
  if(m?.role==='assistant'&&(m.engine==='model'||m.engine==='guide'))return '';
  if(m?.role!=='user'||typeof m.content!=='string')continue;
  if(isAcknowledgement(m.content)||followupMode(m.content))continue;
  return m.content;
 }return '';
}
function answerTasks(prompt,{cadContext=null,workingMemory=null,locale='tr',history=[],options={},t=s=>s}={},allowFollowup=true,short=false){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000)return null;
 const context={cadContext,workingMemory,locale,history,options,t};
 if(allowFollowup&&followupMode(prompt)){
  const prior=previousTask(history);if(!prior)return null;
  return answerTasks(prior,context,false,followupMode(prompt)==='short');
 }
 const direct=atomicTask(cleanTask(prompt),context,short);if(direct)return direct;
 const clauses=prompt.split(/\r?\n|;|\?+|\s+(?:ve ardından|ve ardindan|ve sonra|ardından|ardindan|sonra|ayrıca|ayrica|and then|then|ve|and)\s+/iu).map(cleanTask).filter(Boolean);
 if(clauses.length<2)return null;
 if(clauses.length>6)return reply(locale==='tr'?'Bir mesajda en fazla 6 desteklenen işi birlikte ele alabilirim. İsteği iki mesaja böler misin?':'I can combine up to 6 supported tasks per message. Please split this request into two messages.');
 const results=clauses.map(clause=>{
  const task=atomicTask(clause,context,short);if(task)return task;
  // A name assertion or revocation embedded in a compound is not a standalone
  // memory update. Never claim to have stored or forgotten it here.
  if(isNameControl(clause))return null;
  const chat=answerDialogue(clause,context);if(chat)return chat;
  const definition=/\b(?:nedir|nelerdir|ne demek|what is|what are|define)\b/.test(fold(clause));
  const catalogue=options.useKnowledge!==false&&(isCatalogQuestion(clause)||definition)?answerCatalog(clause,{locale,options}):null;
  return catalogue?.references.length?catalogue:null;
 });
 if(results.some(x=>!x))return null;
 const references=[...new Map(results.flatMap(x=>x.references).map(r=>[r.id,r])).values()].slice(0,8);
 return reply(results.map((result,i)=>(i+1)+'. '+clauses[i].slice(0,160)+'\n'+result.output).join('\n\n'),references);
}
module.exports={answerTasks};
