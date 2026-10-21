# DentAYA RC55 kontrol raporu

Sürüm `1.0.0-rc.55`, AYA Core `0.11.0`. Tarih: 2026-10-21T22:39:49+03:00. Taban RC54: `2fd54030f62eadccafbb6e71dc61b65a7e29abdb`. Bu rapor RC55 üzerinde çalıştırılan kontrolleri açıklar.

## Kuron ve kapşon yerleşimi

- Restorasyon hedefi, etkin ünitenin ham tarama modeli üzerindeki kole çizgisidir. Başka bir kuron/kapşon yerleştirme kaynağı değildir. Geçerli hedef belirlenmeden başlangıç formu sahne merkezinde gösterilmez; Tümünü göster bunu açmaz.
- İlk kuron, kapşon, cutback ve geçici kuronun yüksekliği ham preparasyonun kole içindeki örneklerinden hesaplanan dış zarfı hesaba katar. Kole tabanı yukarı taşınmaz. Bu değişiklik, test modelinin kuron fossasından dışarı taşması sorununu giderir. Yalnız dokunulmamış varsayılan başlangıçlara uygulanır; elle şekillendirilmiş veya kişisel kütüphaneden gelen işler yeniden modellenmez.
- Kole merkezi nokta yoğunluğundan bağımsız poligon alan merkeziyle hesaplanır. Düz servikal kapağın iç noktaları dış sınıra yığılmaz. Eğik ve ters eksende tüberkül yüksekliği değiştirilirken servikal taban aynı hedefte kalır. Aynı koleye tekrar yerleştirme ikinci kuron oluşturmaz veya yüksekliği tekrar artırmaz.
- Doğrulanan 46 kuron, 47 kapşon ve 16 üst çene kuronu; gerçek WebGL/kernel, gerçek ünite kontrolleri ve sentetik preparasyon taramaları kullanır. Testte açıkça seçilen 0,02 mm ofset korunur; gerçek sahne mesh'inin servikal merkezi ve çevresi ölçülür. Bunlar hasta taraması değildir. Görsel incelemede 46 fossasından görünen ham model çıkıntısı artık görülmedi.
- Servikal kayıt ölçümleri seçili koleye uzaklıktır; preparasyon/iç yüzey uyumu değildir. Ham kaynak yüksekliği örneklemesi sınırlı bir eksensel başlangıç tahminidir; normal yönündeki duvar kalınlığı veya üretim uygunluğu ölçümü değildir. Seyrek kaynak örnekleri veya sınırlama dışı geometrilerde otomatik büyütme yapılmaz. Antagonist, temas, iç uyum ve klinik kabul ayrıca değerlendirilmelidir.

## Anatomi, görünüm ve kayıt koruması

Altı mevcut form, diş grubuna göre insizal kenar, kanin tüberkülü, premolar/molar tüberkülleri, fissür/fossa ve kenar sırtları içerir. Bunlar deterministik başlangıç dış formlarıdır; taranmış hasta anatomisi veya tam doğal diş kütüphanesi değildir. Kapşon rölyefi daha yumuşaktır. 12 restorasyon türü ve iptal edilen RC38 ailelerini geri getirmeme kuralı korunur. RC37 görüntü referansları değişmez; yeni kullanıcı talebi doğrultusunda eski CAD kurucusunun byte-hash dondurması kaldırılmıştır.

Doğal görünümde restorasyon, yeni oluşturulan shell ve yeniden açılmış/pasif üniteler aynı Physical yüzey yolunu kullanır. Teknik görünümde mine katmanı kapalıdır. Açıkça seçilmiş mat/metalik yüzey tercihleri korunur; görünüm değişikliği geometriyi değiştirmez.

Yeni varsayılan anatomi ayrı sürüm anahtarı taşır. Dokunulmamış eski başlangıç, geçerli hedefte yükseltilebilir. Düzenlenmiş eski mesh, shell, eksik provenans ve kişisel STL/OBJ kütüphanesi korunur. Eski yerleşmiş kuronda geçersiz veya kaydı başarısız olan kole, yükseltmenin eski mesh/ankrajı silmesine izin vermez; iki gerçek tarayıcı vakası bunu kayıt sonrasında doğrular.

## AYA Core

Core, anatomik form ile yüzey/ışık görünümünü ayırır; kapşonu bitmiş kuron diye sunmaz. Yalnız mevcut araçlarla form kütüphanesi, doğal görünüm, kole/kesit veya geometri incelemesi önerir. `placed`, kole ankrajıdır; preparasyona/iç yüzeye uyum onayı değildir. Hedefe yerleşmediği için gizli başlangıç için Tümünü göster döngüsü yerine kole tamamlama veya yerleştirme önerilir. Olumsuz istekler, ayrı görevler, araç izinleri ve kullanıcı Uygula kapısı korunur. Model yönergesi bu farkı taşır; model eğitimi yapılmadı. 36 kernel/kanıt diyalog grubu geçti.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| cad-restoration | GEÇTİ | 213.87 sn |
| cad-daily | GEÇTİ | 197.47 sn |
| cad-library | GEÇTİ | 119.73 sn |
| cad-inspection | GEÇTİ | 355.1 sn |
| cad-guided | GEÇTİ | 340.86 sn |
| aya-work | GEÇTİ | 18.08 sn |
| aya-conversation | GEÇTİ | 25.07 sn |
| full-verify | GEÇTİ | 200.63 sn |
| loading-reading | GEÇTİ | 25.88 sn |
| Native b9380 JSON grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 2027 kaynak dosyası |

Tam verify; yeni anatomi (72 form vakası, 144 tür varyantı), servikal kayıt (36 senaryo ve yükseklikler), ham kaynak yüksekliği (12 vaka), eski kayıt ve yüzey kontrolleri ile mevcut çeviri, AYA bellek/araç/runtime, CAD kernel, migration/PGlite, sıfır uyarılı lint, TypeScript ve Next üretim derlemesini içerir. Tarayıcı paketleri ve genel verify sırayla çalıştırıldı. Günlük CAD regresyonu koleye yerleştirme, implant, şekillendirme/undo, ünite geçişi, kayıt hatası/başarısı, çıkış ve yerel kurtarma akışlarını sınar; backend fixture'dır. Kütüphane, uzman inceleme/fener/kesit ve kılavuzlu akışlar ayrıca geçti. Standalone üretim yükleme testi zorunlu bekleme veya hazır ekranda kalan katman olmadığını denetler.

Kanıtlar: [kaynak doğrulaması](verification/RC55/source-verification.json), [tarayıcı sonuçları](verification/RC55/browser-results.json), [grammar](verification/RC55/native-grammar-report.json). 28 güncel ekran görüntüsü ve süreç logları aynı klasördedir. Önceki sürümün sonuçları yeni kontrol sayılmaz. Logo varlıkları ve ortak Studio düzeni bu sürümde değiştirilmedi.

## Tamamlanmayanlar

Resmî sabit Qwen GGUF adresinde yetkili ağ denemesi proxy CONNECT 403 verdi. Native b9380 motoru doğrulandı fakat ağırlık dosyası yok: gerçek model çıkarımı **0 vaka**, model anlamsal kabulü doğrulanmadı. Grammar kontrolü gerçek C++ kütüphanesindedir; model çıkarımı değildir. Tarayıcı/bridge testlerindeki model yanıtları mock'tur. [Model erişimi](verification/RC55/model-access-report.json), [native engel](verification/RC55/native-inference-report.json).

Windows EXE üretimi/Windows çalıştırması ve canlı kurum backend kabulü yapılmadı. Teslim kaynak ZIP'idir. Tüm modüllerin profesyonel/klinik kabulü veya exocad işlev eşdeğerliği tamamlanmış sayılmaz. Gerçek kart sayısı 500, kaynak grubu 60, logo sayısı 100, ayrı hazır soru kataloğu 1008; 30.000 gerçek içerik hedefi tamamlanmadı. Logolar hacim etkili SVG'dir, 3B mesh değildir.
