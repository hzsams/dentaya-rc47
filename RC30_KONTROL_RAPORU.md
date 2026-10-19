# DentAYA RC30 · kontrol raporu

4 Ekim 2026 · kaynak sürümü `1.0.0-rc.30`.

## Sonuç

Manuel CAD çalışma alanı tamamlandı. Tam `npm run verify` zinciri geçti. Son model-yükleme kilidi değişikliğinden sonra ESLint, TypeScript, CAD etkileşim/görünürlük/iş tanımı kontrolleri, dil paketi kontrolleri, gerçek editör tarayıcı testi ve son üretim web derlemesi tekrar geçti. Windows Setup bu Linux ortamında oluşturulmadı veya çalıştırılmadı.

CAD'deki AYA kontrol kartı kaldırıldı. Kullanıcı araç, parametre, görünürlük, aktif ünite ve tasarım adımını seçer. Geometri araçları AI sohbetine veya AI API anahtarına bağlı değildir. Bu değişiklik Exocad düzeyinde bir geometri çekirdeği veya klinik/üretim sertifikasyonu iddiası taşımaz.

## Kontroller

| Kontrol | Sonuç |
| --- | --- |
| Üretim web derlemesi | 36 sayfa üretimi geçti; Next.js derlemesi ve TypeScript başarılı. |
| ESLint / TypeScript | Tüm kaynaklar, sıfır uyarı eşiği ve `tsc --noEmit` geçti. |
| Gerçek CAD editörü | Test oturumu ve Supabase REST cevapları yerelde taklit edildi. İki gerçek STL varlığı WebGL sahnesine yüklendi. Bunlar test verisidir; klinik olarak eşleştirilmiş bir hasta kapanışı doğrulaması yapılmadı. |
| Araç seçimi | Döndür, marjin, ölçüm, ekle, çıkar, yumuşat, düzleştir ve bağlantı düğmelerinin tamamı seçilir; tek aktif araç gösterilir. |
| Manuel şekillendirme | Görünür restorasyona fırça darbesi uygulandı, geometri geçmişi değişti; geri al ve yinele çalıştı. Gizlenen restorasyona tıklama geçmişi değiştirmedi. |
| Görünürlük | Çene yüzdesi, ayrı aç/kapat, tek nesneyi göster, gizli tarama grubundan çeneyi geri açma ve tümünü göster kontrolleri geçti. |
| Parametreler | Sayısal fırça değeri sürgüyü güncelledi; seçilen fırça şekli doğru aktif durum gösterdi. Model yüklenirken araçlar kapalı kaldı. |
| Fare menüsü | Kısa sağ tık menüyü açtı; sağ sürükleme döndürdü ve menüyü açmadı. Menü aracı seçti; Escape kapattı. |
| Panel | Sürükleme, klavye taşıma, cihazda konum kaydı, gizleme/geri açma ve sıfırlama geçti. 1280×800 boyutta sağ kamera çubuğu açık kaldı; panel ekran sınırlarında kaldı. |
| Sekmeler ve ayarlar | Yedi araç grubu, yön tuşlarıyla sekme seçimi ve görünüm/ses ayarları penceresi geçti. |
| Dar ekran | 390×844 ekranda araç penceresi ve nesne ağacı kapatılabildi; kamera ve panel açma kontrolleri erişilebilir kaldı. CAD'nin ana çalışma hedefi masaüstüdür. |
| İş tanımı / kayıt | 46/47 çalışma ünitesi değişti; iş tanımı ve ayarlar test REST uç noktasına kaydedildi. Canlı hasta verisine yazılmadı. |
| Mevcut CAD sözleşmeleri | Etkileşim 36/36, kurtarma/akış 18/18; yeni panel ve iş tanımı kontrolleri geçti. |
| Geometri çekirdeği | Mevcut yapay mesh testinde su geçirmezlik, shell, BVH ve kayıt kontrolleri geçti. Bu, klinik üretim doğrulaması değildir. |
| Dil / masaüstü dili | 31 dil ve 24 AB dili korunur. Güncel manifest 4.513 anahtar içerir; frontend ve Electron aynı hash'i kullanır. Dil paketi çıkarımı ve Electron pencereleri testte taklit edildi; tam 31 dilin çeviri kalitesi ölçülmedi. |
| AYA / ses / güvenlik / operasyon | Önceki RC29 testleri tam doğrulama zincirinde geçti. Yerel model çıkarımı taklit edilir; CAD model sohbeti kullanmaz. |
| Tarama ve anatomi varlıkları | RC29 paketindeki 42 tarama/anatomi dosyası SHA-256 ile aynı; bu arayüz güncellemesinde değişmedi. |
| Paket | Paket, lockfile, istemci, release bilgisi ve Windows yardımcısı `1.0.0-rc.30` ile eşleşir. ZIP'e gerçek ortam anahtarları, bağımlılık klasörü veya derleme önbelleği alınmaz. |

Ekran görüntüleri, test özeti ve kayıtları [verification/RC30](verification/RC30) içindedir. Tarayıcı testini yeniden çalıştırmak için Playwright ve bir Chromium kurulumu gerekir; isteğe bağlı `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` değişkenleri kullanılabilir. `npm run verify:cad-browser` gerçek editöre test verisi bağlar; canlı Supabase yerine istekleri yakalar.

Referans davranışlar Exocad'in resmi [CAD çalışma alanı](https://wiki.exocad.com/wiki/index.php/CAD_Module), [serbest şekillendirme](https://wiki.exocad.com/wiki/index.php/Freeforming) ve [kısayol](https://wiki.exocad.com/wiki/index.php/Hotkeys) belgelerinden incelendi. İkonlar DentAYA için özgün SVG olarak çizildi.
