# RC38 — Premium tipografi ve morfoloji kontrol raporu

Tarih: 13 Ekim 2026. Sürüm: **1.0.0-rc.38**. Temel: güncel RC38 kaynak paketi; devam çalışmasının fırça düzeltmeleriyle birleştirildi.

## Değişiklikler

DENTAYA kelime işareti özel çizilmiş kontrastlı serif harfler, optik aralıklar ve vektör harf oranlarıyla yenilendi. Ana kimlik ve uyumlu logo seçenekleri güncellendi; açık/koyu, yalnız yazı, yalnız simge ve tek renk baskı varlıkları birlikte üretildi. Harfler işletim sistemi fontuna bağlı değildir.

Önceki boyut/çevre biçimi varyantları yerine **24 morfoloji ailesi, altı sınıf** kullanılır. Her aile kenar, lob, lingual yüzey, tüberkül, sırt ve oluk özelliklerini tanımlar. Genişlik/yükseklik/derinlik ayrı gelişmiş ayarlardır. Aynı ölçülere normalize edilmiş aileler de farklı kalır. Görseller uygulamanın gerçek geometrisinden, ortak ölçü ve kamerayla çizilmiştir.

Diş görünümü ve CAD iş tanımı aynı aile listesini kullanır. Genel görünüm ayarı referans diş şemasını; CAD ünite formu yeni başlangıç restorasyonunu değiştirir. Teleskopların mekanik geometrisi korunur. Eski form kayıtları yeni ailelere okunurken eşlenir; ölçüler, ünite kimlikleri ve proje bilgileri korunur. CAD iş tanımının kaydırma düzeni büyüyen galeriye göre düzeltildi. Güncel seçici stilleri ve dört sütunlu geniş ekran galerisi korundu. Dar anatomik sırtlarda tam kuvvetteki fırça darbesi yüzeyi ters çevirecekse daha küçük güvenli hareket denenir; yerel yüz koruması kaldırılmaz.

## Kanıtlar

Bütün yollar `verification/RC38-premium` altındadır.

| Kontrol | Sonuç | Kayıt |
| --- | --- | --- |
| Geometri çeşitliliği | 32 FDI × 24 aile: 768 taç; eşit sınır ölçüleri; her aile çifti farklı | `form-geometry.log` |
| Kapalı başlangıç gövdesi | Her kenarda iki yüz; tek bağlantılı taç; dejenere yüz yok; pozitif hacim | Aynı kayıt |
| CAD restorasyon türleri | 5 temsilî FDI × 24 aile × 12 tür: 1.440 başlangıç geometrisi | Aynı kayıt |
| Referans kökleri ve atlas | 768 gösterim kontrolü; kökler aileler arasında aynı; kaynak atlas değişmedi | Aynı kayıt |
| Eski tercihler ve ölçüler | Eski form eşlemeleri, sayı sınırları, 16 stil, 24 aile ve altı ölçü kontrolü geçti | `appearance-geometry.log`, `cad-setup.log` |
| Şema yerleşimi | 24 ailede ön/üstten şematik komşu diş aralığı en az 1,8 mm | `tooth-layout.log` |
| Gerçek form ekranı | WebGL'de 24 farklı görünüm; aynı ölçüler; 24 görsel; eski tercih, yeniden açılış ve ölçü sıfırlaması | `form-browser.log` |
| Renk ve stil ekranı | 16 stil, renk/yüzey/parlaklık/özel renk, seçim/kamera koruması, yeniden açılış ve RTL geçişleri | `appearance-browser.log` |
| Dil ve mobil ekran | 46 dilde yeni seçici/açıklamalar; durum ve aynı tuval korundu; 390 px taşma yok | Aynı kayıt |
| CAD ünite formu | 24 ailenin tümünde bağımsız ünite seçimi, galeri, teleskop geçişi, kaydetme ve yeniden açılış | `cad-browser.log`, `cad-browser-final.log` |
| CAD araçları | Gerçek WebGL/STL sahnesi; şekillendirme, geri al/yinele, gizli hedef koruması, araçlar ve kayıt; dil/tema değişiminde sahne ve geçmiş korunuyor | `cad-browser.log` |
| Yeni formlarda fırça bütünlüğü | Varsayılan fırça ayarlarıyla 24 aile × 4 diş grubu × 4 araç: 384 gövdede 3.072 darbe; her araç gerçek değişiklik yaptı, gövdeler tek ve kapalı kaldı | `morphology-sculpt.log` |
| Yüzey koruma regresyonları | UV dikişi, 100 yüzey düzenlemesi, NaN/çökme/ters yüz geri alma ve karşı duvar koruması geçti | `sculpt-integrity.log` |
| Gerçek aşamalı CAD | 6 aşama/8 görev; margin çizimi, kayıttan göreve dönüş, sonraki görev araçlarının kilidi ve sahne korunması geçti | `cad-guided-browser.log` |
| CAD çekirdeği ve akış | Çekirdek, BVH, crown shell, panel, etkileşim, iş tanımı, rehberli görev ve katman kontrolleri | `cad-kernel.log`, `cad-workflow.log`, `cad-panel.log`, `cad-interaction.log`, `cad-guided.log`, `cad-display.log` |
| Logo ekranı | 8 logo × 2 tema × 3 mod: 48 kombinasyon; eski kimlik, ayar aktarımı ve yeniden açılış | `brand-browser.log` |
| Vektör ve simge varlıkları | 48 yazılı SVG'de yedi harf DENTAYA; font/dış kaynak yok; 19 ICO'da 16–256 px; 24 farklı form görseli | `asset-audit.json` |
| Windows simge akışı | İzinli kimlik, ICO kalıcılığı, kısayol oluşturma/güncelleme ve başka kurulum koruması | `desktop-icon.log` |
| Dil paketleri | 46 dil; 45 çeviri paketinde 4.814 kaynak anahtarı; web/masaüstü paketleri aynı | `bundled-languages.log`, `visible-translations.log`, `system-translations.log` |
| Lint / TypeScript | Sıfır uyarı sınırı ve tür kontrolü geçti | `lint.log`, `typecheck.log` |
| Üretim derlemesi | Next.js 16.3.5; standalone sunucusu, statik sayfalar ve üretim manifestleri; geçici test sayfası yok | `build.log`, `production-build.json` |
| Güncel paketle birleştirme | Güncel seçici ve galeri stilleri, ek ekran kontrolleri ve tarihsel rapor korunarak fırça düzeltmesi uygulandı | `merge-preservation.json` |
| RC38 ve kaynak koruması | Paket/kilit/istemci/kurucu aynı RC38; tek CMD; 57 SQL/atlas dosyası eski paketle aynı | `release.log`, `source-preservation.json` |

## Kapsam ve ortam

Geometri ve uygulama kontrolleri Linux/Node 24 ile; ekran kontrolleri gerçek Chromium 145 ve yazılımsal WebGL ile yapıldı. CAD ekranında iki mevcut açık eğitim taraması ve API test cevapları kullanıldı. Gerçek hasta verilerine veya üretim veritabanına bağlanılmadı. Windows shell/IPC testlerde taklit edildi. Ekran görüntüleri yalnızca yerel inceleme içindir; kaynak arşivine eklenmez.

24 aile prosedürel, düzenlenebilir başlangıç anatomisidir. Kapalı geometri kontrolü klinik anatomi, oklüzal uygunluk, marjin, iç yüzey veya üretim doğrulaması anlamına gelmez. Mevcut hasta taramaları ve kaydedilmiş STL dosyaları yeniden yazılmaz. Yeni SQL göçü gerekmez.

46 dilde paket kapsamı doğrulandı. Yeni kısa morfoloji açıklamaları yerel sözlükle hazırlandı; koleksiyon adları sabit kaldı. Kapsam kontrolü bütün dillerde ana dil editörü veya klinik terminoloji onayı anlamına gelmez.

ZIP **kaynak paketidir**. Windows kurucusu Linux'ta üretilmedi veya Windows'ta çalıştırılmadı. `DENTAYA_GUNCELLE_DERLE.cmd` Windows'ta `DentAYA-Setup-1.0.0-rc.38.exe` üretir. Kurulum: `RC38_KULLANIM.md`. İlk RC38 logo raporu `verification/RC38/RC38_LOGO_KONTROL_RAPORU_TARIHSEL.md` altında tarihsel kayıt olarak tutulur.
