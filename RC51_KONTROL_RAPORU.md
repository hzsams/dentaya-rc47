# RC51 kontrol raporu

Sürüm: `1.0.0-rc.51`; AYA Core: `0.8.0`. Tarih: 20 Ekim 2026. Temel sürüm RC50. Bu kaynak güncellemesi, kullanıcının web sitesi hissini kaldırıp masaüstü CAD uygulaması düzeni kurma isteğini uygular. Özgün DentAYA varlıkları kullanılır; exocad/3Shape ergonomik referanstır.

## Uygulanan arayüz kapsamı

- Ortak uygulama çerçevesi: 48 piksel üst çubuk ve belge sekmeleri, geniş ekranda 208 piksel modül paneli, CAD dışındaki ekranlarda 24 piksel durum çubuğu. Ekran içeriği kendi alanında kayar. Dar ekranlar modül menüsüyle çalışır.
- İş yöneticisi: kompakt araç çubuğu, modül erişimi, mevcut kurum kayıtlarıyla vaka/teslimat kuyruğu, arama ve filtreler, günlük işler ve bildirimler. Gerçek kayıt yokken örnek veri veya dolu sayaç gösterilmez. Oturum ve kurum erişim koşulları korunur.
- CAD: nesneler solda, baskın 3B alan ortada, görevin özellikleri sağda. Görev aşamaları üstte görünür kalır. Özellik paneli varsayılan olarak kenara bağlıdır; taşıma, kayıtlı serbest konum, yeniden bağlama ve sıfırlama seçenekleri korunur.
- Modül menüsü Alt+M, mevcut hızlı navigasyon Ctrl+K ve görünüm tercihleri Ctrl+, ile erişilir. Yerel tema, marka, dil ve hareket tercihleri kullanılır. Ağ göstergesi gerçek tarayıcı ağ durumuna bağlıdır; sunucu kaydı başarısı gibi sunulmaz.
- CAD kernel ve veri modeli korunur. Yeni modül sekmeleri mevcut kaydet/çık akışına bağlanır; başarılı kayıt yanıtı gelmeden hedef modüle geçilmez. Kayıt hatasında CAD açık kalır; yerel çıkış ve yeniden deneme seçilen hedefi korur. İmplant koleye yerleştirme, ünite geçişi, şekillendirme, geri alma, kayıt/çıkış ve yerel kurtarma korunacak kabul akışlarıdır.

Yerel kurtarma kontrolü yalnız zaman damgasına dayanmaz. Salt okunur `isCadRecoveryDraftAcknowledged` denetimi; proje/kaynak kimliği, tam çalışma alanı, düzenlenebilir ayarlar, kole, ölçümler, aşama ve durumu sunucunun onayladığı içerikle karşılaştırır. Özellikle saklanan, daha yeni veya farklı içerikli taslaklar; eski biçimli ve bozuk kayıtlar onaylanmış sayılmaz. Cihaz saati geriye gitse de sonraki yerel yazma korunur. Bekleyen kurtarma seçimi, kullanıcı açıkça **Geri yükle** veya **Vazgeç** demeden kaydetme ve modül geçişini engeller.

Hazır olma durumu aktif kurtarma anahtarına bağlıdır. Yerel IndexedDB sorgusu bitmeden manuel/otomatik kayıt ve modül geçişi bekler; AYA'nın CAD bağlamı hazır sayılmaz. Günlük CAD tarayıcı kontrolünde sorgu 1100 milisaniyeden uzun geciktirildiğinde sunucuya PATCH gönderilmediği ve geçiş yapılmadığı doğrulandı.

Yeni masaüstü metinleri TR/EN ve diğer diller için İngilizce fallback kullanır; mevcut 46 dil paketi korunur. AYA Core, yerel model önceliği, çalışma belleği ve kullanıcı tıklamasına bağlı tipli CAD araçları RC50 davranışını sürdürür.

## Doğrulama durumu

**RC51 kaynak doğrulaması tamamlandı.** Sekiz tarayıcı kontrolü ve tam `npm run verify` zinciri geçti. Aşağıdaki sonuçlar mevcut RC51 çalıştırmalarına aittir; Windows, gerçek model ve canlı kurum kabulünün sınırları ayrıca belirtilir.

| Kontrol | RC51 durumu |
| --- | --- |
| Gerçek rotalarda masaüstü düzeni, klavye, tema, RTL, dar ekran ve ağ durumu | Geçti: 6 rota, 22 yerleşim örneği, sıfır sayfa hatası |
| Profesyonel çerçeve tarayıcı regresyonu | Geçti: 14,49 saniye; sıfır sayfa hatası |
| Profesyonel modül tarayıcı regresyonu | Geçti: 26,81 saniye; finans/mesajlaşma eşzamanlılık ve taslak kontrolleri, dar ekranda mesaj yazma alanı |
| Kılavuzlu CAD tarayıcı kontrolü | Geçti: 342 saniyelik çalıştırma |
| Gerçek Three.js CAD sahnesinde günlük iş akışları | Geçti: 154,98 saniye; implant yerleşimi, ünite geçişi, şekillendirme/geri alma, sunucu kaydından yeniden açma, kaydet/çık, eşzamanlı kayıt çakışması ve kurtarma karar kapıları |
| Uzman CAD tarayıcı kontrolü | Geçti: 393,49 saniye; gerçek WebGL, panel yerleşimi, manuel şekillendirme/geri alma, kamera sığdırma, dar ekran; EN/DE/AR/TR değişimlerinde sahne/geçmiş koruma ve üç paletin gerçek sahneye yansıması |
| AYA sohbet tarayıcı regresyonu | Geçti: 26,46 saniye; yerel model köprüsü mock, gerçek model çıkarımı değil |
| 46 dilde görünüm tarayıcı kontrolü | Geçti: 120,41 saniye; tema, kalıcı tercih, dışa aktarma/geri alma ve dar ekran |
| `verify:cad-daily` ve değişen dosyalarda hedefli ESLint | Geçti; kurtarma karşılaştırması ve yerel taslak koruma kontrolleri dahil |
| Tam `npm run verify`, sıfır uyarılı ESLint, tip kontrolü ve üretim derlemesi | Geçti: CAD/AYA, güvenlik, çeviriler, PGlite veritabanı ve iş akışları; 38/38 statik sayfa |
| Nihai kaynak manifesti | Geçti: 1.100 kaynak dosyasının boyutları ve SHA-256 değerleri `node scripts/verify-source-integrity.mjs` ile doğrulandı |
| Yayımlanan GitHub ZIP indirme kabulü | Yayım sonrası ayrı teslim kontrolüdür; arşiv indirilip açılır ve aynı manifest yeniden doğrulanır |

`npm run verify:desktop-shell-browser` gerçek uygulama rotalarını sentetik Supabase HTTP yanıtlarıyla açar. Kayıt gönderimi yerine geri alınabilir arayüz eylemlerini, görünürlük ve ölçüleri kontrol eder. Bu, canlı kurum veya çok kullanıcılı kabul testi değildir. CAD günlük tarayıcı kontrolü mevcut geometri sahnesinde ayrı yürütülür. Sekiz çalıştırmanın komutları, süreleri ve sonuçları [browser-results.json](verification/RC51/browser-results.json), tam zincir [verify.txt](verification/RC51/verify.txt) ve ekran kanıtları `verification/RC51/` altındadır. Temiz uzman ekranı ayrıca yeni bir gerçek CAD oturumunda kadraj ve çizim kareleri beklendikten sonra alınmıştır; [cad-capture.txt](verification/RC51/cad-capture.txt) bu oturumu kaydeder.

## Tamamlanmayan kabul işleri

- Gerçek Windows kurulumunda yerel pencere, ekran ölçeği ve paket kabulü bu Linux ortamında doğrulanmadı. Windows Setup EXE üretilmiş veya çalıştırılmış sayılmaz; teslim kaynak güncellemesidir.
- Gerçek GGUF çıkarımı, Türkçe model kalitesi ve donanım hızı bu arayüz çalışmasının doğrulaması değildir. AYA Core genel dil modeli değildir; her yeni serbest cümleyi anladığı iddia edilmez.
- Canlı kurum/Supabase, çok kullanıcılı akış, gerçek hasta/tarama, klinik ve üretim hassasiyeti kabulü yapılmadı. Önceki sürümlerde açıklanan modül sınırları devam eder.
- Gerçek kısa bilgi kartı sayısı 220, ayrı AYA soru kataloğu 1008 kayıttır. 30.000 içerik hedefi tamamlanmadı; kapasite testleri gerçek içerik sayısı değildir.

Model ağırlıkları, kişisel `.env.local`, sırlar, bağımlılık/derleme klasörleri ve geçici tarayıcı sayfaları teslimata girmez. Web sitesi deposuna dağıtım yapılmaz.
