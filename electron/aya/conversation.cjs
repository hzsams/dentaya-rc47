'use strict';
const {entries,topics,facets,stats}=require('./qa-catalog.cjs');
const fold=s=>String(s??'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const words=s=>fold(s).split(' ').filter(Boolean);
const ignored=new Set(words('kanka lütfen lutfen bana beni benim bir bu şu ve ile veya için hakkında konusunda nasıl nedir ne nedemek demek anlat açıkla bilgi verir misin acaba peki daha çok biraz yapmak yaparım ederim edebilirim yapmalıyım hangi kaç mı mi mu mü var yok olur olabilir nelerdir biliyor musun sen nedendi şöyle neden kontrol kontrolü etmeliyim ederiz edebilirim yapılan sık ilgili why what how can the a an is it to of in and for do does please tell me about'));
for(const term of words('açıklar açıklayabilir açıklarım açıklarsın anlatır anlatabilir neye dikkat hangi hangisi nasıl mıydı midir mısınız misiniz etsek etmeliyiz edelim yapalım istiyorum istiyoruz anlama anlamı gelir geliyor ilerlerim ilerlemeliyim yapabilirim farkı fark karşılaştır karşılaştırır kullanılır kullanabilirim kullanımı çalışır çalışıyor'))ignored.add(term);
const generic=new Set(words('aya cad diş dental model yüzey tarama dosya görünüm kontrol tasarım üretim yerel numara hata hatası yanlış dışı ilk son ana tam ayrı aynı gerçek yeni eski'));
const index=topics.map(topic=>({topic,phrases:[topic.title,...topic.aliases].map(words),alternatives:[topic.title,...topic.aliases].map(words).map(w=>w.filter(x=>!ignored.has(x))),terms:new Set(words(topic.title+' '+topic.aliases.join(' ')).filter(x=>!ignored.has(x)))}));
const frequency=new Map();for(const item of index)for(const term of item.terms)frequency.set(term,(frequency.get(term)||0)+1);
const byId=new Map(entries.map(e=>[e.id,e]));
const exact=new Map(entries.map(e=>[fold(e.question),e]));
function oneEdit(a,b){
 if(a===b)return true;if(Math.abs(a.length-b.length)>1||Math.min(a.length,b.length)<5)return false;
 if(a.length===b.length){const mismatches=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])mismatches.push(i);return mismatches.length===1||mismatches.length===2&&mismatches[1]===mismatches[0]+1&&a[mismatches[0]]===b[mismatches[1]]&&a[mismatches[1]]===b[mismatches[0]];}
 const [short,long]=a.length<b.length?[a,b]:[b,a];let i=0,j=0,skipped=false;while(i<short.length&&j<long.length){if(short[i]===long[j]){i++;j++;}else if(skipped)return false;else{skipped=true;j++;}}return true;
}
const suffixes=/^(?:i|in|ini|inin|e|ye|yi|de|da|den|dan|nin|ni|na|ne|nda|nde|n|u|un|unu|a|si|sini|ler|leri|lar|lari|daki|deki)$/;
function tokenMatch(q,t){if(q===t)return 1;if(t.length>=3&&!generic.has(t)&&q.startsWith(t)&&suffixes.test(q.slice(t.length)))return .92;return oneEdit(q,t)?.8:0;}
function scoreQuery(query,limit=3){
 const allWords=words(query),q=allWords.filter(x=>!ignored.has(x));if(!q.length)return [];
 const fdi=q.find(x=>/^[1-8][1-8]$/.test(x));
 if(fdi&&/\b(fdi|dis|disi|disin|numara|numarali|kod|kodu|kodundaki)\b/.test(fold(query))){const item=index.find(i=>i.topic.id==='fdi-'+fdi);return item?[{topic:item.topic,score:100}]:[];}
 const scored=[];
 for(const item of index){
  if(item.topic.category==='fdi')continue;
  let score=0,anchors=0,matched=0;
  for(const term of item.terms){const quality=Math.max(0,...q.map(v=>tokenMatch(v,term)));if(!quality)continue;score+=quality*Math.log(1+topics.length/(frequency.get(term)||1));matched++;if(!generic.has(term)&&term.length>=3)anchors++;}
  if(!anchors)continue;
  for(const alternative of item.alternatives){if(!alternative.length)continue;const qualities=alternative.map(t=>Math.max(0,...q.map(v=>tokenMatch(v,t))));if(qualities.every(Boolean)){const special=alternative.filter(t=>!generic.has(t));if(special.length)score+=2*special.length+qualities.reduce((a,b)=>a+b,0);}}
  const qAnchors=q.filter(t=>!generic.has(t)&&![...generic].some(g=>g.length>=3&&t.startsWith(g)&&suffixes.test(t.slice(g.length))));const coverage=qAnchors.filter(t=>[...item.terms].some(v=>tokenMatch(t,v))).length/Math.max(1,qAnchors.length);
  // An incidental dental word in an unrelated sentence must not force an answer.
  if(coverage<.45&&qAnchors.length>=2)continue;
  const deliberate=item.phrases.some(a=>a.length&&a.some(t=>!generic.has(t))&&a.every(t=>allWords.some(v=>tokenMatch(v,t))));
  if(!deliberate&&coverage<.8&&qAnchors.length>=2)continue;
  if(matched&&score>=5)scored.push({topic:item.topic,score});
 }
 return scored.sort((a,b)=>b.score-a.score||a.topic.id.localeCompare(b.topic.id)).slice(0,Math.max(1,Math.min(limit,8)));
}
function facetOf(query){const q=fold(query);if(/kontrol|dogrula|teyit|neye dikkat|check|verify/.test(q))return 2;if(/nasil|adim|nereden|basla|ilerle|ne yap|how|steps|acabil|acilir/.test(q))return 1;if(/sik yapilan|yaygin hata|hangi hata|hata nedir|hata.*(?:yap|olabi)|yanlis|kacin|mistake|pitfall/.test(q))return 3;return 0;}
function topicFacet(topic,query){if(topic.category!=='fdi')return facetOf(query);const q=fold(query);if(/rakam|kod.*anlam/.test(q))return 3;if(/sut|daimi|kalici|grup/.test(q))return 2;if(/bolge|hangi cene|nerede|neresi/.test(q))return 1;return 0;}
function entryFor(topic,facet){return byId.get(topic.id+'-'+facets[facet]);}
function ref(entry){const topic=topics.find(t=>t.id===entry.topicId);return {id:'aya-qa-'+entry.id,title:topic.title+' · '+entry.facet,href:'/ai#aya-catalog'};}
const response=(output,selected=[])=>({ok:true,engine:'core',output,references:selected.map(ref)});
function safetyReply(prompt,{locale='tr'}={}){
 const q=fold(prompt),tr=locale==='tr';
 if(/\b(dis|disim|implant|cenem|cene|agiz|agzim|apse|yanagim|dental)\b/.test(q)&&/nefes.*(alam|zor|gucl|dar)|yutam|yutma.*(zor|gucl)|breath.*(cannot|diffic)|cannot.*(breathe|swallow)/.test(q))return response(tr?'Nefes alma veya yutma güçlüğüyle birlikte diş, çene ya da ağız şikâyeti acil değerlendirme gerektirebilir. Sohbette beklemeyin; bulunduğunuz yerdeki acil sağlık hizmetine hemen başvurun. Buradan tanı koyamam.':'Dental swelling with difficulty breathing or swallowing may need emergency care. Seek local emergency medical help now; do not wait for chat. I cannot diagnose you here.');
 const medication=/\b(antibiyotik|antibiotic|ilac|ilaci|painkiller|doz|dosage|dose)\b/.test(q)&&/\b(hangi|kac|oner|onerir|kullan|alayim|ver|mg|ml|yaz|which|how|take|prescribe)\w*/.test(q);
 const torque=/tork|torque|ncm|nm/.test(q)&&/implant|vida|abutment/.test(q);
 const personal=/disim|dislerim|cenem|yanagim|hastam|hastanin|my tooth|my teeth|my jaw/.test(q)&&/agri|sisme|sislik|kaniyor|sallaniyor|kirildi|tedavi|tani|pain|swollen|bleed/.test(q);
 if(medication||torque||personal)return response(tr?(torque?'İmplant veya vida için tork değeri tahmin edemem. Tam implant sistemi, bağlantı ve bileşen koduna ait güncel üretici talimatını ve yetkili hekimin kararını esas alın.':medication?'Kişiye özel ilaç, antibiyotik veya doz öneremem. Güvenli seçim muayene, sağlık geçmişi ve kullanılan ilaçların değerlendirilmesini gerektirir; diş hekiminize veya eczacınıza danışın.':'Geçmiş olsun. Bu belirtilerle buradan tanı koyamam. Ne zaman başladığını ve şişlik/ateş olup olmadığını diş hekiminize bildirin; süren ağrı veya şişliği geciktirmeden değerlendirtin. Nefes veya yutma güçlüğünde acil yardım alın.'):'I cannot prescribe medication, diagnose a patient, or invent implant torque values. For symptoms seek dental assessment; for components use the exact manufacturer instructions and clinician approval.');
 return null;
}
function smallTalk(prompt,{locale='tr'}={}){
 const q=fold(prompt).replace(/^(kanka|aya) /,''),tr=locale==='tr';
 if(/^(kanka |aya |hey )?(merhaba|selam|selamlar|gunaydin|iyi aksamlar|iyi gunler|hello|hi|hey)( kanka| aya)?( nasilsin| naber| how are you)?$/.test(q))return response(tr?'Selam! Buradayım. Diş bilgisi, CAD, kayıt sorunları veya AYA hakkında sorabilirsin. Örneğin “Koleyi nasıl kontrol ederim?” yazabilirsin.':'Hi! Ask me about dental terms, CAD, saving work or AYA. The built-in question catalogue is currently Turkish; a local model can help with broader conversation.');
 if(/^(kanka |aya )?(nasilsin|naber|ne haber|napiyon|ne yapiyorsun|nasil gidiyor|how are you|whats up)$/.test(q))return response(tr?'Buradayım, yardımcı olmaya hazırım. Senin işler nasıl; CAD tarafında mı ilerleyelim, bir soruna mı bakalım?':'I’m here and ready to help. How is your work going—shall we work on CAD or a question?');
 if(/^(cok |kanka |aya )?(tesekkurler|tesekkur ederim|sag ol|sagol|eyvallah|thanks|thank you)( kanka)?$/.test(q))return response(tr?'Rica ederim kanka. Başka bir konuya geçebiliriz ya da son yanıtı adım adım açabilirim.':'You’re welcome. We can switch topics or go through the last answer step by step.');
 if(/^(tamam|ok|okay|anladim|olur|peki|guzel|evet|hayir)$/.test(q))return response(tr?'Tamam. Devam etmek istediğin adımı veya yeni sorunu yazabilirsin.':'Okay. Tell me the next step or your new question.');
 if(/^(kanka )?(iyi degilim|moralim bozuk|cok yoruldum|bunaldim|i am tired|im tired)$/.test(q))return response(tr?'Üzgünüm kanka. İstersen ne olduğunu anlat; iş tarafını da tek küçük adıma bölebiliriz.':'I’m sorry it’s been difficult. You can tell me what happened, or we can break the work into one small next step.');
 if(/^(yardim|yardim eder misin|bana yardim et|help|neler yapabilirsin|ne yapabilirsin|ne ise yararsin|ne biliyorsun|kac soruya cevap verebilirsin|kac soru biliyorsun|what can you do)$/.test(q))return response(tr?`${stats.questions} hazır soru-cevapla ${stats.topics} konuda yardımcı olabilirim: CAD iş akışı, geometri, dosyalar, renkler, temel diş bilgisi ve FDI numaraları. Hesaplama ve birim dönüşümü de yaparım. Her konuyu bilen bir model değilim; açık uçlu sohbet için kurulu yerel model kullanılabilir.`:`I have ${stats.questions} built-in Turkish Q&A records across ${stats.topics} topics, plus calculations and work tools. Broader conversation uses an installed local model. I am not an independently trained foundation model.`);
 if(/^(benim )?(adim|ismim) .{2,70}$/.test(q))return response(tr?'Memnun oldum! Bu konuşmada seni tanıyarak ilerleyebiliriz. Ne üzerinde çalışmak istersin? Bu mesaj kendiliğinden kalıcı bilgi defterine kaydedilmez.':'Nice to meet you! What would you like to work on? This message is not automatically added to permanent notebook memory.');
 return null;
}
function priorEntry(history){
 const safe=Array.isArray(history)?history.slice(-12):[];
 const last=safe.at(-1);if(last?.role!=='assistant')return null;
 for(const reference of Array.isArray(last.references)?last.references:[]){const id=typeof reference?.id==='string'?reference.id.replace(/^aya-qa-/,''):'';if(byId.has(id))return byId.get(id);}
 const previous=[...safe].reverse().find(m=>m?.role==='user'&&typeof m.content==='string'&&!isFollowup(m.content));
 if(!previous)return null;return exact.get(fold(previous.content))||(()=>{const hit=scoreQuery(previous.content,1)[0];return hit?entryFor(hit.topic,facetOf(previous.content)):null;})();
}
function isFollowup(prompt){return /^(peki |bunu |onu |biraz |daha |o zaman )*(devam|sonra|orne[kgi]|ornek ver|anlat|acikla|kisa|kisalt|ayrintili|detay|madde madde|kontrol|nasil|nasil kontrol|nasil kontrol ederim|neyi kontrol|neye dikkat|hangi hata|hangi hatalar|tekrar|ingilizce|english|continue|more|shorter|steps|check)(.*)?$/.test(fold(prompt));}
function answerCatalog(prompt,{history=[],options={},locale='tr'}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000)return null;
 const canonical=exact.get(fold(prompt));if(canonical)return response(canonical.answer,[canonical]);
 const hits=scoreQuery(prompt,3),q=fold(prompt);
 const previous=isFollowup(prompt)?priorEntry(history):null;
 if(!previous&&/^(peki )?(devam|sonra|daha kisa|kisalt|madde madde|ornek ver|nasil kontrol ederim|continue|more|shorter)$/.test(q))return null;
 if(previous&&(!hits.length||hits[0].score<7)){
  const topic=topics.find(t=>t.id===previous.topicId);let facet=facetOf(prompt);
  if(/^((peki|bunu|onu) )?(devam|sonra|continue|more)$/.test(q))facet=(facets.indexOf(previous.facet)+1)%4;
  const entry=entryFor(topic,facet);
  if(/ingilizce|english/.test(q))return response('The built-in catalogue is currently Turkish. For this topic, use an installed local model for an English explanation, or ask another Turkish question. Topic: '+topic.title,[entry]);
  if(/madde madde|ayrintili|detay|ornek|ornegi/.test(q))return response(topic.title+'\n'+topic.answers.map((a,i)=>(i+1)+'. '+a).join('\n'),[entry]);
  return response(entry.answer,[entry]);
 }
 if(!hits.length)return null;
 if(hits.length>1&&/farki|fark |karsilastir|versus| vs |difference|compare/.test(' '+q+' ')){
  const selected=hits.slice(0,2).map(h=>entryFor(h.topic,0));return response(selected.map(e=>topics.find(t=>t.id===e.topicId).title+': '+e.answer).join('\n\n')+'\n\nBunlar genel açıklamalardır; vaka veya üretim uygunluğu ayrıca doğrulanmalıdır.',selected);
 }
 if(hits.length>1&&hits[0].score-hits[1].score<.7&&!index.find(i=>i.topic.id===hits[0].topic.id).alternatives.some(a=>a.length>=2&&a.every(t=>words(prompt).includes(t))))return response((locale==='tr'?'Hangi konuyu kastediyorsun? ':'Which topic do you mean? ')+hits.slice(0,3).map(h=>h.topic.title).join(' / ')+'.');
 const hit=hits[0],entry=entryFor(hit.topic,topicFacet(hit.topic,prompt));
 const detailed=options.style==='explained'||options.style==='checklist'||options.style==='detailed'||/ayrintili|detayli|madde madde/.test(q);
 return response(detailed?hit.topic.title+'\n'+hit.topic.answers.map((a,i)=>(i+1)+'. '+a).join('\n'):entry.answer,[entry]);
}
function fallbackReply(prompt,{locale='tr',history=[],modelError='',modelEnabled=false}={}){
 const q=fold(prompt),tr=locale==='tr';let output;
 if(!q||q.length<3)output=tr?'Buradayım. Biraz daha açar mısın? Örneğin “Koleyi nasıl kontrol ederim?” diye sorabilirsin.':'I’m here. Could you add a little detail about what you need?';
 else if(isFollowup(prompt)&&!priorEntry(history))output=tr?'Hangi konuyu devam ettirelim? Konu adını veya son sorunu bir kez yazarsan oradan ilerleyebilirim.':'Which topic should we continue? Please name it once so I can follow.';
 else if(/saat|tarih|hava|doviz|kur |fiyat|guncel|bugun|latest|weather|stock/.test(q))output=tr?'Bu bilgi güncel veri gerektirebilir; burada canlı veri kaynağına bağlı değilim. Hangi bilgi ve hangi tarih/yer gerektiğini netleştirirsen doğru doğrulama adımını konuşabiliriz.':'That may need live information. I do not have a live data source here; tell me the date or location you need.';
 else output=tr?'Mesajını aldım; buna hazır bilgi tabanımda güvenilir bir yanıt eşleştiremedim. Bir kavramı mı açıklayayım, bir hatayı mı çözelim, yoksa bir metin mi hazırlayalım? Konuyu bir cümle daha açabilir misin?':'I received your message, but could not match a reliable built-in answer. Do you want an explanation, troubleshooting, or a draft? Please add a little context.';
 if(modelError==='LOCAL_CANCELLED')output=tr?'Yanıtı durdurdun. Sorun konuşmada duruyor; yeniden gönderebilir veya daha kısa sorabilirsin.':'Response stopped. Your question is still in the conversation; you can retry or shorten it.';
 else if(modelError)output+=(tr?' Yerel model bu isteği tamamlayamadı; soru kaybolmadı.':' The local model could not complete this request; your question has been kept.');
 else if(!modelEnabled&&q.length>=3)output+=(tr?' Daha geniş sohbet için masaüstünde yerel modeli kurup Core seçimini kapatabilirsin.':' For broader conversation, use an installed desktop model with Core-only mode off.');
 return response(output);
}
function retrieveCatalog(query,limit=3){const exactEntry=exact.get(fold(query));return exactEntry?[exactEntry]:scoreQuery(query,limit).map(h=>entryFor(h.topic,topicFacet(h.topic,query)));}
function isCatalogQuestion(query){return exact.has(fold(query));}
module.exports={fold,oneEdit,scoreQuery,safetyReply,smallTalk,answerCatalog,fallbackReply,retrieveCatalog,isCatalogQuestion};
