# RC37 — Kontrol Raporu

Tarih: 12 Ekim 2026. Kaynak sürümü: 1.0.0-rc.37. Temel: RC36.

| Kontrol | Sonuç |
| --- | --- |
| Tam proje kontrolleri, lint, tip denetimi, CAD çekirdeği ve üretim derlemesi | Geçti; core-and-build-46.log |
| Diş formu ve ölçü kontrolleri | 736 geometri varyasyonunda sonlu koordinatlar, korunan yüzey bağlantıları ve diş aralıkları |
| Gerçek WebGL görünüm testi | Şekil, ölçü, renk ve yüzey değişimi; sahne, seçim ve kamera korunması; yeniden açılış geçti |
| Yeni 15 dilde görünüm kontrolleri | Form, renk ve yüzey başlıkları; saklanan tercihler; aynı 3D sahne; R/L yön işaretleri ve mobil yerleşim geçti; tooth-appearance-browser-46.log |
| Sekiz işlemli CAD | Aşamaya bağlı araçlar, ileri adım kilitleri, gerçek marjin çizimi, kayıt ve sahne korunması geçti; cad-guided-browser-46.log |
| Dil paketleri | 46 dil; 4.746 kaynak metin; 45 çeviri paketinde 213.570 karşılık; web ve masaüstü kopyaları eşleşiyor |
| Görünür metin ve sistem mesajları | 2.583 görünür kaynak, bildirimler, vaka geçmişi, durum etiketleri ve dental terimler 45 çeviri paketinde mevcut |
| 46 dilde tarayıcı geçişi | Paket yükleme, kullanıcı metni, dosya adı, form ve diş durumu korunması; menü geçişi ve mobil yerleşim geçti; ui-language-browser-46.log |
| Tema ve paletler | 56 seçenek, ayar panelleri, kayıt, dışa/içe aktarım, 46 dilde tercih korunması ve mobil yerleşim geçti; palette-browser-46.log |
| Sağdan sola diller | Arapça, İbranice ve Farsçada doğru sayfa yönü; yeni dillerde anatomik R/L işaretleri korunuyor |
| Güncelleme dosyası | Tek DENTAYA_GUNCELLE_DERLE.cmd; sürüm, kilit dosyası, uygulama etiketi ve kurucu hedefi tutarlı |

## Kapsam

Form ve ölçü kontrolleri seçim ekranındaki referans dişleri değiştirir. Hasta taraması ve CAD üretim geometrisi bu görünüm ayarlarıyla değişmez. Ayarlar cihazda otomatik saklanır. Eski tercihler ve mevcut aşamalı CAD düzeni korunur. Yeni SQL gerekmez.

## Çeviri

Norveççe, İzlandaca, Sırpça, Boşnakça, Arnavutça, Makedonca, Azerbaycanca, Gürcüce, Ermenice, İbranice, Farsça, Hintçe, Bengalce, Endonezce ve Vietnamca için 71.190 sabit metin karşılığı tamamlandı ve etkinleştirildi. Kullanıcının açık onayıyla yalnızca sabit İngilizce arayüz metinleri Bing Translator'a gönderildi. Hasta kayıtları, kullanıcı notları, taramalar, anahtarlar ve kaynak kod dosyaları çeviri aktarımının parçası olmadı.

Dental terim tablosu, temel düğmeler ve İngilizce kalmış açıklamalar düzeltildi. Ermenice revizyon şablonunun not sonuna eklediği noktalama giderildi; İbranice karşılığı düzenlendi. Kullanıcı metinleri ve değişkenler sistem testinde aynen korunuyor. Çeviri kapsamı, sayı, ölçü birimi ve değişken kontrolleri verification/RC37/translation-quality-46.json içinde kaydedildi. Kapsam kontrolü bütün dillerde ana dili konuşan editör incelemesi yapıldığı anlamına gelmez.

## Test ortamı ve kurulum

Bu kaynak paketidir. Windows kurucusu bu Linux ortamında üretilmedi veya Windows'ta çalıştırılmadı. Tarayıcı testlerinde gerçek arayüz ve WebGL kullanıldı; veri bağlantıları test verileriyle karşılandı. Windows'ta kurucuyu DENTAYA_GUNCELLE_DERLE.cmd üretir. Kullanım adımları RC37_KULLANIM.md içindedir.

Bu rapor 46 dil için yapılan son kontrolleri özetler. Aynı klasördeki önceki loglar 31 dil içeren RC37 önizlemesine aittir; önceki RC sürümlerinin raporları tarihsel kayıttır.
