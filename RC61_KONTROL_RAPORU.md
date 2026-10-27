# DentAYA RC61 kontrol raporu

Sürüm `1.0.0-rc.61`, AYA Core `0.17.0`. RC60 tabanı: `2e8787484a33b7ac8e90a8987d36d1a367d6591a`. Tarih: 2026-10-27.

**Bu, doğrulanmış kaynak güncellemesidir. Gerçek yerel modelin anlamsal kalitesi, Windows kurucu ve canlı kurum/klinik kabulü tamamlanmadı.** Normal sohbeti yerel modele bağlayan yol değiştirildi; hazır yanıt sayısı artırılmadı ve temel model eğitilmedi.

## Uygulanan değişiklikler

Ana sohbet `agent:false` ile doğal metin üretir ve modelin doğrulanmış metnini akış halinde gösterir. Her sohbet yanıtına zorunlu CAD/bellek JSON biçimi uygulanmaz. Model eksik/meşgul/hatalı/iptal olduğunda otomatik Core/katalog yanıtı veya işlem önerisi eklenmez. Asıl soru ve tekrar gönderme korunur; yarım metin tamamlanmış yanıt olarak geçmişe yazılmaz. Eski Core tercihi normal sohbeti gizlice rehbere çeviremez. Ana ekrandaki hazır soru kutuları ve soru kütüphanesi sekmesi kaldırıldı; eğitim kayıtları ilgili kaynak verisi olarak korunur.

Ollama metin akışı UTF-8/NDJSON parçalarını toplar; yalnız yanıt metni görünür, düşünce alanları aktarılmaz. Tamamlama, aktarım/satır/çıktı sınırları, hata gizliliği, pencere sahibine bağlı iptal ve geç token reddi denetlenir. Managed akış ve token bütçesi korunur. Alıntılanan gerçek katalog kaydı yalnız okunur kaynak ayrıntısı olarak yerinde açılır; hazır soru seçici veya model cevabı değildir. Kurulu model arka plan belleğiyle meşgulken eksik model gibi gösterilmez.

Hedef/karar/açık soru çıkarımı ayrı `task:'memory'` çağrısıdır: yalnız son kullanıcı isteği, mevcut bellek ve sınırlandırılmış asistan yanıtını alır. CAD, eski geçmiş, RAG ve kişisel not bu çağrıya girmez. Çıkarım başarısız olsa da başarılı sohbet yanıtı korunur. Sonuç yalnız aynı son tur/oturum/bellek sürümü ve tam temel bellek eşleşmesinde uygulanır; elle düzenleme veya yeni oturum eski sonucu geçersizleştirir. Yeni soru önce arka plan işini iptal edip sınırlandırılmış süre bekler; motor hâlâ meşgulse soru korunur. Açık bellek kontrol komutları ve acil uyarılar ayrı deterministik kontrollere devam eder.

CAD varsayılanı yerel modeldir. Çevrimdışı **Araç rehberi** yalnız **Yanıt kaynağı** seçimiyle açılır ve ayrı etiketlenir; rehber turları model geçmişine girmez. Kullanıcı Uygula demeden 27 tipli komut çalışmaz. Gerçek host kapsamı/snapshot/dataToken ve kayıt/işlem sonucu kapıları korunur. Manuel CAD deterministiktir; geometri çekirdeği bu sürümde değiştirilmedi.

Kurulum ekranında çalışan yerel Ollama için `qwen3:4b` indirme yolu görünür. Kullanıcının 16 GB RAM bilgisi esas alındı; GPU ve gerçek hız doğrulanmadı. Mevcut managed Qwen3 1.7B modelin sabit sürüm/boyut/SHA-256 pinleri değişmedi. Ollama ilerlemesi ayrı görünür; başka pencereyi iptal etmiş sayılmaz. İndirme statik güvenli durumlar, aktarım sınırları, hareketsizlik sınırı ve iptal ile çalışır. Ollama model indirmesi managed modelin sabit SHA indirmesiyle aynı doğrulama iddiası değildir.

RC59/60 geçmiş no-op, tam revizyon çakışması, açık yükle/ayrı kopya, silinmiş kaydı geri getirmeme, tanı testi yalıtımı, not kaynakları ve CAD taslak koruması sürer. Yeni bağımlılık veya model ağırlığı eklenmedi.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Gerçek süreç süresi |
|---|---|---|
| aya-conversation | GEÇTİ | 34.297 sn |
| aya-state | GEÇTİ | 47.609 sn |
| aya-work | GEÇTİ | 21.536 sn |
| aya-setup | GEÇTİ | 8.56 sn |
| ui | GEÇTİ | 82.61 sn |
| desktop-shell | GEÇTİ | 79.14 sn |
| cad-daily | GEÇTİ | 256.93 sn |
| full-verify | GEÇTİ | 239.28 sn |
| loading-reading | GEÇTİ | 27.01 sn |
| Native b9380 grammar | GEÇTİ | 22/22 şema örneği; çıkarım değil |
| Gerçek yerel model çıkarımı | ENGELLİ | 0 deneme; GGUF yok |
| Windows EXE üretimi | YAPILMADI | Bu ortam Linux |
| Canlı kurum/klinik kabulü | YAPILMADI | API fixture kullanıldı |
| Kaynak bütünlüğü | GEÇTİ | 2652 kaynak dosyası; SHA-256 manifesti |

`npm run verify`, yeni doğal akış/bellek/Ollama indirme testleri, model/CAD sözleşmeleri, kaynak/arayüz denetimleri, lint, TypeScript, deterministik CAD/kernel, yerleşim/şekillendirme/undo ve üretim derlemesini kapsar. Tarayıcılar ve bu zincir paylaşılan `.next` nedeniyle sırayla çalıştırıldı. Genel arayüz testi 46 dil paketi ve üç oyunun gerçek etkileşimini, beş oyunun katalogda bulunmasını kontrol eder; beş oyunun tamamının yeni kabul testi değildir.

CAD daily gerçek React/Three.js editörü ve sentetik sunucu ile koleye yerleştirme, ünite geçişi, gerçek mesh kontrolü, şekillendirme, undo/redo, kurtarma, kayıt/çıkış ve yayınlama kapılarını denetler. Model yanıtları sentetiktir. Ayrı görünüm/inceleme/operasyon/restorasyon tarayıcı matrisleri bu sürümde yeniden koşulmadı; önceki raporlar yeni doğrulama sayılmadı.

İlk genel doğrulama, yeni kurulum metinlerinin ortak i18n katmanında yer alması gereğini yakaladı; metinler TR/EN fallback modülüne taşınıp aynı görünen davranış korundu ve tüm zincir yeniden çalıştırıldı. Bazı ilk tarayıcı koşuları eski test beklentilerinde durdu: örtük rehber yanıtı, eşleşmeyen rehber sorusuna genel cevap, yinelenen kullanıcı satırı ve üç oyun beklentileri. Yeni açık kaynak seçimi/yanıtsız hata sonucu/tekrar gönderme ve mevcut beş oyun davranışına göre testler düzeltildi; Uygula, kapsam, gerçek geometri veya kayıt kapısı iddiaları gevşetilmedi.

Kanıtlar: [kaynak](verification/RC61/source-verification.json), [tarayıcı](verification/RC61/browser-results.json), [native grammar](verification/RC61/native-grammar-report.json), [gerçek çıkarım engeli](verification/RC61/native-inference-report.json), [resmî model erişimi](verification/RC61/native-access-report.json). Aynı klasörde gerçek çıktı kayıtları ve 59 güncel ekran görüntüsü bulunur.

## Açık kalanlar

Native erişim raporundaki kurulum arayüzü bulguları RC60 tabanında, RC61 düzeltmelerinden önce kaydedilmiştir; yeni 4B erişimi bu rapordaki eksikliği giderir. Resmî HuggingFace, ModelScope ve Ollama dağıtımlarına bu ortamdan proxy CONNECT 403 alındı; resmî Qwen GitHub releases sayfasında model dosyası yok. GGUF ağırlığı bulunmadığından native kabul betiği motor sürüm/hash doğrulamasından sonra model aşamasında durdu: doğal sohbet 0, bellek 0, CAD model yanıtı 0. Yeni kabul betiği bu üç yolu ayrı sınar; gerçek çıktı ve insan semantik incelemesi hâlâ gereklidir. Bu kaynak testleri “AYA gerçek modelle tamamen hazır” sonucu değildir.

Windows kurucusu üretilmedi ve kullanıcının EXE kurulumunda denenmedi. Kaynak ZIP kurulu EXE'yi kendiliğinden güncellemez; Windows derlemesi gerekir. 4B model kullanıcının bilgisayarında kurulup yanıtı test edilmelidir. Modelin doğruluğu veya hızı garanti edilmez.

Ana sohbetin gönderilmemiş taslağı sayfadan ayrılma/yenilemede kalıcı değildir. localStorage çok pencere denetimi iyimserdir; atomik kilit değildir. Klinik/üretim, canlı kurum ve tam 46 dil/modül uçtan uca kabulü tamamlanmış sayılmaz. Gerçek içerik sayıları değişmedi: 500 kısa bilgi/60 kaynak, 1008 yardımcı kayıt, 120 hacim etkili SVG logo, 5 oyun, 72 görünüm.
