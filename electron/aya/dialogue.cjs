'use strict';

// Product facts are shared by the offline dialogue and the local model's trusted
// instructions. They are independent of optional documents and personal notes.
const assistantProfile=Object.freeze({
 name:'AYA',product:'DentAYA',
 purpose:'Help people understand and complete their DentAYA work using the available context and tools.',
 capabilities:Object.freeze(['Explain workflows and dental terms','Prepare checklists and handoff drafts','Calculate and convert units','Use the current conversation and explicit working memory','Explain actual CAD state and propose available tools']),
 limits:Object.freeze(['No automatic CAD changes','No invented measurements, saved actions or clinical approval','No personal diagnosis, prescriptions or guessed implant torque','No automatic cloud fallback','Offline Core is not a general language model'])
});
function profileInstructions(){return `Kimliğin ${assistantProfile.name}; ${assistantProfile.product} çalışma asistanısın. Adın sorulursa doğrudan AYA de. Amacın kullanıcının işini anlamasına ve mevcut araçlarla ilerlemesine yardımcı olmak. Kimlik ve amaç sorularını dental kavram tanımına çevirme. İş akışlarını ve dental terimleri açıklayabilir, kontrol listesi ve teslim notu taslağı hazırlayabilir, hesaplama ve birim dönüşümü yapabilirsin. Verilen konuşma, çalışma belleği ve gerçek CAD durumunu kullan; verilmemiş kişisel bilgi, ölçüm, kayıt veya yapılmış işlem uydurma. CAD araçlarını yalnız mevcut izinli önerilerle sun; kullanıcı uygulamadan işlem yapılmış sayılmaz. AYA Core çevrimdışı rehberi genel dil modeli değildir. Yerel model ve Core ayrımını dürüstçe açıkla; bilinç, sıfırdan model eğitimi, otomatik bulut geçişi veya kalıcı öğrenme iddiasında bulunma. Birden fazla soru varsa her birini yanıtla. Kısa takipleri son ilgili konuya bağla; yeni konu ve vazgeçme ifadelerinde eski dental konuyu sürdürme. Kullanıcının son isim düzeltmesini kullan; iptal ettiği isim bilgisine geri dönme.`;}

const fold=s=>String(s??'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const response=output=>({ok:true,engine:'core',output,references:[]});
const leading=/^(?:(?:aya core|aya|kanka|hey|merhaba|selam|selamlar|hello|hi|lutfen|acaba|peki|tamam|ya|bir de|kisaca|tesekkur ederim|tesekkurler|sag ol|thanks|thank you|please)\s+)+/;
const trailing=/\s+(?:lutfen|acaba|kanka|aya|please|thanks)$/;
function clean(s){let q=fold(s),old;do{old=q;q=q.replace(leading,'').replace(trailing,'');}while(q!==old);return q;}
const patterns={
 identity:[/^(?:sen(?:in)? )?(?:adin|ismin)(?: ne| nedir| neydi| neydi acaba| ney)?$/,/^(?:sen )?(?:kimsin|nesin)$/,/^(?:bana )?(?:adini|ismini) (?:soyle|soyler misin|soyleyebilir misin)$/,/^sana (?:ne|nasil) (?:diyeyim|sesleneyim|hitap edeyim)$/,/^(?:bana )?(?:kisaca )?(?:kendini|kendinden) (?:bana )?(?:kisaca )?(?:tanit|tanitir misin|tanitabilir misin|bahset|bahseder misin)$/,/^(?:aya|aya core) (?:kim|nedir|ne demek)$/,/^(?:what is|what s|whats) your name$/,/^who are you$/,/^(?:introduce yourself|tell me your name|what should i call you)$/],
 purpose:[/^(?:sen(?:in)? )?(?:amacin|gorevin|rolun|hedefin)(?: ne| nedir| neydi)?$/,/^(?:burada )?ne (?:icin varsin|icin buradasin|ise yariyorsun|ise yararsin)$/,/^neden (?:varsin|buradasin)$/,/^(?:what is|what s|whats) your (?:purpose|role|goal|job)$/,/^why (?:are you here|do you exist)$/],
 capabilities:[/^(?:sen )?(?:baska )?(?:neler|ne) (?:yapabilirsin|yapabiliyorsun|biliyorsun)$/,/^(?:bana )?(?:nasil|hangi konularda|nelerde) (?:yardimci olabilirsin|yardim edebilirsin|yardimci olursun)$/,/^(?:bana )?(?:yardim|yardim et|yardim eder misin|yardim edebilir misin|yardimci olur musun|yardimci olabilir misin)$/,/^(?:yeteneklerin|ozelliklerin) (?:ne|neler|nelerdir)$/,/^(?:kac soruya cevap verebilirsin|kac soru biliyorsun)$/,/^(?:help|help me|can you help me|what can you do|how can you help me)$/],
 limits:[/^(?:neleri|ne|neler) (?:yapamazsin|yapamiyorsun)$/,/^sinirlarin (?:ne|neler|nelerdir)$/,/^her seyi (?:biliyor musun|yapabilir misin)$/,/^(?:what are your limitations|what can t you do|what cant you do)$/],
 engine:[/^(?:sen )?(?:bir )?(?:yapay zeka|insan|robot|dil modeli) misin$/,/^(?:su an )?(?:yerel )?model (?:kullaniyor musun|var mi|gerekiyor mu)$/,/^(?:model olmadan|modelsiz|internetsiz|cevrimdisi) (?:calisir misin|calisabilir misin|calisiyor musun|ne yapabilirsin)$/,/^(?:are you (?:an? )?(?:ai|human|robot)|do you (?:use|need) a model|can you work offline)$/],
 memory:[/^(?:beni|konusmamizi|sohbeti|konusmayi|kararlarimizi) (?:hatirliyor musun|hatirlar misin|taniyor musun)$/,/^(?:hafizan|bellegin) var mi$/,/^neleri hatirlarsin$/,/^(?:do you remember me|do you have memory|what can you remember)$/],
 perception:[/^(?:ekranimi|ekrani|taramayi|modelimi|cad durumunu) (?:goruyor musun|gorebiliyor musun)$/,/^(?:can you see my screen|can you see my scan)$/],
 privacy:[/^(?:mesajlarim|verilerim|konusmalarim|yazdiklarim) (?:nereye gidiyor|buluta gidiyor mu|saklaniyor mu|kaydediliyor mu)$/,/^(?:beni dinliyor musun|buluta bagli misin|gizlilik nasil)$/,/^(?:where do my messages go|are my messages saved|do you send my data to the cloud)$/],
 recallName:[/^(?:benim )?(?:adim|ismim) (?:ne|neydi|nedir)$/,/^(?:adimi|ismimi) (?:hatirliyor musun|biliyor musun)$/,/^(?:what is|what s|whats) my name$/,/^do you (?:remember|know) my name$/],
 greeting:[/^(?:merhaba|selam|selamlar|gunaydin|iyi aksamlar|iyi gunler|hello|hi|hey)(?: (?:aya|kanka|nasilsin|naber|how are you))*$/],
 wellbeing:[/^(?:nasilsin|naber|ne haber|napiyon|ne yapiyorsun|nasil gidiyor|how are you|what s up|whats up)$/],
 acknowledgement:[/^(?:(?:cok|cok cok) )?(?:tesekkurler|tesekkur ederim|sag ol|sagol|eyvallah|thanks|thank you)(?: (?:kanka|aya))?$/,/^(?:tamam|ok|okay|anladim|olur|peki|guzel|evet|hayir|yes|no)$/],
 support:[/^(?:iyi degilim|moralim bozuk|cok yoruldum|bunaldim|i am tired|im tired)$/],
 stop:[/^(?:devam etme|devam etmek istemiyorum|bunu anlatma|dur|dur artik|vazgectim|iptal|stop|stop explaining|never mind)$/]
};
function singleIntent(raw){
 const original=fold(raw),q=clean(raw),addressed=original.replace(/^(?:(?:aya core|aya|kanka|hey) )+/,'');
 const variants=[original,addressed,q,q.replace(/ (?:soyler misin|soyleyebilir misin|anlatir misin|aciklar misin)$/,'')];
 // A bare product name is an address, not a request to invent an answer.
 for(const [kind,expressions] of Object.entries(patterns))if(expressions.some(re=>variants.some(value=>re.test(value))))return {kind};
 return null;
}
function parseDirect(prompt){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1200)return null;
 const q=clean(prompt);
 if(/^(?:senin )?(?:adin|ismin) ve (?:amacin|gorevin|rolun)(?: ne| nedir)?$/.test(q)||/^(?:what is|what s|whats) your name and (?:purpose|role)$/.test(q))return [{kind:'identity'},{kind:'purpose'}];
 const direct=singleIntent(prompt);if(direct)return [direct];
 // Every clause must be understood. An identity word inside an unrelated
 // request must never consume the user's actual task.
 const clauses=prompt.split(/[?!;.,\n]+|\b(?:ve|and|ayrıca|ayrica)\b/iu).map(x=>x.trim()).filter(Boolean);
 if(clauses.length<2||clauses.length>8)return null;
 const intents=clauses.map(singleIntent);return intents.every(Boolean)?intents:null;
}
function isAcknowledgement(prompt){const intents=parseDirect(prompt);return !!intents&&intents.every(i=>i.kind==='acknowledgement');}
function followupMode(prompt){const q=clean(prompt).replace(/^(?:bunu|onu) /,'').replace(/ (?:misin|eder misin)$/,'');if(/^(?:devam|devam et|anlat|acikla|biraz ac|biraz daha ac|daha detayli|daha detayli anlat|detaylandir|nasil yani|anlamadim|continue|tell me more|more)$/.test(q))return 'detail';if(/^(?:ornek|ornek ver|bir ornek ver|mesela|mesela nasil|give an example|for example)$/.test(q))return 'example';if(/^(?:daha kisa|(?:daha )?kisa anlat|(?:daha )?kisa anlatir|kisalt|ozetle|shorter|summarize)$/.test(q))return 'short';return '';}
function previousIntents(history){
 const messages=Array.isArray(history)?history.slice(-48):[];
 for(let i=messages.length-1;i>=0;i--){const m=messages[i];if(m?.role!=='user'||typeof m.content!=='string')continue;
  if(isAcknowledgement(m.content)||followupMode(m.content))continue;
  const intents=parseDirect(m.content);return intents?.filter(x=>!['acknowledgement','greeting','stop','support'].includes(x.kind))??null;
 }return null;
}
const nameWords=/^[\p{L}][\p{L}\p{M}'’-]*(?:[ -][\p{L}][\p{L}\p{M}'’-]*){0,3}$/u;
const notNames=new Set(['ne','nedir','neydi','kim','kanka','aya','bilmiyorum','yok','hayir','nedendi','degil','degildi','not','artik']);
function nameRevoked(prompt){const q=fold(prompt).replace(/^(?:hayir|aslinda|no|actually) /,'');return /^(?:(?:benim )?(?:adim|ismim) (?:.{1,80} )?degil|my name is not .{1,80}|(?:adimi|ismimi) unut|bana bu isimle hitap etme|forget my name)$/.test(q);}
function declaredName(prompt){
 if(typeof prompt!=='string'||prompt.length>200)return '';
 const text=prompt.trim().replace(/^(?:hayır|hayir|aslında|aslinda|no|actually)[,\s]+/iu,'');
 const lower=text.toLocaleLowerCase('tr');
 const match=lower.match(/^(?:(?:benim\s+)?(?:adım|adim|ismim)|my name is)\s+(.+?)[.!]?$/du)??lower.match(/^(?:bana\s+(.+?)\s+(?:de|diye hitap et)|call me\s+(.+?))[.!]?$/du);
 const range=match?.indices?.[1]??match?.indices?.[2],name=(range?text.slice(...range):'').trim();
 if(!name||name.length>60||!nameWords.test(name)||name.split(/[ -]/).some(x=>notNames.has(fold(x))))return '';
 return name;
}
function userName(history){const messages=Array.isArray(history)?history.slice(-48):[];for(let i=messages.length-1;i>=0;i--)if(messages[i]?.role==='user'){if(nameRevoked(messages[i].content))return {name:'',cleared:true};const name=declaredName(messages[i].content);if(name)return {name,cleared:false};}return {name:'',cleared:false};}
function exampleFor(kinds,tr){
 if(kinds.some(x=>['memory','recallName'].includes(x)))return tr?'Örneğin “Adım Deniz” dedikten sonra bu sohbette “Adım ne?” diye sorabilirsin. Çalışma belleğine bir hedef eklediğinde “Hedefimiz neydi?” sorusuyla onu geri çağırabiliriz. Geçmiş saklama kapalıysa yeni oturumda hatırlama sözü veremem.':'For example, say “My name is Deniz”, then ask “What is my name?” in this chat. Add a working-memory goal and ask “What was our goal?”. With history saving off, I cannot promise recall in a new session.';
 if(kinds.includes('privacy'))return tr?'Örneğin “12 cm kaç mm?” sorusunu Core cihazda hesaplar. Yerel modeli seçtiğinde sohbet isteği bu bilgisayardaki modele gider. Kurumdaki bir vakayı kaydetmen ise ayrı Supabase bağlantısını kullanabilir; bu, sohbetin otomatik buluta gönderilmesi değildir.':'For example, Core calculates “12 cm to mm?” on this device. Local-model chat sends the request to the model on this computer. Saving an organization case may use a separate Supabase connection; it does not automatically send the chat to the cloud.';
 if(kinds.includes('perception'))return tr?'Örneğin CAD paneli “ünite 46, kole noktası 0” bilgisini iletirse önce kole çizgisini tamamlamanı önerebilirim. Ölçülmüş bir kalınlık raporu verilmediyse kalınlık değeri söyleyemem.':'For example, if the CAD panel reports unit 46 with no margin points, I can suggest completing the margin. Without an actual measured thickness report, I cannot supply thickness values.';
 return tr?'Örneğin “12 cm kaç mm?”, “Teslim notu taslağı” veya CAD panelinde “Sıradaki adım ne?” diye sorabilirsin.':'Try “12 cm to mm?”, “Handoff draft”, or “What is the next step?” in the CAD panel.';
}
function shortFor(kind,tr){const copy={
 identity:['Adım AYA; DentAYA’nın çalışma asistanıyım.','I’m AYA, the DentAYA work assistant.'],
 purpose:['Amacım işini anlamana ve mevcut araçlarla ilerlemene yardımcı olmak. Kontrol sende.','I help you understand your work and progress with available tools. You stay in control.'],
 capabilities:['Açıklama, kontrol listesi, teslim taslağı, hesaplama ve CAD durumuna göre araç önerisi sunabilirim.','I can explain, draft checklists and handoffs, calculate and suggest tools from actual CAD state.'],
 memory:['Bana iletilen sohbeti ve çalışma belleğini kullanırım; kalıcılık geçmişi kaydetme tercihine bağlıdır.','I use the supplied chat and working memory; persistence depends on history-saving preferences.'],
 privacy:['Core ve yerel sohbet bu cihazda çalışır; buluta otomatik geçilmez. Kurum kaydı ayrı bağlantı kullanır.','Core and local chat run on this device with no automatic cloud fallback. Organization records use a separate connection.'],
 engine:['Bu yanıt AYA Core’dan geliyor. Geniş sohbet için kurulu yerel model gerekir; insan değilim.','This reply is from AYA Core. Broader chat needs an installed local model; I’m not human.'],
 limits:['Tanı, doz veya ölçüm uyduramam. CAD işlemlerini sen başlatırsın; Core sınırlı bir rehberdir.','I cannot invent diagnoses, dosages or measurements. You start CAD actions; Core is a limited guide.']
 };return copy[kind]?.[tr?0:1];}
function textFor(kind,{tr,cadContext,history,prompt=''}){
 const examples=tr?'Örneğin “12 cm kaç mm?”, “Teslim notu taslağı” veya CAD panelinde “Sıradaki adım ne?” diye sorabilirsin.':'Try “12 cm to mm?”, “Handoff draft”, or “What is the next step?” in the CAD panel.';
 switch(kind){
  case 'identity':return tr?`Adım ${assistantProfile.name}. ${assistantProfile.product}’nın çalışma asistanıyım.`:`My name is ${assistantProfile.name}. I’m the ${assistantProfile.product} work assistant.`;
  case 'purpose':return tr?'Amacım işini anlamana, eksikleri görmene ve mevcut araçlarla sıradaki adımı belirlemene yardımcı olmak. Karar ve işlem kontrolü sende.':'My purpose is to help you understand your work, identify missing information and choose a next step with the available tools. You stay in control of decisions and actions.';
  case 'capabilities':return (tr?'İş akışlarını ve dental terimleri açıklayabilir, kontrol listesi ve teslim notu taslağı hazırlayabilir, hesaplama ve birim dönüşümü yapabilirim. CAD panelinde bana iletilen güncel duruma göre mevcut araçları önerebilirim.':'I can explain workflows and dental terms, prepare checklists and handoff drafts, calculate and convert units. In the CAD panel I can explain the current state provided to me and suggest available tools.')+' '+examples;
  case 'limits':return tr?'Kişiye özel tanı veya ilaç dozu veremem; ölçüm, implant torku veya yapılmış işlem uyduramam. CAD işlemlerini sen başlatırsın. Canlı veri bağlantım yok; Core rehberi her açık uçlu cümleyi anlayan bir dil modeli değildir.':'I cannot diagnose a patient, prescribe medication, invent measurements or implant torque, or claim an action was completed. You start CAD actions. Core has no live data feed and is not a general language model.';
  case 'engine':return tr?'AYA, DentAYA’nın yazılım asistanıdır; insan değilim. Bu yanıt çevrimdışı AYA Core’dan geliyor. Model olmadan temel sohbet, rehber ve hesaplama çalışır. Daha geniş sohbet için kurulu yerel model kullanılır; hazır model Otomatik modda önceliklidir. Buluta otomatik geçilmez.':'AYA is DentAYA’s software assistant, not a human. This reply comes from offline AYA Core. Basic dialogue, guides and calculations work without a model. Broader conversation uses an installed local model, which takes priority in Automatic mode. There is no automatic cloud fallback.';
  case 'memory':return tr?'Bana iletilen bu sohbet geçmişini ve çalışma belleğindeki hedef, karar ve açık soruları kullanabilirim. “Hedefimiz neydi?” veya “Adım ne?” diye sorabilirsin. Geçmişi kaydetme tercihin kapalıysa yeni oturumda bunları hatırlayacağımı söyleyemem; bu kalıcı model eğitimi değildir.':'I can use the conversation history provided to me and the goal, decisions and open questions in working memory. Ask “What was our goal?” or “What is my name?”. If history saving is off, I cannot promise to remember it in a new session. This is not model training.';
  case 'perception':return cadContext?(tr?`Bana iletilen CAD durumunu kullanabilirim; çalışma ünitesi ${cadContext.unit||'belirtilmemiş'}. Ekranını veya ham taramayı görmüyorum. Ölçüm ve analiz sonucu ancak gerçekten hesaplanıp bağlama eklenirse yorumlayabilirim.`:`I can use the CAD state provided to me; the working unit is ${cadContext.unit||'not specified'}. I do not see your screen or raw scan. I can interpret measurements only when actual analysis results are supplied.`):(tr?'Ekranını veya taramanı görmüyorum. CAD panelinde güncel çalışma durumu bana iletilebilir; bu sohbet içinde verilmemiş ölçüm veya görüntü hakkında hüküm veremem.':'I cannot see your screen or scan. The CAD panel can provide current work state; I cannot judge measurements or images that have not been supplied.');
  case 'privacy':return tr?'Core yanıtları bu cihazda hazırlanır. Yerel sohbet mesajları bu bilgisayardaki modele gider; otomatik bulut geçişi yoktur. Sohbet geçmişi yalnız kaydetme tercihin açıksa cihazda saklanır; bilgi defteri ayrı yönetilir. Kurum verilerinin Supabase ile eşitlenmesi ayrı bir uygulama akışıdır.':'Core replies are prepared on this device. Local chat sends messages to the model on this computer, with no automatic cloud fallback. Chat history is saved on the device only when enabled; the notebook is managed separately. Organization data sync through Supabase is a separate application workflow.';
  case 'recallName':{const {name,cleared}=userName(history);if(cleared)return tr?'Önceki isim bilgisini kullanmıyorum. Yeni adını söylersen onu kullanabiliriz.':'I’m no longer using the previous name. You can tell me a new name to use.';return name?(tr?`Bu sohbette adını ${name} olarak söyledin.`:`You told me your name is ${name} in this conversation.`):(tr?'Bu sohbetin bana iletilen kısmında adını söylemedin. İstersen “Adım …” diye tanışabiliriz.':'You haven’t told me your name in the conversation history available to me. You can introduce yourself with “My name is …”.');}
  case 'greeting':return tr?'Selam! Ben AYA. Neye ihtiyacın var; bir soruyu açıklayabilir, bir işe ya da CAD’deki sıradaki adıma bakabiliriz.':'Hi! I’m AYA. What do you need help with—a question, a task, or the next step in CAD?';
  case 'wellbeing':return tr?'Buradayım, yardımcı olmaya hazırım. Sen nasılsın; bugün ne üzerinde çalışalım?':'I’m here and ready to help. How are you; what shall we work on today?';
  case 'acknowledgement':return /tesekkur|sagol|sag ol|eyvallah|thanks|thank you/.test(fold(prompt))?(tr?'Rica ederim. Son konuyu açabilir veya yeni soruna geçebiliriz.':'You’re welcome. We can explore the last topic or move to your next question.'):(tr?'Tamam. İlerlemek istediğin adımı veya yeni sorunu yazabilirsin.':'Okay. Tell me the step you want to work on or your next question.');
  case 'support':return tr?'Zor bir gün olmuş gibi. İstersen anlat; iş tarafını da tek küçük adıma bölebiliriz.':'Sounds like a difficult day. You can tell me about it, or we can break the work into one small next step.';
  case 'stop':return tr?'Tamam, bu konuyu burada bırakıyorum. Hazır olduğunda başka bir soruya geçebiliriz.':'Okay, we’ll leave that topic here. We can move to another question when you’re ready.';
  default:return examples;
 }
}
function answerDialogue(prompt,{locale='tr',history=[],cadContext=null}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000)return null;
 const tr=locale==='tr',name=declaredName(prompt);
 if(nameRevoked(prompt))return response(tr?'Tamam, bu sohbette önceki isim bilgisini kullanmayacağım. Yeni adını söyleyebilirsin. Geçmiş mesajlarını silmedim.':'Okay, I won’t use the previous name in this chat. You can tell me a new one. I haven’t deleted past messages.');
 if(name)return response(tr?`Memnun oldum, ${name}. Bu sohbetin geçmişi bana iletildiği sürece adını kullanabilirim. Kendiliğinden kalıcı bilgi defterine kaydetmedim. Ne üzerinde çalışalım?`:`Nice to meet you, ${name}. I can use your name while this conversation history is available. I haven’t added it to the permanent notebook. What shall we work on?`);
 let intents=parseDirect(prompt),mode='';
 if(!intents){mode=followupMode(prompt);if(!mode)return null;intents=previousIntents(history);if(!intents?.length)return null;}
 const unique=[...new Set(intents.map(i=>i.kind))];
 const substantive=unique.filter(kind=>!['greeting','acknowledgement'].includes(kind));
 const output=(substantive.length?substantive:unique).map(kind=>mode==='short'?(shortFor(kind,tr)??textFor(kind,{tr,cadContext,history,prompt})):textFor(kind,{tr,cadContext,history,prompt}));
 if(mode==='example')return response(exampleFor(unique,tr));
 if(mode==='detail'&&unique.some(kind=>['identity','purpose','capabilities'].includes(kind))){if(!unique.includes('capabilities'))output.push(textFor('capabilities',{tr,cadContext,history,mode}));output.push(textFor('limits',{tr,cadContext,history,mode}));}
 return output.length?response(output.join('\n\n')):null;
}
module.exports={assistantProfile,profileInstructions,answerDialogue,isAcknowledgement,followupMode,declaredName};
