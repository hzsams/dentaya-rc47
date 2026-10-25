'use strict';
// Read-only advice for current triangle/plane evidence. No CAD callback runs here.
const {normalizeWorkspace}=require('./agent.cjs');
const fold=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
const sectionTopic=q=>/\b(?:kesit\p{L}*|(?:cross[ -]?)?section\p{L}*)\b/u.test(q);
function sectionRequest(prompt){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000||/[\r\n\u2028\u2029]/.test(prompt))return false;
 const q=fold(prompt).trim();
 if(!sectionTopic(q))return false;
 // Quoted/written instructions and clinical requests belong to the normal router.
 if(/^[\s]*["'“‘«`>#*-]|["“”‘«»`]/u.test(prompt)||/(?:^|\s)'[^']+'(?:\s|[,.!?;:]|$)/u.test(prompt)||/cevir|tercume|translat|siir|poem|hikaye|story|cumlesi|kelimesi|sentence|taslak|draft|olustur|hazirla|compose|generate|invitation|davet|meeting|toplanti|email|mektup|\byaz\p{L}*\b|\bwrite\b/u.test(q))return false;
 if(/tork|torque|cerrahi|surgical|ilac|dosage|diagnos|teshis|tedavi|treatment|klinik|clinical|hasta|patient/.test(q))return false;
 if(/kaydet|\bsav(?:e|ing)\b|geri al|\bundo\b|\bredo\b|yerlestir|\bplace\b|firca|\bbrush\b|\bdelete\b|\bexport\b|disari aktar/.test(q))return false;
 if(/\b(?:do not|don['’ ]?t|never|avoid|stop|cancel|no need)\b|istemiyorum|istemiyoruz|istemem|istemeyiz|gerek yok|gerekmiyor|birak|vazgec|iptal/.test(q)||/\b(?:gosterme|acma|inceleme|yorumlama|degerlendirme|hesaplama|analiz etme|aciklama|onerme|uygulama|kaydetme|olcme|yapma|etme)(?:yelim|yalim|yin|yiniz)?(?:(?:\s+(?:lutfen|artik))?[.!?]*$|[,;]|\s+(?:ve|ama)\b)/.test(q))return false;
 const current=/\b(?:bu|guncel|mevcut|etkin|aktif|this|current|active|displayed|shown)\b/.test(q);
 if(!current&&!/\bkesit\p{L}*\b|\bcross[ -]?section\p{L}*\b|\b(?:area|length|contour|view|plane|measurement)\p{L}*\b/u.test(q))return false;
 if(/ne demek|ne anlama|tanimi|terimi|\bdefine\b|definition/.test(q)||/nedir|what (?:is|are)/.test(q)&&!current)return false;
 const requested=q=>/incele|yorumla|degerlendir|acikla|kontrol|analiz|sonuc|bulgu|olcum|kac|ne kadar|neden|nasil|goster|\bac(?:abilir|alim|ar)?\b|review|interpret|explain|evaluate|analy[sz]|result|finding|measure|\bhow\b|\bwhat\b|\bwhy\b|\bshow\b|\bopen\b|\bprove\b|kanitliyor|\bstatus\b|\bstate\b|durum/.test(q)||/\b(?:bu|guncel|mevcut|this|current|active|displayed|shown)\b/.test(q)&&/alan|uzunluk|kontur|contour|area|length/.test(q);
 if(!requested(q))return false;
 const parts=q.split(/\s+(?:ve|sonra|ardindan|ayrica|and|then|ama|but)\s+|[!?;]+|(?<!\d)[.,]|[.,](?!\d)/u).map(s=>s.trim()).filter(Boolean);
 // Only an explicit section clause or a narrow reference to its measured
 // properties may share this response. Never partially answer another task.
 const property=q=>/^(?:(?:acikla|yorumla|incele|degerlendir|goster)\s+)?(?:bu(?:nun)?\s+)?(?:alan|uzunlu[kg]|kontur|cevrim)\p{L}*(?:\s+(?:alan|uzunlu[kg]|kontur|cevrim)\p{L}*){0,2}(?:\s+(?:acikla|yorumla|incele|degerlendir|goster|olc|kac|ne kadar))?(?:\s+lutfen)?$/u.test(q)||/^(?:(?:explain|interpret|review|show|measure)\s+)?(?:(?:its|the|this)\s+)?(?:current\s+)?(?:area|length|contours?|closed loops?)(?:\s+(?:area|length|contours?|closed loops?)){0,2}(?:\s+please)?$/.test(q);
 return parts.every(part=>sectionTopic(part)&&requested(part)&&!/\bsection\s+\d+\b/.test(part)||property(part));
}
function suggestSectionReply(prompt,{cadContext=null,locale='tr'}={}){
 if(!sectionRequest(prompt))return null;
 const c=normalizeWorkspace(cadContext);if(!c)return null;
 const tr=locale==='tr',pick=(a,b)=>tr?a:b,rows=[],proposals=[];
 const section=c.section;
 const numeric=n=>String(Number(n.toPrecision(6)));
 const issues={open:['açık kontur','open contour'],branch:['dallanan kontur','branched contour'],coplanar:['düzlemle çakışan yüzey','coplanar surface'],'self-intersection':['kesişen kontur','intersecting contour'],'duplicate-face':['çakışan yüzey','overlapping surface'],truncated:['sınırlandırılmış hesap','bounded calculation'],complex:['karmaşık kontur','complex contour'],invalid:['geçersiz veri','invalid data']};
 if(section&&(section.restoration||section.source)){
  for(const [key,a,b] of [['restoration','Restorasyon kesiti','Restoration section'],['source','Kaynak kesiti','Source section']]){
   const part=section[key];if(!part)continue;
   const area=part.areaMm2!==null&&part.closedLoops>0&&!part.issues.length;
   rows.push(pick(a,b)+': '+pick('kontur uzunluğu ','contour length ')+numeric(part.lengthMm)+' mm; '+(area?pick('kapalı alan ','closed area ')+numeric(part.areaMm2)+' mm²':pick('güvenilir kapalı alan kullanılamıyor','reliable closed area unavailable'))+'; '+pick('kapalı çevrim ','closed loops ')+part.closedLoops+'.');
   if(!area&&part.issues.length){
    const labels=[...new Set(part.issues.map(code=>issues[code]?.[tr?0:1]).filter(Boolean))].slice(0,3);
    if(labels.length)rows.push(pick('Alan sınırı: ','Area limit: ')+labels.join(', ')+'.');
   }
  }
  if(!section.restoration)rows.push(pick('Restorasyon için bu düzlemde güncel kesit ölçümü yok; İnceleme panelinde kesit düzlemini kontrol et.','There is no current restoration section measurement for this plane; check the section plane in the inspection panel.'));
  if(!section.source)rows.push(pick('Kaynak için bu düzlemde güncel kesit ölçümü yok; İnceleme panelinde kesit düzlemini kontrol et.','There is no current source section measurement for this plane; check the section plane in the inspection panel.'));
  if(section.source&&section.sourceSimplified)rows.push(pick('Kaynak ölçümü ekranda gösterilen sadeleştirilmiş tarama önizlemesine aittir; tam çözünürlüklü tarama ölçümü değildir.','Source measurements describe the displayed simplified scan preview, not the full-resolution scan.'));
 }else {
  rows.push(pick(!c.sourceReady||!c.modelReady?'Kaynak modeli yükle; bu çalışma için güncel kesit ölçümü yok.':c.view==='section'?'İnceleme panelinde kesit düzlemini kontrol et; bu çalışma için güncel kesit ölçümü yok.':'İnceleme panelinde Kesit görünümünü aç; bu çalışma için güncel kesit ölçümü yok.',!c.sourceReady||!c.modelReady?'Load the source model; there is no current section measurement for this workspace.':c.view==='section'?'Check the section plane in the inspection panel; there is no current section measurement for this workspace.':'Open Section in the inspection panel; there is no current section measurement for this workspace.'));
  if(c.sourceReady&&c.modelReady)rows.push(pick('Uzman modunda İnceleme → Kesit → Kesit çizgileri ve ölçümleri seçeneğini aç ve düzlemi kontrol et.','In expert mode, open Inspection → Section → Section contours and measurements, then check the plane.'));
  if(c.sourceReady&&c.modelReady&&!c.isSaving){
   const tool=c.view!=='section'&&c.availableTools.includes('view-section')?'view-section':c.availableTools.includes('inspection')?'inspection':null;
   if(tool)proposals.push({tool,reason:pick(tool==='view-section'?'Mevcut kesit görünümünü aç ve seçili düzlemi kontrol et.':'Mevcut inceleme panelinde kesit düzlemini kontrol et.',tool==='view-section'?'Open the existing section view and check the selected plane.':'Check the section plane in the existing inspection panel.'),scope:c.scope,snapshot:c.snapshot});
  }
 }
 rows.push(pick('Kesit alanı ve kontur uzunluğu, duvar kalınlığı veya iç yüzey/klinik uyum ölçümü değildir.','Section area and contour length do not measure wall thickness, intaglio fit or clinical fit.'));
 rows.push(pick('Çalışma ünitesi: ','Working unit: ')+(c.unit||'—')+'.');
 if(proposals.length)rows.push(pick('Öneri yalnız Uygula düğmesine bastığında çalışır; güncel çalışma tekrar denetlenir.','The suggestion runs only when you click Apply; the current workspace is checked again.'));
 return {ok:true,engine:'core',output:rows.join('\n'),references:[],proposals};
}
module.exports={suggestSectionReply};
