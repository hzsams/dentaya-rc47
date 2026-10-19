# DentAYA MVP Öğrenim Yolu

Bu belge yeni bir klinik, laboratuvar veya kurye kullanıcısının DentAYA'yı kısa sürede öğrenmesi için eğitim sırasını tanımlar. İnteraktif karşılığı uygulama içindeki **Öğrenim Rehberi (`/start`)** ekranıdır.

## Eğitim prensibi

Kullanıcıya tüm platform aynı anda öğretilmez. Önce kendi rolünün günlük işi, sonra rolüne bağlı destek modülleri gösterilir. Eğitim sırasında gerçek hasta yerine sentetik test vakası kullanılması önerilir.

## Klinik — 30 dakikalık başlangıç

**0–5 dk:** Lobi, Hızlı Git, Hasta ve Vaka ayrımını öğren.  
**5–10 dk:** Sentetik bir hasta oluştur ve STL/PLY taramasını Tarama Stüdyosu'ndan bağla.  
**10–15 dk:** Laboratuvara atanmış bir vaka oluştur; FDI, materyal, renk ve termini tamamla.  
**15–20 dk:** Vaka mesajı gönder ve laboratuvar tasarım review akışını gör.  
**20–25 dk:** Klinik hasta fiyatı/ödeme alanını incele; lab fiyatından farkını öğren.  
**25–30 dk:** AYA'da vaka özeti, eksikler ve sonraki adım komutlarını dene.

Başarı ölçütü: Kullanıcı vakayı oluşturup, tarama bağlayıp, teknik mesajı ve klinik review kararını nereden vereceğini biliyor.

## Laboratuvar — 40 dakikalık başlangıç

**0–5 dk:** Lab Merkezi ve Vakalar ayrımını öğren.  
**5–10 dk:** Atanmış vaka girdilerini doğrula.  
**10–15 dk:** Lab taramasını vakaya bağla.  
**15–30 dk:** DentAYA Design'da Scan → Margin → Axis → Anatomy → Contacts → QC → Review sırasını uygula.  
**30–35 dk:** Tasarım versiyonunu review'a gönder ve revizyon/onay mantığını öğren.  
**35–40 dk:** Lab fiyatı ile teslimat modülünü tamamla.

Başarı ölçütü: Kullanıcı atanan vakayı bulup CAD çalışma alanını açabiliyor, bir versiyonu review'a gönderebiliyor ve sonraki üretim/teslimat adımını biliyor.

## Kurye — 10 dakikalık başlangıç

**0–3 dk:** Lojistik ekranında atanmış gönderiyi bul.  
**3–7 dk:** Alım → yolda → teslim durumlarını öğren.  
**7–10 dk:** Bildirimleri ve teslim kapanışını kontrol et.

Başarı ölçütü: Kullanıcı yalnız fiziksel teslimat görevini ilerletebiliyor ve klinik/CAD verisine ihtiyaç duymadan işini tamamlayabiliyor.

## AYA eğitimi — tüm roller

AYA'ya önce hazır komutlarla başlayın:

1. “Bu vakayı özetle.”
2. “Eksik bilgi ne?”
3. “Sıradaki operasyonel adım ne?”
4. “CAD/review durumu ne?”
5. “Teslimat ne durumda?”

AYA çıktısının klinik karar olmadığını özellikle öğretin. Bulut AI modu açıksa serbest prompt içine doğrudan kimlik verisi yazmayın.

## Eğitmen için pilot kontrolü

Eğitim sonunda şu soruların cevabı kullanıcı tarafından ekrana bakmadan açıklanabilmelidir:

- Vaka listesi nerede?
- Tarama nasıl doğru vaka/hastaya bağlanır?
- Klinik ve laboratuvar fiyatlarının farkı nedir?
- CAD review kararını kim verir?
- AYA ne yapar, ne yapmaz?
- Teslimat hangi modülden takip edilir?
- Sistem problemi olduğunda hangi iki sayfa açılır? (`/pilot-check`, `/release-check`)
