# RC53 kontrol raporu

Sürüm: `1.0.0-rc.53`; AYA Core: `0.9.0`. Tarih: 21 Ekim 2026. Temel sürüm RC52. RC53; AYA bağlamı/belleği, kaynaklı bilgi, uzman inceleme ve 100 marka seçeneğini geliştirir. Gerçek sonuçlar ve doğrulanmayan alanlar aşağıdadır. RC52 sonuçları tarihsel kayıttır.

## Kaynak değişikliğinin kapsamı

- **Model bağlamı ve kanıt:** Normal konuşmanın mevcut yerel model önceliği korunur. Kısa takiplerde güncel istek, son ilgili kullanıcı konusu ve çalışma hedefinden sınırlı sorgu genişletmesi yapılır. Uygulama belgeleri, ayrı 1008 soru-cevap kataloğu ve ortak 500 kartlık kaynak, yanıt üretimine kanıt sağlayabilir. Bunlar yeni hazır yanıt yönlendirmesi veya temel model eğitimi değildir. Yeni konu eski konuya göre önceliklidir; belirsiz genel “risk” sözcüğü kendi başına ilgisiz klinik kartları seçmez.
- **Çalışma belleği:** Yapılandırılmış model yanıtındaki boş hedef/karar/soru alanları önceki belleği kendiliğinden silmez. İsteğe bağlı `memoryUpdate` alanı birleştirme, tam revizyon veya açık sıfırlamayı ayırır; mevcut beş zorunlu yanıt alanı korunur. Model kaynaklı sıfırlama yalnız son kullanıcı mesajındaki açık TR/EN bellek komutuyla kabul edilir. Not, belge ve önceki konuşma sıfırlama yetkisi vermez. Doğrudan bellek düzenleme ve geçmiş saklama tercihleri korunur.
- **Geçmiş ve token bütçesi:** İlk hedef, en yeni konuşma çifti ve ilgili eski konuşma çiftleri sınırlı bağlama alınır. Gerekince ilgisiz eski çiftler birlikte çıkarılır; isteğe bağlı kanıt azaltılır, ardından saklanan uzun geçmişin ortası kısaltılır. Güncel istek, çalışma belleği ve gerçek CAD kanıtı bu işlemde kesilmez. Yönetilen motor kendi tokenizer sonucunu, Ollama yolu muhafazakâr UTF-8 sınırını kullanır. Sığmayan indirgenemez girdi hata verir. Bütçeden çıkarılan kanıtın referansı döndürülmez.
- **Kaynak gösterimi:** Ana sohbet ve CAD sohbeti seçilen kaynakları açılır alanda gösterir. Geçerli uygulama içi yollar ve güvenli HTTPS bağlantıları sınırlanır; tekrarlı/geçersiz bağlantılar elenir. İzinli kaynaklar kayıtlı sohbet geçmişinde korunur. Referanslar modelin ürettiği rastgele URL'lerden kurulmaz. Kaynak gösterimi yanıtın tamamı için doğruluk veya klinik onay iddiası değildir.
- **Uzman CAD incelemesi:** Mevcut Three.js sahnesine ışık/yüzey/kesit/kamera sekmeli inceleme paneli eklenir. Gerçek kamera konumlu SpotLight, görünüm merkezi veya görünür yüzeyde işaretçi hedefi, ışık gücü/açı/pozlama; restorasyon kenarları, en çok 240 örnek normal, düz gölgeleme ve iç yüzey görünümü; eksen/giriş yönü, ters kesit ve merkez referansı; odaklanma ve 90° kamera dönüşleri bulunur. Görsel katmanlar mevcut geometrinin yerini almaz.
- **Tıklamayla araç kullanımı:** İzin listesi 24'ten **27 tipli CAD aracına** çıkar. Yeni `inspection`, `flashlight-on`, `flashlight-off` görsel komutları uzman modunda kullanılabilir; ışık durumu gerçek hosttan gelir. Kullanıcı tıklaması, mevcut kullanılabilirlik, scope/snapshot ve geç gelen yanıt kontrolleri korunur. Modelin kod, shell veya rastgele geometri/ışık parametresi yürütmesi eklenmez.
- **Gerçek içerik:** Ortak JSON'da **500 ayrı TR/EN kart ve 60 kaynak** bulunur. Önceki 220 kayıt korunur; yeni 280 kayıt `dental-221`–`dental-500` kimliklerini kullanır. Open3D v0.19.0'dan 9 belge/140 kart, Three.js r186'dan 23 belge/140 kart eklenir. Yeni kayıtlarda belge pasajı, sabit kaynak URL'si, atıf ve lisans bilgisi bulunur. Ayrı 1008 soru-cevap kataloğu genişletilmiş model zekâsı diye sunulmaz. `clinicalReviewStatus: not-recorded` korunur. [Kaynak kaydı](BILGI_KARTLARI_RC53_KAYNAKLAR.md) ayrıca verilir.
- **Marka:** Ortak katalog **100 özgün logo** seçeneğini, web/masaüstü izin listesini ve SVG/PNG/ICO varlıklarını besler. Zümrüt, yeşim, titanyum ve şampanya katmanları ışık/gölgeyle kabartma hissi verir. Bunlar gerçek 3B mesh veya animasyon değildir. Eski 01–18 kimlik ve dosya kökleri korunur. Logo arama, önizleme, tercih kaydı ve Windows kısayol yolu mevcut akıştadır.
- **Paketleme ve mevcut iş:** Electron paketlemesi AYA'nın ortak kart JSON'unu içerir. API anahtarsız/hesapsız yerel çalışma, loopback, doğrulanmış indirmeler, iptal ve buluta otomatik geçmeme korunur. Studio düzeni, manuel CAD, implant yerleştirme, geri alma, kayıt ve kurtarma davranışları bu değişikliğin regresyon kapsamındadır. Yeni inceleme geometri üretim algoritması eklemez.

Yeni AYA, inceleme ve marka metinleri TR/EN ve diğer diller için İngilizce fallback kullanır. Mevcut 46 dil seçeneği korunur; yeni alanların tamamının tüm dillerde editör onayından geçtiği iddia edilmez.

## Doğrulama durumu

**RC53 kaynak kontrolleri geçti.** Sekiz tarayıcı regresyonu, tam `npm run verify` ve üretim standalone yükleme kontrolü exit 0 ile tamamlandı. Süreler gerçek çalıştırma kayıtlarından alınır. Model köprü çağrıları mock; CAD olarak belirtilen kontroller gerçek Three.js/WebGL sahnesini çalıştırır. Supabase/vaka yanıtları sentetik HTTP fixture verileridir.

| Kontrol | RC53 sonucu |
| --- | --- |
| 100 logo tarayıcı kontrolü | 259,0 saniye; 600 açık/koyu/gösterim kombinasyonu, 100. kimlik, arama, içe/dışa aktarma, kayıt hatası, 46 dil ve dar ekran |
| Uzman inceleme — gerçek WebGL | 308,97 saniye; gerçek ışık ve piksel değişimi, imleç hedefi, kenar/normal/gölgeleme, kesit, kamera, tek sahne ve değişmeyen geometri/undo; AYA Uygula, izin/scope/mod korumaları ve ayar kaydı |
| AYA sohbeti ve kaynaklar | 26,02 saniye; model önceliği, konu/bellek/geçmiş, güvenli kaynak bağlantıları ve yeniden açma, hata/iptal/geç yanıt ve dar ekran. Model köprüsü mock |
| AYA çalışma belleği ve görevleri | 18,74 saniye; açık bellek düzenleme, geçmiş tercihi, yeni sohbet, çok adımlı işler, tıklamalı/stale öneriler ve callback hataları. Model/işlem callbackleri sentetik |
| Günlük CAD regresyonu | 165,54 saniye; gerçek WebGL implant koleye yerleşim, ünite geçişi, şekillendirme/undo, tam sahne kaydı, kayıt yanıtını bekleme, hata/çatışma, çıkış/kurtarma ve AYA araç kapıları |
| CAD form kütüphanesi regresyonu | 107,55 saniye; gerçek STL alma/önizleme/aktarım, üniteye seçim, manuel yerleştirme, tam sahne kaydı/yeniden açma ve kayıt/kurtarma kapıları |
| Ortak masaüstü çerçevesi | 40,96 saniye; 6 gerçek rota, 22 yerleşim örneği, klavye, RTL, tema ve dar ekran |
| Görünüm regresyonu | 115,52 saniye; 68 palet/önayar, kalıcı tercihler, aktarım/sıfırlama, CAD görünümü ve 46 dil |
| Tam npm run verify | 172,49 saniye; sıfır uyarılı lint, tip kontrolü, CAD/AYA birimleri, kart/logo/sürüm güvenliği, migration/veritabanı/iş akışları ve 38 sayfalık üretim derlemesi |
| Üretim standalone yükleme | 25,33 saniye; yapay bekleme 0 ms, gerçek bekleyen istek, hazır ekran/rota iptali, hata, isteğe bağlı bilgi/oyun ve sıfır sayfa hatası |
| Native b9380 JSON grammar | 17/17 gerçek, mock olmayan grammar durumu. Model ağırlığıyla yanıt üretimi değildir; native-grammar-report.json kaydı |
| Gerçek model çıkarımı | DOĞRULANMADI; model ağırlığı indirmesi EAI_AGAIN / proxy CONNECT 403 ile engellendi. Sıfır gerçek çıkarım vakası. Motor sürümü/hash ve grammar denetimi ayrı kaydedildi |
| Kaynak bütünlük manifesti | Geçti: `node scripts/verify-source-integrity.mjs`; 1.940 kaynak dosyasının boyutu ve SHA-256 değeri manifestle eşleşti |
| Yayımlanan ZIP kabulü | Yayım sonrası ayrı teslim kontrolüdür; kaynak raporu yayım/indirme başarısı iddiasında bulunmaz |
| Windows / canlı kurum / klinik kabul | Yapılmadı. Linux kaynak ve sentetik HTTP kontrolleri bu kabulün yerine geçmez |

Sonuçlar: [sekiz tarayıcı](verification/RC53/browser-results.json), [kaynak kontrolleri](verification/RC53/source-verification.json), [tam verify](verification/RC53/verify.txt), [üretim yükleme](verification/RC53/loading-reading-browser.txt), [native grammar](verification/RC53/native-grammar-report.json) ve [model erişim engeli](verification/RC53/native-feasibility-report.json).

Güncel ekranlar: [CAD inceleme](verification/RC53/RC53_cad-inspection_CAD_Inspection_Desktop.png), [dar ekran](verification/RC53/RC53_cad-inspection_CAD_Inspection_Mobile.png), [logo seçimi](verification/RC53/RC53_brand_DentAYA_Premium_logos_desktop.png), [100 logo galerisi](public/brand/DentAYA_Premium_Atelier.webp). Ekranların komut, zaman ve SHA-256 kayıtları tarayıcı raporundadır. Eski RC numaralı sabit test dosya adları bu koşuda yeniden üretilmiştir; önceki sürümden ekran taşınmamıştır.

Yeni kontroller AYA açıkken CAD ayarlar menüsünün tıklanabilirliğini, uzman yetkisinin mod değişiminde kaldırılmasını ve eski önerinin reddini de sınar. AYA mesaj alanının açılış odağı, otomatik kayıt sonrası erişimi ve Escape ile odağın düğmeye dönmesi günlük CAD kontrolünde doğrulanır. Mevcut otomatik kayıt görünüm tercihlerini saklayabilir; fener ve inceleme komutları geometri/geri alma geçmişini değiştirmez. 27 araç ve ayrıntılı CAD kanıtıyla 2048 çıkış sınırı gerçek yerel köprü sözleşmesinde ayrıca kontrol edilir; bu kontrolün çıkarımı mocktur.

Önceki uzun uzman/kılavuzlu tarayıcı paketleri bu sürümde ayrıca yeniden çalıştırılmadı. Yeni inceleme, günlük ve kütüphane WebGL kontrolleri ile tam zincirdeki kılavuzlu birimler çalıştırıldı. Geliştirme rozeti bazı tarayıcı oturumlarında uygulama düğmelerini örtmemesi için gizlenir; uygulama kontrolleri ve sayfa hatası denetimleri korunur. Üretim derlemesi ve standalone yükleme ayrıca yürütüldü. Geçici fixture rotaları teslimattan önce kaldırıldı.

## Gerçek sınırlar

Gerçek model çıkarımı **doğrulanmadı**. Yerel motorun açılması veya JSON grammar testlerinin geçmesi yeni doğal dil ifadelerini anlama, bellek kalitesi ya da CAD muhakemesi kanıtı değildir. Model ağırlığı erişimi sağlandığında yeni ifade, yalnız bellekle takip, eksik antagonist/rapor ve gerçek işlem sonucu için çok turlu çıkarım ile anlam incelemesi ayrıca gerekir. Otomatik bulut geçişi veya doğrulamasız alternatif ağırlık kullanılmaz.

Kanıt seçimi sınırlı TR/EN sözcük eşleştirme ve bağlam genişletmesidir; embedding eğitimi veya temel model öğrenmesi değildir. 500 kart/60 kaynak ve ayrı 1008 soru-cevap sayıları içerik miktarını gösterir. 30.000 kapasite sınırı tamamlanmış içerik veya zekâ puanı değildir. Kartların klinik inceleme durumu kayıtlı değildir; teknik algoritma kartı o algoritmanın DentAYA'da uygulandığını göstermez.

İnceleme ışığı ve yüzey katmanları ölçüm değildir. Örnek normaller tam yüzey kanıtı, kesit görünümü yeni boolean geometri, kaynak mesafesi gerçek duvar kalınlığı veya kabuk offset tahmini üretim onayı sayılamaz. Antagonist yokken kapanış güvenliği değerlendirilmiş sayılmaz. Görsel araçlar tıklamayla çalışır; CAD çekirdeği manuel ve deterministik kalır.

Linux kaynak kontrolleri gerçek Windows kısayol, pencere/ölçek, installer veya donanım performansı kabulü değildir. Canlı kurum/Supabase, çok kullanıcılı kabul, gerçek hasta/tarama ve klinik/üretim hassasiyeti doğrulanmış sayılmaz. Kaynak ZIP'ine model ağırlıkları, sırlar, kişisel `.env.local`, `node_modules`, `.next` veya geçici test rotaları eklenmez. Üretim web sitesine dağıtım bu çalışmanın kapsamında değildir.
