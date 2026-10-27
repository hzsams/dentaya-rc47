export function ayaAcceptanceText(locale:string){
 const tr=locale==='tr';
 return {
  title:tr?'Model kabul oturumu':'Model acceptance session',hint:tr?'Seçili modele 9 ayrı deneme gönderir: konuşma, bellek sözleşmesi ve örnek CAD bağlamı. Sorular sentetiktir; sohbet geçmişi, kişisel notlar ve gerçek CAD işlemleri bu oturuma girmez.':'Sends 9 trials to the selected model: conversation, memory contract and sample CAD context. Prompts are synthetic; chat history, personal notes and real CAD operations are excluded.',
  review:tr?'Kontroller yalnız yanıt sözleşmesini ve sınırlı sinyalleri sınar. Yanıtların doğruluğu ve bağlama uygunluğu insan incelemesi gerektirir; AI puanı veya üretim onayı değildir.':'Checks cover reply contracts and limited signals. Correctness and contextual relevance require human review; this is not an AI score or production approval.',
  start:tr?'Kabul oturumunu başlat':'Start acceptance session',cancel:tr?'Kabul oturumunu durdur':'Stop acceptance session',export:tr?'Kabul kaydını dışa aktar':'Export acceptance record',running:tr?'Seçili model çalışıyor':'Selected model is running',stopping:tr?'Motorun durması bekleniyor…':'Waiting for the runtime to stop…',cancelled:tr?'Oturum durduruldu. Tamamlanan yanıtlar incelenebilir.':'Session stopped. Completed replies can be reviewed.',failed:tr?'Oturum tamamlanamadı.':'Session could not be completed.',completed:tr?'Oturum tamamlandı. Yanıtları inceleyin.':'Session completed. Review the replies.',
  awaiting:tr?'Önce kurulu bir model seçin.':'Select an installed model first.',engineBusy:tr?'Yerel motor başka bir işlemde. İşlemin bitmesini bekleyin.':'The local runtime is busy. Wait for the current operation to finish.',progress:tr?'Kabul oturumu ilerlemesi':'Acceptance session progress',transcript:tr?'Tam soru ve yanıt kaydı':'Full prompts and replies',prompt:tr?'Soru':'Prompt',reply:tr?'Yanıt':'Reply',empty:tr?'Yanıt alınamadı.':'No reply received.',contract:tr?'Sözleşme':'Contract',signal:tr?'Sınırlı sinyal':'Limited signal',pass:tr?'geçti':'passed',fail:tr?'geçmedi':'did not pass',conversation:tr?'Konuşma':'Conversation',memory:tr?'Bellek sözleşmesi':'Memory contract',cad:tr?'Örnek CAD bağlamı':'Sample CAD context',
 };
}
export function ayaAcceptanceCheckText(locale:string,id:string){
 const labels:Record<string,readonly[string,string]>={
  'nonempty-local-reply':['Boş olmayan yerel yanıt','Nonempty local reply'],
  'local-reply-completed':['Yerel yanıt tamamlandı','Local reply completed'],
  'aya-identity-mentioned':['AYA adı yanıtta','AYA name in reply'],
  'natural-reply-has-no-tool-plan':['Doğal yanıtta araç planı yok','Natural reply has no tool plan'],
  'unrelated-request-not-forced-to-dentistry':['Farklı konu diş hekimliğine zorlanmadı','Unrelated request was not forced into dentistry'],
  'unique-job-code-retained':['Özgün iş kodu yanıtta','Unique job code in reply'],
  'memory-returned':['Bellek yanıtı alındı','Memory response returned'],
  'unique-job-code-in-memory':['Özgün iş kodu bellekte','Unique job code in memory'],
  'memory-cannot-propose-cad-actions':['Bellek işlemi CAD eylemi önermiyor','Memory operation has no CAD proposals'],
  'memory-only-job-recalled':['İş kodu yalnız bellekten hatırlandı','Job code recalled from memory alone'],
  'memory-only-unit-recalled':['Ünite yalnız bellekten hatırlandı','Unit recalled from memory alone'],
  'memory-only-contour-recalled':['Kontur kararı yalnız bellekten hatırlandı','Contour decision recalled from memory alone'],
  'only-goal-cleared':['Yalnız hedef temizlendi','Only the goal was cleared'],
  'decisions-preserved':['Kararlar korundu','Decisions preserved'],
  'questions-preserved':['Açık sorular korundu','Open questions preserved'],
  'typed-proposals-match-fixture':['Araç önerileri deneme bağlamına uygun','Tool proposals match the sample context'],
  'missing-antagonist-mentioned':['Eksik antagonist açıklandı','Missing antagonist mentioned'],
  'save-failure-mentioned':['Başarısız kayıt açıklandı','Failed save mentioned'],
 };
 return labels[id]?.[locale==='tr'?0:1]??id;
}
