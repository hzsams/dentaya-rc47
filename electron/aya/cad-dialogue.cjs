'use strict';
// Offline CAD advice uses the same bounded evidence and proposal contract as the model.
// It never invokes a host callback or supplies geometry parameters.
const {normalizeWorkspace,normalizeMemory}=require('./agent.cjs');
const {isCatalogQuestion}=require('./conversation.cjs');
const {answerDialogue}=require('./dialogue.cjs');
const fold=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
const taskNames={files:['Dosyalar','Files'],margin:['Marjin','Margin'],fit:['İç yüzey','Internal fit'],anatomy:['Anatomi','Anatomy'],freeform:['Serbest şekillendirme','Freeform'],contacts:['Temaslar','Contacts'],inspect:['Kontrol','Checks'],review:['Son inceleme','Review']};
function topicOf(q){
 if(/kaydet|kayded|\bsav(?:e|ing)\b|kayit.*(?:hata|basarisiz)|kayit olm/.test(q))return 'save';
 if(/geri al|geri don|\bundo\b/.test(q))return 'undo';
 if(/yinele|tekrar uygula|\bredo\b/.test(q))return 'redo';
 if(/form kutuphan|teknisyen form|form librar/.test(q))return 'library';
 if(/kapanis|antagonist|okluz|temas|\bcontact|\bbite\b|occlusion/.test(q))return 'contact';
 if(/kalinlik|duvar|kabuk|thickness|\bwall\b|shell|kaynak mesafe|source distance/.test(q))return 'wall';
 if(/undercut|giris yon|insertion/.test(q))return 'undercut';
 if(/ic yuzey|internal fit|cement gap|siman/.test(q))return 'fit';
 if(/olcum|olc(?:mek|eyim|elim)|\bmeasure/.test(q))return 'measure';
 if(/ekle(?:me)? firca|add brush/.test(q))return 'add';
 if(/azalt(?:ma)? firca|cikar(?:ma)? firca|reduce brush/.test(q))return 'reduce';
 if(/yumusat|smooth/.test(q))return 'smooth';
 if(/kole|marjin|margin|yerlestir|placement|\bplace\b/.test(q))return 'margin';
 if(/gorun(?:ur|muyor|mez)|goster|gizle|izole|kamera|visibility|show all|isolate|camera|frame/.test(q))return 'visibility';
 return '';
}
function requestIntent(prompt,checkCompound=true){
 const q=fold(prompt).trim();
 if(!q||prompt.length>8000||isCatalogQuestion(prompt)||answerDialogue(prompt))return null;
 // A quoted sentence, translation or writing request is not an instruction to the CAD host.
 if(/cevir|tercume|translate|translation|siir|poem|hikaye|story|cumlesini|kelimesi|ingilizcesi|turkcesi|sentence|taslak|draft|kod yaz|write code/.test(q)||/^["“'‘`]/.test(q))return null;
 if(/tork|torque|cerrahi|surgical|ilac|dosage|diagnos|teshis|tedavi/.test(q))return null;
 const current=/guncel|mevcut|bu (?:tasarim|unite|dis|rapor|is|proje|calisma|kontrol)|yeni kontrol|current|this (?:design|unit|tooth|report|project|workspace)|new check/.test(q);
 const review=/incele|degerlendir|yorumla|bulgu|kontrol sonuc|rapor|analiz|review|interpret|finding|check result|analysis/.test(q);
 const next=/siradaki|sonraki|ne yap(?:ayim|maliyim|alim|acagiz)?|nasil (?:devam|ilerle)|next|what (?:should|can) (?:i|we) do|how (?:should|can) (?:i|we) (?:proceed|continue)/.test(q);
 const help=/yardim|nasil|nereye|nereden|hangi arac|ne oner|oner|yapabilir mi(?:yiz|sin)|bakabilir misin|kontrol edebilir|\bcan (?:we|you)\b|\bhelp\b|\bhow\b|suggest|recommend/.test(q);
 const definition=/nedir|ne demek|ne anlama|tanimi|what (?:is|are)|define|definition/.test(q);
 if(definition&&!(current&&(review||/durum|state|status/.test(q))))return null;
 const negative=/\b(?:kaydetme|kaydetmeyelim|kaydetmeyin|cikma|cikmayalim|geri alma|geri almayalim|inceleme|onerme|gosterme|uygulama|yerlestirme|degistirme|yapma|etme)(?:(?:\s+(?:lutfen|artik))?[.!?]*$|[,;]|\s+(?:ve|ama)\b)|\b(?:do not|don['’ ]?t)\b/.test(q);
 if(negative)return {q,topic:'',review:false,next:false,negative:true};
 if(checkCompound&&!/^(?:(?:lutfen|please|once|bu projeyi|projeyi|mevcut projeyi|bu calismayi) )*(?:kaydet ve cik|save and exit)(?: lutfen| please)?[.!?]*$/.test(q)){
  const parts=prompt.split(/\s+(?:ve|sonra|ardından|ardindan|ayrıca|ayrica|and|then)\s+|[?;]+/iu).map(s=>s.trim()).filter(Boolean);
  if(parts.length>1){const intents=parts.map(part=>requestIntent(part,false));if(intents.some(Boolean)&&intents.some(x=>!x))return {q,topic:'',review:false,next:false,mixed:true};}
 }
 const topic=topicOf(q),command=/kaydet|\bsave\b|geri al|\bundo\b|\bredo\b|yerlestir|\bplace\b|goster|\bshow\b|izole|\bisolate\b|arac.*ac|activate|firca.*ac/.test(q);
 if(!next&&!(current&&(review||help||/durum|state|status/.test(q)))&&!(topic&&(help||command||review))&&!(review&&/tasarim|mesh|cad|geometri|design|workspace/.test(q)))return null;
 return {q,topic,review,next};
}
function inconsistent(c){
 if(c.modelReady&&!c.sourceReady||c.placed&&(!c.sourceReady||!c.modelReady||!c.setupComplete||c.marginPoints<3)||c.report&&!c.modelReady)return true;
 const r=c.report;
 return Boolean(r&&(r.samples!==undefined&&(r.collisionSamples>r.samples||r.contactSamples>r.samples||r.collisionSamples!==undefined&&r.contactSamples!==undefined&&r.collisionSamples+r.contactSamples>r.samples)||r.watertight===true&&(r.boundaryEdges>0||r.nonManifoldEdges>0)));
}
function suggestCadReply(prompt,{cadContext=null,locale='tr',workingMemory}={}){
 if(typeof prompt!=='string')return null;
 const intent=requestIntent(prompt),c=normalizeWorkspace(cadContext);
 if(!intent||!c)return null;
 const tr=locale==='tr',pick=(a,b)=>tr?a:b,rows=[],proposals=[];
 const reply=()=>({ok:true,engine:'core',output:rows.join('\n'),references:[],proposals});
 const task=taskNames[c.task];
 if(intent.negative){rows.push(pick('İstemediğin CAD işlemini önermiyorum. Bu istekte işlem önerisini durdurdum; projede değişiklik yapmadım.','I will not suggest the CAD action you asked me to avoid. Action suggestions are stopped for this request; no project changes were made.'));return reply();}
 if(intent.mixed){rows.push(pick('Bu mesajda farklı türde birden fazla görev var. CAD işlemini diğer görevle birlikte bu yoldan ele alamıyorum. Hangi CAD adımına bakalım? Diğer isteği ayrı mesajda yazabilirsin.','This message combines different task types. I cannot handle the CAD action together with the other task through this path. Which CAD step should we review? Send the other request separately.'));return reply();}
 rows.push(pick('Çalışma ünitesi: ','Working unit: ')+(c.unit||'—')+(task?' · '+task[tr?0:1]:''));
 if(c.isSaving){rows.push(pick('Kayıt sürüyor. Başarı sonucu gelmeden kaydedildi veya çıkıldı diyemem.','Saving is in progress. A successful result is required before confirming a save or exit.'));return reply();}
 if(inconsistent(c)){rows.push(pick('Çalışma bilgileri birbiriyle uyuşmuyor. Kaynağı, yüklemeyi ve kole durumunu yenileyip tekrar değerlendir.','Workspace metadata is inconsistent. Refresh the source, loading and margin state before reviewing again.'));return reply();}
 const can=tool=>{
  if(!c.availableTools.includes(tool))return false;
  if(tool==='setup')return true;
  if(tool==='library')return Boolean(c.unit);
  if(tool==='save'||tool==='save-exit')return c.sourceReady;
  if(!c.sourceReady||!c.modelReady)return false;
  if(tool.startsWith('view-')&&c.view===tool.slice(5)||tool.startsWith('tool-')&&c.tool===tool.slice(5))return false;
  if(tool==='place')return c.setupComplete&&c.marginPoints>=3&&!c.placed;
  if(tool==='undo')return c.undoCount>0;
  if(tool==='redo')return c.redoCount>0;
  if(tool==='view-contact')return c.antagonistReady;
  if(tool==='recorded-bite')return c.upperReady&&c.lowerReady;
  if(tool==='internal-fit')return c.placed;
  if(tool==='next')return c.setupComplete&&c.marginPoints>=3;
  return true;
 };
 const add=(tool,a,b)=>{if(proposals.length<4&&can(tool)&&!proposals.some(p=>p.tool===tool))proposals.push({tool,reason:pick(a,b),scope:c.scope,snapshot:c.snapshot});};
 const finish=()=>{if(proposals.length)rows.push(pick('Önerilen işlemler yalnız Uygula düğmesine bastığında çalışır; güncel çalışma tekrar denetlenir.','Suggested actions run only when you click Apply; the current workspace is checked again.'));return reply();};
 const last=c.recentActions.at(-1),lastSave=c.recentActions.filter(a=>a.tool==='save'||a.tool==='save-exit').at(-1);
 const failedSave=c.saveFailed||lastSave?.ok===false;
 if(failedSave){
  rows.push(pick('Son kayıt başarısız. Kayıt başarılı olmadan çıkışı tamamlanmış sayma.','The last save failed. Exit is not complete until saving succeeds.'));
  if(lastSave?.ok===false&&lastSave.result)rows.push(pick('Kayıt sonucu: ','Save result: ')+lastSave.result);
  add('save','Önce mevcut projeyi yeniden kaydet; başarısını gerçek kayıt sonucu belirler.','Retry saving the current project first; the actual save result determines success.');
 }else if(last?.result)rows.push(pick(last.ok?'Son işlem tamamlandı: ':'Son işlem başarısız: ',last.ok?'Last action completed: ':'Last action failed: ')+last.result);
 const r=c.report;
 if(intent.review||['wall','contact','undercut'].includes(intent.topic)){
  if(!r)rows.push(pick('Bu çalışma için güncel geometri kontrolü yok. Ölçüm veya uygunluk sonucu çıkaramam.','There is no current geometry check for this workspace. Measurements or clearance cannot be inferred.'));
  else {
   const mesh=[];
   for(const [key,a,b] of [['triangles','üçgen','triangles'],['boundaryEdges','açık kenar','boundary edges'],['nonManifoldEdges','manifold olmayan kenar','non-manifold edges'],['components','ayrı bileşen','components'],['degenerateTriangles','dejenere üçgen','degenerate triangles']])if(r[key]!==undefined)mesh.push(r[key]+' '+pick(a,b));
   if(mesh.length)rows.push('Mesh: '+mesh.join('; ')+'.');
   if(r.watertight!==undefined)rows.push(pick('Kapalı mesh: ','Watertight mesh: ')+pick(r.watertight?'evet':'hayır',r.watertight?'yes':'no')+'.');
   if(r.minimumWallEstimateMm!==undefined)rows.push(pick('Kabuk offsetinden hesaplanan en düşük duvar tahmini: ','Minimum wall estimate from shell offset: ')+r.minimumWallEstimateMm+' mm'+(r.targetWallMm!==undefined?pick('; ayarlı hedef: ','; configured target: ')+r.targetWallMm+' mm':'')+'.');
   if(r.undercutRatio!==undefined)rows.push(pick('Giriş yönüne göre undercut örnek oranı: ','Undercut sample ratio for the insertion axis: ')+Number((r.undercutRatio*100).toFixed(2))+'%.');
   if(r.marginClosureGapMm!==undefined)rows.push(pick('Marjin kapanma aralığı: ','Margin closure gap: ')+r.marginClosureGapMm+' mm.');
   if(r.connectorWarnings!==undefined)rows.push(pick('Bağlayıcı uyarısı: ','Connector warnings: ')+r.connectorWarnings+'.');
   if(r.contactReference==='antagonist'){
    const counts=[];
    if(r.collisionSamples!==undefined)counts.push(r.collisionSamples+' '+pick('çakışan örnek','collision samples'));
    if(r.contactSamples!==undefined)counts.push(r.contactSamples+' '+pick('temas örneği','contact samples'));
    if(r.samples!==undefined)counts.push(r.samples+' '+pick('toplam örnek','total samples'));
    if(counts.length)rows.push(pick('Antagonist karşılaştırması: ','Antagonist comparison: ')+counts.join('; ')+'.');
    if(r.minimumSignedDistanceMm!==undefined)rows.push(pick('En küçük örneklenmiş işaretli mesafe: ','Minimum sampled signed distance: ')+r.minimumSignedDistanceMm+' mm.');
    rows.push(pick('Temaslar yüklü antagonist yüzeyine göre örneklenir; bu dinamik veya klinik oklüzyon onayı değildir.','Contacts are sampled against the loaded antagonist surface; this is not dynamic or clinical occlusion clearance.'));
   }
   for(const warning of r.warnings.slice(0,3))if(warning)rows.push(pick('Rapor uyarısı: ','Report warning: ')+warning);
  }
  if(!c.antagonistReady)rows.push(pick('Antagonist yüklü değil; kapanış teması veya çakışması değerlendirilmedi.','No antagonist is loaded; bite contact or collision was not evaluated.'));
  else if(r?.contactReference!=='antagonist')rows.push(pick('Antagonist yüklü, ancak güncel raporda antagonist karşılaştırması yok.','An antagonist is loaded, but the current report has no antagonist comparison.'));
  if(intent.topic==='wall'||r?.minimumWallEstimateMm!==undefined)rows.push(pick('Kabuk duvar değeri bir tahmindir. Kaynak mesafe haritası gerçek duvar kalınlığı ölçümü değildir.','Shell wall values are estimates. The source distance map is not a true wall thickness measurement.'));
 }
 if(failedSave)return finish();
 if(intent.topic==='save'){
  rows.push(pick(c.unsaved?'Kaydedilmemiş değişiklikler var.':'Kaydedilmemiş değişiklik bildirilmedi.',c.unsaved?'There are unsaved changes.':'No unsaved changes are reported.'));
  const exit=/cik|\bexit\b|\bclose\b/.test(intent.q);
  add(exit?'save-exit':'save',exit?'Mevcut kayıt ve çıkış akışını kullan; kayıt hatasında çalışma açık kalır.':'Mevcut projeyi kaydet; sonucu kayıt işlemi bildirecek.',exit?'Use the existing save-and-exit flow; a failed save keeps the workspace open.':'Save the current project; the save operation will report the result.');
  return finish();
 }
 if(intent.topic==='undo'||intent.topic==='redo'){
  const undo=intent.topic==='undo',count=undo?c.undoCount:c.redoCount;
  rows.push(pick(undo?'Geri alınabilir mesh işlemi: ':'Yinelenebilir mesh işlemi: ',undo?'Undoable mesh edits: ':'Redoable mesh edits: ')+count+'.');
  add(intent.topic,undo?'Mevcut undo geçmişinden bir mesh işlemini geri al.':'Mevcut redo geçmişinden bir mesh işlemini yinele.',undo?'Undo one mesh edit from the existing history.':'Redo one mesh edit from the existing history.');return finish();
 }
 if(!c.setupComplete){rows.push(pick('Önce iş tanımını tamamla; ünite, restorasyon ve materyali doğrula.','Complete the job definition first; confirm the unit, restoration and material.'));add('setup','Eksik iş tanımını mevcut panelde tamamla.','Complete the missing job definition in the existing panel.');return finish();}
 if(!c.sourceReady){rows.push(pick('Kaynak seçilmedi. Dosyalar adımında çalışma kaynağını seç.','No source is selected. Select the working source in Files.'));return finish();}
 if(!c.modelReady){rows.push(pick('CAD sahnesi henüz hazır değil. Model yüklenince durumu yeniden değerlendir.','The CAD scene is not ready yet. Review again after the model loads.'));return finish();}
 if(intent.topic==='visibility'){
  if(/izole|yalniz|isolate/.test(intent.q))add('isolate','Etkin restorasyonu mevcut görünürlük ayarlarıyla yalnız göster.','Show the active restoration alone using existing visibility controls.');
  else if(/kamera|camera|frame/.test(intent.q))add('fit-camera','Mevcut sahneyi kameraya sığdır.','Frame the current scene in the camera.');
  else add('show-all','Mevcut görünürlük ayarlarıyla tüm sahneyi göster.','Show the whole scene using the existing visibility controls.');return finish();
 }
 if(intent.topic==='library'){add('library','Seçili ünite için teknisyenin form kütüphanesini aç.','Open the technician form library for the selected unit.');return finish();}
 if(!c.visible){rows.push(pick('Etkin restorasyon görünmüyor; önce görünürlüğü geri getir.','The active restoration is hidden; restore visibility first.'));add('show-all','Gizli sahneyi yeniden göstererek yerleşimi kontrol et.','Restore the hidden scene before checking placement.');return finish();}
 if(c.marginPoints<3){rows.push(pick('Geçerli kole için en az 3 marjin noktası gerekli; mevcut nokta sayısı: ','A valid margin needs at least 3 points; current point count: ')+c.marginPoints+'.');add('tool-margin','Mevcut manuel marjin aracıyla kole çizgisini tamamla.','Complete the margin with the existing manual margin tool.');return finish();}
 if(!c.placed){rows.push(pick('Kole noktaları mevcut; restorasyon henüz koleye yerleştirilmemiş.','Margin points exist; the restoration has not yet been placed on the margin.'));add('place','Seçili restorasyonu mevcut koleye yerleştir; sonucu CAD işlemi doğrular.','Place the selected restoration on the existing margin; the CAD operation confirms the result.');return finish();}
 const topic=intent.topic||topicOf(fold(normalizeMemory(workingMemory).goal))||(c.task==='contacts'?'contact':'');
 if(topic==='wall'&&intent.topic!=='wall'&&!intent.review)rows.push(pick('Kabuk duvar değeri bir tahmindir. Kaynak mesafe haritası gerçek duvar kalınlığı ölçümü değildir.','Shell wall values are estimates. The source distance map is not a true wall thickness measurement.'));
 if(topic==='contact'&&(!(intent.review||intent.topic==='contact')||!r))rows.push(pick('Temas değerlendirmesi yüklü antagonist yüzeyine göre örneklenir; dinamik veya klinik oklüzyon onayı değildir.','Contact evaluation samples the loaded antagonist surface; it is not dynamic or clinical occlusion clearance.'));
 if(topic==='contact'){
  if(!c.antagonistReady){if(!rows.some(s=>s.includes(pick('Antagonist yüklü değil','No antagonist is loaded'))))rows.push(pick('Antagonist yüklü değil; Dosyalar adımında karşıt çene kaynağını doğrula. Temas sonucu çıkaramam.','No antagonist is loaded; confirm the opposing scan in Files. Contact results cannot be inferred.'));return finish();}
  if(c.openingMm>0&&/kapanis|bite/.test(intent.q))add('recorded-bite','İki yüklü çeneyi kayıtlı kapanışta göster; yeni hizalama veya oklüzyon çözümü yapmaz.','Show both loaded jaws in their registered bite; this does not perform a new alignment or solve occlusion.');
  add('view-contact','Yüklü antagoniste göre örneklenmiş temas mesafelerini göster.','Show sampled contact distances to the loaded antagonist.');
  if(!r||r.contactReference!=='antagonist')add('inspect','Güncel geometri ve mevcut antagonist karşılaştırmasını hesapla.','Calculate current geometry checks and the available antagonist comparison.');
 }else if(topic==='wall'){
  if(r?.minimumWallEstimateMm===undefined)rows.push(pick('Güncel raporda sayısal duvar tahmini yok.','The current report has no numeric wall estimate.'));
  add('view-thickness','Kaynak mesafesini gör; bu görünüm gerçek duvar kalınlığını ölçmez.','Inspect source distance; this view does not measure true wall thickness.');
  add('view-section','Şüpheli bölgeyi mevcut kesit görünümünde incele.','Inspect the area in the existing section view.');
  if(!r)add('inspect','Varsa kabuk offseti duvar tahminini içeren güncel kontrolü hesapla.','Calculate current checks, including shell offset wall estimates when available.');
 }else if(topic==='undercut'){
  add('view-undercut','Mevcut giriş yönüne göre undercut haritasını incele.','Inspect undercuts relative to the current insertion axis.');if(!r)add('inspect','Güncel undercut örneklerini ve geometri raporunu hesapla.','Calculate current undercut samples and geometry checks.');
 }else if(topic==='fit')add('internal-fit','Mevcut iç yüzey ayarlarını uygula; mesh işlemi mevcut undo geçmişine girer.','Apply the existing internal fit settings; the mesh edit uses the existing undo history.');
 else if(topic==='measure'){
  if(c.measurementsMm.length)rows.push(pick('Kaydedilmiş iki nokta ölçümleri: ','Recorded two-point measurements: ')+c.measurementsMm.join(', ')+' mm.');
  add('tool-measure','Mevcut iki nokta ölçüm aracını aç; ölçümü seçtiğin noktalar belirler.','Activate the existing two-point measure tool; the selected points determine the measurement.');
 }else if(['add','reduce','smooth'].includes(topic))add('tool-'+topic,'İstenen mevcut fırçayı seç; mesh değişikliği elle uygulanır ve geri alınabilir.','Select the requested existing brush; mesh edits are applied manually and support undo.');
 else if(topic==='margin')add('tool-margin','Yerleştirilmiş restorasyonun marjinini mevcut manuel araçla incele.','Inspect the placed restoration margin with the existing manual tool.');
 else if(!r)add('inspect','İlerlemeden önce mevcut ünite için gerçek geometri kontrolünü hesapla.','Calculate actual geometry checks for the current unit before proceeding.');
 else {
  const warnings=r.warnings.filter(s=>!['Temel mesh topoloji kontrolü temiz.','Crown shell temel topoloji ve wall kontrolleri temiz.'].includes(s));
  const concern=r.boundaryEdges>0||r.nonManifoldEdges>0||r.degenerateTriangles>0||r.components>1||r.watertight===false||r.connectorWarnings>0||r.collisionSamples>0||warnings.length>0||r.minimumWallEstimateMm!==undefined&&r.targetWallMm!==undefined&&r.minimumWallEstimateMm<r.targetWallMm;
  if(concern){rows.push(pick('Raporda gözden geçirilecek bulgular var. Önce ilgili bölgeyi incele; bu rapor üretim veya klinik onay değildir.','The report has findings to review. Inspect the relevant area first; this report is not production or clinical clearance.'));if(r.collisionSamples>0)add('view-contact','Raporda çakışan antagonist örnekleri var; mevcut temas haritasını incele.','The report includes antagonist collision samples; inspect the contact map.');add('view-section','Rapordaki bulguları mevcut kesit görünümüyle gözden geçir.','Review the report findings with the existing section view.');}
  else if(c.task!=='review')add('next','Yalnız mevcut iş akışının kapıları izin veriyorsa bir sonraki göreve geç.','Advance one existing workflow task only if its gates allow it.');
  if(c.unsaved)add('save','Mevcut değişiklikleri kaydet; başarıyı gerçek kayıt sonucu belirler.','Save the current changes; the actual save result determines success.');
 }
 if(!proposals.length)rows.push(pick('Bu istek için şu anda kullanılabilir yeni bir işlem önerisi yok; etkin araç ve aşama kapılarını kontrol et.','There is no new available action for this request; check the active tool and workflow gates.'));
 return finish();
}
module.exports={suggestCadReply};
