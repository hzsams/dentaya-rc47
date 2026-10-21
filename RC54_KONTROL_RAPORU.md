# DentAYA RC54 kontrol raporu

Sürüm `1.0.0-rc.54`, AYA Core `0.10.0`. Tarih: 2026-10-21T17:01:56+03:00. Taban RC53: `1755830274949b0357638ad6ce8d1e998eda4672`. Bu rapor RC54 üzerinde tamamlanan kontrolleri açıklar; eski sürüm kayıtları yeni doğrulama sayılmaz.

## Uygulanan değişiklikler

- Model yanıt sözleşmesine alan bazlı `patch` eklendi. Hedef tek başına kaldırılabilir; diğer kararlar ve açık sorular korunur. Kararlar tam yeni listeyle düzeltilebilir; çözülmüş sorular kaldırılabilir. Eksik/yanlış maskeler reddedilir; önceki merge/replace/clear yanıtları desteklenir.
- Yeni sohbet eski açık bellek formunu taşımaz. Model yanıtı form açıkken belleği değiştirirse kullanıcı taslağı korunur, çakışma gösterilir ve eski taslakla kaydetme engellenir. Güncel bellek açık düğmeyle yüklenir.
- Asenkron not içe aktarma, dosya okunurken silinen notu geri getirmez veya yeni notu kaybettirmez; kapasite ve defter izni kayıt anında denetlenir.
- Geç biten eski motor durumu yeni hazır model listesini ezemez. Eksik managed kurulum, hazır yerel Ollama modellerini gizlemez. Model dosyası olup motoru olmayan seçenek çalışır model olarak gösterilmez. Kurulum/başka işlem sürerken model hazır sayılmaz; buluta geçiş eklenmedi.
- Disk, GGUF, platform, indirme/bütünlük ve eksik motor sorunları uygulanabilir açıklamalarla gösterilir; ham yerel hata ayrıntısı gösterilmez.
- CAD işlem kanıtı proje/ünite kapsamına, çalışma sürümüne ve geometri sürümüne bağlıdır. Eski kayıt hatası güncel başarılı manuel kaydı gölgelemez; eski inceleme metni yeni geometriye ölçüm diye taşınmaz. Geçmiş mesajları korunur. Model hazır olmadığında CAD Core rehberine döner.
- Sistem yönergeleri aynı davranış sınırlarını koruyarak kısaltıldı; tüm 27 araç ve güncel CAD kanıtı 2048 çıktı tokenı ayrılmış gerçek köprü testine sığar. CAD çekirdeği değiştirilmedi.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| aya-conversation | GEÇTİ | 29.9 sn |
| aya-work | GEÇTİ | 17.89 sn |
| cad-daily | GEÇTİ | 173.23 sn |
| aya-state | GEÇTİ | 41.41 sn |
| full-verify | GEÇTİ | 195.74 sn |
| loading-reading | GEÇTİ | 24.3 sn |
| Native b9380 JSON grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 1972 kaynak dosyası |

Tam verify; yeni bellek/kurulum/not yarış testlerini, mevcut AYA sözleşme ve güvenlik kontrollerini, çeviri, CAD kernel/iş akışı, migration/PGlite, sıfır uyarılı lint, TypeScript ve Next üretim derlemesini içerir. Dört tarayıcı paketi sıralı çalıştırıldı. Standalone üretim yükleme testi zorunlu bekleme ve hazır ekranda kalan katman denetimini içerir. Gerçek CAD günlük regresyonu koleye yerleştirme, şekillendirme/undo, ünite geçişi, kayıt hatası/başarısı, çıkış ve yerel kurtarma akışlarını sınar; backend/model yanıtları fixture'dır.

Kanıtlar: [kaynak doğrulaması](verification/RC54/source-verification.json), [tarayıcı sonuçları](verification/RC54/browser-results.json), [grammar](verification/RC54/native-grammar-report.json). 13 güncel ekran görüntüsü ve süreç logları bu klasördedir. Marka/görünüm için RC53'teki geniş kontroller bu sürümde yeniden çalıştırılmış sayılmaz; bu alanların kaynak varlıkları değişmedi.

## Tamamlanmayanlar

Resmî sabit Qwen GGUF adresi yeniden denendi; yetkili ağ kontrolünde proxy CONNECT 403 verdi. Motor b9380 doğrulandı fakat ağırlık dosyası yok: native çıkarım **0 vaka**, model anlamsal kabulü doğrulanmadı. Grammar kontrolü gerçek C++ kütüphanesindedir, model çıkarımı değildir. Tarayıcı ve bridge testlerindeki model yanıtları mock'tur. [Model erişim kaydı](verification/RC54/model-access-report.json) ve [native çıkarım engeli](verification/RC54/native-inference-report.json).

Windows EXE üretimi/Windows çalıştırması ve canlı kurum backend kabulü yapılmadı. Teslim kaynak ZIP'idir. Bu sürüm model eğitimi, her ifadeyi anlama, üretim/klinik uygunluk veya exocad işlev eşdeğerliği iddiası taşımaz. Gerçek kart sayısı 500, kaynak grubu 60, logo sayısı 100, ayrı hazır soru kataloğu 1008; 30.000 gerçek içerik hedefi tamamlanmadı. Logolar hacim etkili SVG'dir, 3B mesh değildir.
