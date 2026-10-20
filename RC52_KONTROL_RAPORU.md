# RC52 kontrol raporu

Sürüm: `1.0.0-rc.52`; AYA Core: `0.8.0`. Tarih: 21 Ekim 2026 (Türkiye saati). Temel sürüm RC51. RC52, referans CAD çalışma ergonomisine göre Studio arayüzünü düzenler ve zorunlu 5 saniyelik yükleme/okuma beklemesini kaldırır. Özgün DentAYA varlıkları kullanılır; exocad/3Shape ergonomik referanstır.

## Kaynak değişikliğinin kapsamı

- Studio varsayılan görünümü: aydınlık paneller, erik moru başlıklar ve kompakt araç kontrolleri. Sunucunun başlangıç renkleri de Studio paletiyle eşleştirilir. Mevcut tema kimliği üzerinden kullanılır; diğer tema tercihleri ve tercih dışa aktarma korunur. Ayrı bir tema veya ikinci CAD sahnesi oluşturulmaz.
- Uygulama girişi: `/` sunucuda `/workspace` adresine yönlenir. Ayrı web sitesi deposu bu çalışmada değiştirilmez. Modül menüsündeki AYA bağlantısı da CAD'nin mevcut kayıt ve kurtarma geçiş kapılarını kullanır.
- CAD dışındaki ortak çerçeve: 42 piksel başlık, 80 piksel simgeli etkinlik şeridi ve 26 piksel durum çubuğu. İş yöneticisi tek ana iş tablosu, seçime bağlı ayrıntılar ve mevcut işlemleri sunan araç şeridi kullanır. Ayarlar kategori listesi ve araç odaklı ayar alanlarıyla düzenlenir.
- CAD: ortak uygulama başlığı kaldırılır; nesneler sol üstte, görev parametreleri soldaki beyaz panelde, mevcut komutlar sağdaki koyu şerittedir. Yeni sahnenin varsayılanı düz Studio arka planıdır; ızgara ve eksenler kapalıdır. Önceden açıkça seçilmiş sahne arka planları ve görünüm tercihleri korunur. Filigran ile kamera araçları arasındaki boşluk artırılır; güncel görünüm [CAD ekranında](verification/RC52/CAD.png) kaydedilir.
- Panel sınırları: taşınan veya kayıtlı konumdan açılan araç paneli, gerçek genişlik ve yüksekliğiyle ekran içinde tutulur; sağ komut şeridi ve alt kontroller erişilebilir kalır. Yeniden boyutlandırma ve panel içeriğinin değişmesi de sınırları günceller. Dar ekran yerleşiminde sahneyi veya araç panelini aşağı iten ek ızgara satırı kaldırılır; panel katmanları mevcut sahnenin üstünde çalışır. Taşıma, yeniden bağlama ve sıfırlama aynı WebGL sahnesini kullanır.
- Yükleme: görünüm gerçek bekleyen işlemin ömrünü izler. İşlem sonrasında kalan zorunlu okuma süresi ve hazır ekranda otomatik okuma katmanı yoktur. Bilgi kartları ve mini oyunlar isteğe bağlı kontrollerden kullanılabilir.
- CAD kernel algoritmaları değişmez. Mevcut sunucu kayıt yanıtı, kayıt hatasında ekranda kalma, yerel kurtarma kararı, implant yerleşimi, ünite geçişi ve geri alma akışları regresyon kapsamındadır. AYA Core `0.8.0`, model önceliği, açık çalışma belleği ve kullanıcı tıklamasına bağlı tipli CAD araçları korunur.

Türkçe kaynak ve 45 çevrilmiş katalogla 46 yerel dil seçeneği korunur. Yeni masaüstü metinleri TR/EN ve diğer diller için İngilizce fallback kullanır; bütün yeni metinlerin tüm dillerde editör onayı aldığı iddia edilmez. Önceki RC51 raporu ve ekranları tarihsel kayıttır; RC52 doğrulamasının yerine geçmez.

## Doğrulama durumu

**RC52 kaynak kontrolleri geçti.** Dokuz tarayıcı regresyonu, tam `npm run verify` zinciri ve üretim standalone yükleme kontrolü exit 0 ile tamamlandı. Bunlar mevcut kaynak, sentetik backend verileri ve aşağıda belirtilen gerçek tarayıcı/WebGL kapsamındaki sonuçlardır. Windows, native model ve canlı kurum kabulü ayrı tutulur.

| Kontrol | RC52 durumu |
| --- | --- |
| Sürüm, lockfile, istemci kimliği, CMD ve katalog dışa aktarımı tutarlılığı | Geçti: tam verify zincirindeki sürüm, ortam ve katalog kontrolleri |
| Ortak çerçeve tarayıcı kontrolü (`verify-desktop-shell-browser.mjs`) | Geçti: 40,89 saniye; 6 gerçek rota, 22 yerleşim örneği, sıfır sayfa hatası; klavye, dar ekran, RTL, tema ve ağ durumu |
| Günlük CAD tarayıcı kontrolü (`verify-cad-daily-browser.mjs`) | Geçti: 182,43 saniye; gerçek WebGL sahnesinde implant yerleşimi, ünite geçişi, şekillendirme/geri alma, kayıtla yeniden açma, kayıt yanıtını bekleme, hata/çatışma ve kurtarma kapıları |
| Uzman CAD tarayıcı kontrolü (`verify-cad-browser.mjs`) | Geçti: 441,51 saniye; 6 özgün form, gerçek sahnede manuel araçlar/geri alma, dil ve palet değişiminde sahne/geçmiş koruma, panel taşıma/sıfırlama, komut şeridi ve alt sınır, 390×844 dar ekran |
| Kılavuzlu CAD tarayıcı kontrolü (`verify-cad-guided-browser.mjs`) | Geçti: 374,53 saniye; 8 görev, gerçek kole çizimi ve yerleşim kapıları, sağ şeritten görev menüsü, tek sahne, hazır olunca bekletmeden çalışma ve isteğe bağlı oyun |
| Form kütüphanesi tarayıcı kontrolü (`verify-cad-library-browser.mjs`) | Geçti: 103,38 saniye; gerçek STL alma/önizleme, kütüphane aktarımı, üniteye seçim, manuel yerleştirme, tam sahne kaydı/yeniden açma, kayıt hatasında kalma ve yerel kurtarma; nihai JSON ve exit 0 kaydı mevcut |
| Profesyonel çerçeve tarayıcı regresyonu (`verify-professional-shell-browser.mjs`) | Geçti: 11,61 saniye; tek hızlı navigasyon sahibi, klavye/odak, modal, gerçek hasta/randevu ekranları ve dar ekran; sıfır sayfa hatası |
| Profesyonel modül tarayıcı regresyonu (`verify-professional-modules-browser.mjs`) | Geçti: 16,75 saniye; finans yükleme/kayıt hataları, tutar ve taslak koruma, mesaj sayfalama ve konuşma/taslak ayrımı, gönderim sırasında düzenleme, masaüstü ve dar ekran yazma alanı |
| Görünüm tarayıcı regresyonu (`verify-appearance-browser.mjs`) | Geçti: 112,48 saniye; 68 palet/önayar seçeneği, kalıcı tercih, dışa aktarma/içe alma, özelleştirme/sıfırlama, CAD görünümü ve 46 dilde kullanım |
| AYA sohbeti ve bellek tarayıcı regresyonu (`verify-aya-conversation-browser.mjs`) | Geçti: 27,57 saniye; model önceliği, temel konuşma, bellek/geçmiş, iptal ve geç gelen yanıt, hata sonrası sorunun korunması, dar ekran ve ayar odağı; yerel model köprüsü mock, gerçek GGUF çıkarımı değil |
| Üretim standalone ortamında gerçek bekleyen yükleme ve hazır ekranda katman/odak kontrolü | Geçti: 23,51 saniye; yapay bekleme 0 ms, sıfır sayfa hatası; hızlı ve yavaş senaryoda yanıt serbest bırakıldıktan sonra hazır olma 50/40 ms |
| Tam `npm run verify`, sıfır uyarılı lint, tip kontrolü ve üretim derlemesi | Geçti: 183,79 saniye; CAD kernel/AYA, güvenlik, çeviriler, migration/veritabanı ve iş akışları; 38/38 sayfa üretimi |
| Son derleme sonrası ekran oturumları | Geçti: ortak uygulama ekranları 16,09 saniye, gerçek WebGL CAD ekranı 97,40 saniye; `/` girişinin `/workspace` yönlendirmesi misafir ve oturum açık durumda kontrol edildi |
| Güncel ekranlar ve çalıştırma kayıtları | Toplandı: `verification/RC52/` altında dokuz tarayıcı günlüğü, tam verify/üretim yükleme kayıtları ve kaynak komutları/hashleriyle 12 ekran |
| Kaynak bütünlük manifesti | Geçti: `node scripts/verify-source-integrity.mjs`; 1.132 kaynak dosyasının boyutu ve SHA-256 değeri manifestle eşleşti |
| Yayımlanan kaynak ZIP'in indirilip açılarak bütünlük kontrolü | Yayım sonrası ayrı teslim kabulüdür; bu rapor hazırlanırken henüz yapılmadı |

Geçen CAD kontrolleri mevcut Three.js sahnesini ve deterministik işlemleri gerçekten çalıştırır; vaka, kurum ve Supabase HTTP yanıtları sentetiktir. Günlük CAD kontrolünde AYA'nın yerel model köprüsü mock kullanır; yeni kontrol raporu ve kullanıcı tıklamasına bağlı araç akışı ayrıca denetlenir. Bu sonuçlar gerçek model çıkarımı veya canlı kurum kabulü değildir.

Form kütüphanesinin kayıt denetimi geçici bir durum mesajına dayanmaz: başarılı PATCH yanıtındaki proje kimliği ve güncelleme zamanı, yazılan tam sahne ve işlemin tamamlandığını gösteren kayıt durumu birlikte kontrol edilir. Başarısız veya çatışan kuyruk yanıtı başarı sayılmaz. Mevcut manuel yerleştirme düğmesiyle yinelenen yerleştirmenin içe alınan formu ve seçili koleyi koruduğu da denetlenir.

Bazı geliştirme tarayıcı kontrollerinde Next.js'in geliştirme rozeti, gerçek sol alt Geri düğmesini örtmemesi için gizlenir. Uygulama kontrolleri gizlenmez; sayfa ve çalışma zamanı hataları denetlenmeye devam eder. Bu koşulara ek olarak üretim derlemesi ve üretim standalone yükleme kontrolü ayrı yürütüldü; Windows paket kabulü yapılmadı.

Üretim yükleme kontrolünde sentetik HTTP isteği 5.250 milisaniyeden uzun süre kontrollü olarak tutuldu; gerçek istek sürerken yükleme görünümü kaldı. Yanıt serbest bırakıldığında hızlı senaryoda 50 ms, yavaş senaryoda 40 ms içinde çalışma ekranı hazır oldu. Hata ve rota iptali yükleme durumunu sonlandırdı; hazır ekranda okuma katmanı veya odak tuzağı kalmadı. Bilgi kartları, mini oyun, dil ve seçili oyun tercihi isteğe bağlı kullanımda korundu. Bu süreler kontrollü sentetik HTTP senaryolarına aittir.

Sonuçlar ve süreler [kaynak doğrulama kaydı](verification/RC52/source-verification.json), [dokuz tarayıcı çalıştırması](verification/RC52/browser-results.json), [tam verify günlüğü](verification/RC52/verify.txt) ve [üretim yükleme günlüğünde](verification/RC52/loading-reading-browser.txt) toplanır. Ayrıntılı yerleşimler [masaüstü raporunda](verification/RC52/desktop-shell-browser-report.json); güncel ekranlar [CAD](verification/RC52/CAD.png), [İş yöneticisi](verification/RC52/WorkManager.png) ve [Ayarlar](verification/RC52/Settings.png) yollarındadır. Kaynak manifesti kanıt ve dokümanlar tamamlandıktan sonra oluşturuldu; `node scripts/verify-source-integrity.mjs` ile 1.132 dosya doğrulandı. Yayımlanan ZIP için indirme ve yeniden açma kontrolü ayrıca uygulanır. Geçici test rotaları kullanan tarayıcı kontrolleri genel verify zinciriyle sırayla yürütülür; teslimden önce geçici rotalar kaldırılır. Önceki sürümlerin kanıtları yeni sonuçların yerine kullanılmaz.

## Bu kaynak tesliminin doğrulamadığı alanlar

- Linux kaynak kontrolleri Windows kurulum kabulü değildir. Gerçek Windows pencere/ölçek testi veya Setup EXE üretimi ve çalıştırması yapılmış sayılmaz.
- Gerçek GGUF çıkarımı, Türkçe model kalitesi ve donanım hızı bu arayüz değişikliğiyle doğrulanmış sayılmaz. AYA Core genel dil modeli değildir; her yeni serbest cümleyi anladığı iddia edilmez.
- Canlı kurum/Supabase, çok kullanıcılı kabul, gerçek hasta/tarama, klinik ve üretim hassasiyeti doğrulaması yapılmış sayılmaz. Önceki sürümlerde açıklanan modül sınırlamaları sürer.
- Üründe 220 gerçek kısa bilgi kartı ve ayrı 1008 soru-cevap kaydı vardır. 30.000 içerik hedefi tamamlanmadı; sentetik kapasite testi gerçek içerik sayısı değildir.

Kaynak pakete model ağırlıkları, kişisel `.env.local`, sırlar, `node_modules`, `.next` veya geçici tarayıcı sayfaları eklenmez. Üretim web sitesine dağıtım bu çalışmanın kapsamında değildir.
