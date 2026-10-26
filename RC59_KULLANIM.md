# DentAYA RC59 kullanım

Sürüm `1.0.0-rc.59`, AYA Core `0.15.0`. Bu paket tam kaynak güncellemesidir; RC58 veya önceki sürümler ayrı kurulmaz. Mevcut verilerinizi, `.env.local` ve kişisel ayarlarınızı koruyun. Windows derleme adımları [KURULUM.txt](KURULUM.txt) içindedir; kaynak ZIP hazır Windows EXE içermez.

## AYA sohbeti ve çalışma belleği

Yerel model hazırken normal sorular, yeni ifadeler ve takipler modele gider. Model yoksa Core rehberi ayrı motor etiketiyle kullanılabilir. Yerel sohbet API anahtarı veya DentAYA hesabı istemez; otomatik bulut geçişi yoktur. **Sohbet ayarları → Yerel motor** bölümünden motor/model kurulumu, model seçimi ve konuşmadan yalıtılmış **Yerel yanıtı test et** kontrolü kullanılabilir.

Hedef, kararlar ve açık sorular çalışma belleğinde görülebilir ve açıkça düzenlenebilir. Bunlar model eğitimi değildir. Geçmiş saklama isteğe bağlıdır. Uzun bir geçmiş mesajı kısaltıldığında başlangıç ve son düzeltmeler birlikte korunur; atlanan orta bölüm işaretlenir. Token bütçesi sınırlıdır; her eski ayrıntının modelde bulunacağı garanti edilmez.

Başka pencerede aynı saklanan sohbet değişmiş veya silinmişse bu pencereden gelen eski çalışma sessizce üzerine yazılmaz. Uyarıdaki **Saklanan sohbeti yükle** güncel kaydı açar; yazılmamış mesajınız korunur. **Bu çalışmayı ayrı sohbete kaydet** bu penceredeki konuşmayı ve belleği yeni bir kayıt olarak saklar. Silinen konuşma kendiliğinden geri oluşturulmaz. Geçmiş saklamayı kapatmak bu tercihi sonraki kayıtta da uygular.

## CAD içinde AYA

Mevcut AYA paneli proje/kaynak/ünite kapsamında çalışır. Paneli kapatıp aynı üniteyi açtığınızda yazılmamış taslak korunur. Yanıt beklerken kapatırsanız sorunuz yeniden denemek için geri gelir; eski yanıt yeniden açılmış paneldeki yeni yazınızı değiştirmez. Gerçek geometri kontrolünden sonraki tek sonuç yorumu taslağınızı tüketmez; hata veya iptal bunu sentetik kontrol sorusuyla değiştirmez. Motorun bellek, model, kitaplık veya izin sorunu güvenli açıklamayla gösterilir.

Öneriler yalnız mevcut 27 tipli aracı kullanır ve **Uygula** tıklaması gerektirir. Kaynak/ünite/geometri değişmişse eski öneri uygulanamaz. Kaydetme, yerleştirme, geri alma ve diğer işlemler mevcut deterministik CAD kodunu kullanır. Koleye yerleşme veya görünen kesit, iç uyum ve üretim onayı değildir.

## Korunan görünüm ve modüller

Sol üst **Modüller** listesinde klasör ve alt klasör düzeni sürer. Robot kaldırılmıştır; gerekli kurum metrikleri **Yönetim → İşler ve finans → İş takibi** altındadır. CAD'e ikinci başlık veya sahne eklenmez.

**Ayarlar → Görünüm** arka plan adları: **Neon Midnight**, **Graphite Turquoise**, **Deep Turquoise**, **Deep Coral**. Önceki seçimler korunur. Paletler uygulama ve CAD zemini içindir; mini oyunlara özel değildir. Yüklemede zorunlu beş saniye beklemesi yoktur.

Güncel gerçek sonuçlar ve tamamlanmayanlar [RC59_KONTROL_RAPORU.md](RC59_KONTROL_RAPORU.md) içindedir. Gerçek yerel model anlamsal kabulü, Windows EXE ve canlı kurum/klinik kabulü kaynak testlerinden ayrı değerlendirilir. 500 gerçek bilgi kartı, 60 kaynak, 1008 soru kataloğu, 120 hacim etkili SVG logo, 5 oyun ve 72 görünüm korunur; 30.000 gerçek içerik ve exocad eşdeğerliği tamamlandı diye sunulmaz.
