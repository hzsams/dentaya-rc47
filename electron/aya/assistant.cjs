/* Browser/Electron shared, deterministic AYA-owned context and evidence layer. */
'use strict';
const CORE_VERSION='0.12.0';
const workTools=require('./work-tools.cjs');
const conversation=require('./conversation.cjs');
const {answerDialogue}=require('./dialogue.cjs');
const {answerTasks}=require('./task-dialogue.cjs');
function localSetupGuide(t=s=>s){return ['AYA Core '+CORE_VERSION+' · llama.cpp · Qwen3 1.7B · GGUF',t('Yerel motoru kur'),t('Yerel sohbet API anahtarı veya DentAYA oturumu istemez. Mesajlar yalnızca bu bilgisayardaki modele iletilir; buluta otomatik geçilmez.'),t('İlk indirme internet ve boş disk alanı ister. Sonrasında yerel sohbet çevrimdışı çalışabilir. Hız bilgisayarın belleği ve işlemcisine bağlıdır; daha küçük kurulu modelleri de seçebilirsin.'),t('Yerel model ekle'),t('AYA bilgi defteri'),t('Bu bilgiler bu cihazda saklanır.')].join('\n');}
const fold=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
const segmenter=new Intl.Segmenter(undefined,{granularity:'word'});
const stop=new Set('ve veya bir bu icin ile nasil ne yap bana kanka ben the and of to is in how what'.split(' '));
const words=s=>[...segmenter.segment(fold(s).slice(0,24000))].filter(w=>w.isWordLike&&w.segment.length>1&&!stop.has(w.segment)).map(w=>w.segment);
function normalizeKnowledge(input){return (Array.isArray(input)?input:[]).slice(0,64).filter(d=>d&&typeof d.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(d.id)&&typeof d.title==='string'&&typeof d.content==='string').map(d=>({id:d.id,title:d.title.trim().slice(0,120),content:d.content.trim().slice(0,12000),kind:d.kind==='document'?'document':'memory'})).filter(d=>d.title&&d.content);}
function retrieveKnowledge(query,input,limit=4){
 const docs=normalizeKnowledge(input),terms=[...new Set(words(query))];if(!terms.length)return [];
 const index=docs.map(doc=>({doc,tokens:words(doc.title+' '+doc.content)})),average=Math.max(1,index.reduce((sum,d)=>sum+d.tokens.length,0)/Math.max(1,index.length));
 return index.map(({doc,tokens})=>{let score=0;for(const term of terms){const count=tokens.filter(w=>w===term||term.length>3&&w.startsWith(term)||w.length>3&&term.startsWith(w)).length;if(count){const df=index.filter(d=>d.tokens.includes(term)).length;score+=Math.log(1+(index.length-df+.5)/(df+.5))*count/(count+1.2*(.25+.75*tokens.length/average));}}return {doc,score};}).filter(d=>d.score>.2).sort((a,b)=>b.score-a.score).filter((d,_i,all)=>d.score>=all[0].score*.5).slice(0,Math.min(8,Math.max(1,limit))).map(d=>d.doc);
}
function normalizeCad(v){
 if(!v||typeof v!=='object')return null;
 const booleans=['setupComplete','sourceReady','modelReady','placed','visible','unsaved','saveFailed','isSaving','upperReady','lowerReady'];
 return {unit:/^[1-4][1-8]$/.test(v.unit??'')?v.unit:'',restoration:typeof v.restoration==='string'?v.restoration.slice(0,120):'',stage:['scan','margin','design','contacts','thickness','review'].includes(v.stage)?v.stage:'',openingMm:typeof v.openingMm==='number'&&Number.isFinite(v.openingMm)?Math.max(0,Math.min(12,v.openingMm)):0,task:['files','margin','fit','anatomy','freeform','contacts','inspect','review'].includes(v.task)?v.task:'',marginPoints:Number.isInteger(v.marginPoints)&&v.marginPoints>=0&&v.marginPoints<=20000?v.marginPoints:0,...Object.fromEntries(booleans.map(k=>[k,v[k]===true]))};
}
function ownedContext(input){
 const query=String(input?.prompt||'').slice(0,8000),knowledge=input?.useMemory===false?[]:retrieveKnowledge(query,input?.knowledge);
 return {version:CORE_VERSION,cad:normalizeCad(input?.cadContext),personalKnowledge:knowledge.map(d=>({id:d.id,title:d.title,content:knowledgeExcerpt(d,query),kind:d.kind})),references:knowledge.map(d=>({id:'knowledge-'+d.id,title:d.title,href:'/ai#knowledge'}))};
}
function knowledgeExcerpt(doc,query){const terms=words(query),sections=doc.content.match(/[^\n.!?]+[\n.!?]*/g)||[doc.content];let offset=0,best=0,start=0;for(const section of sections){const score=words(section).filter(w=>terms.some(t=>w===t||t.length>3&&w.startsWith(t))).length;if(score>best){best=score;start=Math.max(0,offset-180);}offset+=section.length;}return doc.content.slice(start,start+2200);}
function calculate(expression){
 const clean=expression.replace(/×/g,'*').replace(/÷/g,'/').replace(/,/g,'.').replace(/\s/g,'');
 if(clean.length>180||!/^[\d.+*/()-]+$/.test(clean)||!/[+*/-]/.test(clean))return null;
 let pos=0,operations=0;
 const number=()=>{if(++operations>80)throw Error('LIMIT');if(clean[pos]==='+'){pos++;return number();}if(clean[pos]==='-'){pos++;return -number();}if(clean[pos]==='('){pos++;const v=sum();if(clean[pos++]!==')')throw Error('BRACKET');return v;}const m=clean.slice(pos).match(/^(?:\d+\.?\d*|\.\d+)/);if(!m)throw Error('NUMBER');pos+=m[0].length;return Number(m[0]);};
 const product=()=>{let v=number();while(clean[pos]==='*'||clean[pos]==='/'){const op=clean[pos++],n=number();v=op==='*'?v*n:v/n;}return v;};
 const sum=()=>{let v=product();while(clean[pos]==='+'||clean[pos]==='-'){const op=clean[pos++],n=product();v=op==='+'?v+n:v-n;}return v;};
 try{const result=sum();return pos===clean.length&&Number.isFinite(result)&&Math.abs(result)<=1e15?{expression,result}:null;}catch{return null;}
}
function answerWorkTool(prompt,{cadContext=null,locale='tr'}={},t=s=>s){if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000)return null;const arithmetic=calculate(fold(prompt).replace(/^(hesapla|calculate)\s*:?\s*/,'').replace(/[?]$/,''));const output=workTools.toolAnswer(prompt,{cadContext:normalizeCad(cadContext),locale},t)??(arithmetic?arithmetic.expression+' = '+Number(arithmetic.result.toPrecision(12)).toString():null);return output?{ok:true,engine:'core',output,references:[]}:null;}
function answerOwned(prompt,{knowledge=[],cadContext=null,workingMemory=null,history=[],options={},locale='tr',includeCatalog=true}={},t=s=>s){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000)return null;
 const q=fold(prompt),context=normalizeCad(cadContext),all=normalizeKnowledge(knowledge),refs=d=>d.map(v=>({id:'knowledge-'+v.id,title:v.title,href:'/ai#knowledge'}));
 const response=(output,references=[])=>({ok:true,engine:'core',output,references});
 const safety=conversation.safetyReply(prompt,{locale});if(safety)return safety;
 if(includeCatalog&&options.useKnowledge!==false&&conversation.isCatalogQuestion(prompt))return conversation.answerCatalog(prompt,{history,options,locale});
 const dialogue=answerDialogue(prompt,{history,locale,cadContext:context});if(dialogue)return dialogue;
 const tasks=answerTasks(prompt,{cadContext:context,workingMemory,history,options,locale,t});if(tasks)return tasks;
 if(/sifirdan.*egit|temel.*model|foundation model|trained.*scratch|kendi.*model.*egit/.test(q))return response(t('AYA Core bize ait çalışma katmanıdır. Temel dil modeli sıfırdan eğitilmedi; yerel açık ağırlıklı model kullanılır.'));
 const arithmetic=calculate(q.replace(/^(hesapla|calculate)\s*:?\s*/,'').replace(/[?]$/,''));
 if(arithmetic)return response(arithmetic.expression+' = '+Number(arithmetic.result.toPrecision(12)).toString());
 const definition=/nedir|ne demek|ne anlama|tanimi|what is|what are|define|definition/.test(q)&&!/siradaki|sonraki|ne yap|next/.test(q);
 if(context&&!cadContext?.scope&&!definition&&/kapanis|occlusion|bite|antagonist/.test(q)){return response([t('Çalışma ünitesi')+': '+(context.unit||'—'),t(context.upperReady&&context.lowerReady?'Kayıtlı kapanış':'Antagonist ve kapanış verisini kontrol et'),t('Göster / Gizle')].join('\n'));}
 if(context&&!cadContext?.scope&&!definition&&/siradaki|ne yap|sonraki|^devam[?.!\s]*$|next|proje.*durum|^durum[?.!\s]*$|^kontrol[?.!\s]*$|hazir mi/.test(q)){
  const rows=[t('Çalışma ünitesi')+': '+(context.unit||'—')];
  if(context.isSaving)rows.push(t('Kaydediliyor…'));
  else if(context.saveFailed)rows.push(t('CAD projesi kaydedilemedi.'),t('Yerel kaydet ve çık'));
  else if(!context.setupComplete)rows.push(t('İş tanımını tamamlayın'));
  else if(!context.sourceReady)rows.push(t('Kaynak seçilmedi'));
  else if(!context.modelReady)rows.push(t('Modelin yüklenmesini bekleyin.'));
  else if(context.marginPoints<3)rows.push(t('Geçerli bir kole çizgisi çizin.'));
  else if(!context.visible)rows.push(t('Tümünü göster'));
  else if(!context.placed)rows.push(t('Koleye yerleştir'));
  else if(context.task==='contacts'&&!(context.upperReady&&context.lowerReady))rows.push(t('Antagonist ve kapanış verisini kontrol et'));
  else if(context.unsaved)rows.push(t('Kaydet ve çık'));
  else rows.push(t('Sonraki'));
  return response(rows.join('\n'));
 }
 const follow=/^(devam|peki|sonra|continue|more|bunu|onu|what about|and then)/.test(q),prior=follow?(Array.isArray(history)?history:[]).filter(m=>m?.role==='user'&&typeof m.content==='string'&&!/^(devam|peki|sonra|continue|more|bunu|onu)[?.!\s]*$/.test(fold(m.content))).at(-1)?.content||'':'';
 const found=retrieveKnowledge(prompt+' '+prior,all);
 if(/hatirliyor|ne hatir|hafiza|bellek|what.*remember|saved.*memor/.test(q)){
  const selected=found.length?found:all.filter(d=>d.kind==='memory').slice(-6);
  if(selected.length)return response(selected.map(d=>d.title+'\n'+d.content.slice(0,2200)).join('\n\n'),refs(selected));
 }
 if(found.length)return response(found.slice(0,options.style==='concise'?1:3).map(d=>d.title+'\n'+knowledgeExcerpt(d,prompt+' '+prior)).join('\n\n'),refs(found.slice(0,options.style==='concise'?1:3)));
 if(includeCatalog&&options.useKnowledge!==false)return conversation.answerCatalog(prompt,{history,options,locale});
 return null;
}
function cadChecklist(v,t){return workTools.cadChecklist(normalizeCad(v),t);}
function nextCadAction(v){return workTools.nextCadAction(normalizeCad(v));}
module.exports={answerWorkTool,cadChecklist,nextCadAction,CORE_VERSION,localSetupGuide,normalizeKnowledge,retrieveKnowledge,normalizeCad,ownedContext,calculate,answerOwned};
