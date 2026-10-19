# DentAYA RC42 — kontrol raporu

Sürüm **1.0.0-rc.42** · 15 Ekim 2026.

Bu paket RC41'in tamamını içerir. Eski diş formlarına dönüş, teknisyen STL/OBJ kütüphanesi, implant kole yerleşimi, tam geometri kaydı ve kayıt/çıkış/kurtarma mekanizması korunur. Yeni veritabanı migration'ı yoktur. Geometri kayıt anahtarlarındaki `legacy-rc37` ve `library-rc41` değerleri özellikle korunmuştur; yalnız sürüm numarası değiştiği için şekillendirme sıfırlanmaz.

## AYA

AYA Core 0.2; açıkça eklenen cihaz notlarını, içe alınan metin belgelerini ve sınırlandırılmış CAD iş durumunu kullanır. Bilgi araması, kaynak gösterimi, hesaplama ve motorsuz iş akışı yardımı ortak çekirdektedir. Kullanıcının soru sorması hasta dosyalarını veya tarama geometrisini otomatik okuma yetkisi vermez; bu sürümde bunlar otomatik okunmaz.

Masaüstü, llama.cpp motorunu ve varsayılan Qwen3 1.7B Q8_0 modelini kurup yönetir. İndirmeler sabit boyut ve SHA-256 ile doğrulanır. Harici API anahtarı ve Ollama zorunlu değildir. Başlatılan motor yalnız 127.0.0.1 üzerinde, rastgele port ve süreç anahtarıyla çalışır. Akan yanıtlar istek kimliğiyle eşlenir. İptal, kurulum/sohbet eşzamanlılık sınırı, süreç kapatma ve gerçek tokenizer ile bağlam bütçesi vardır.

Yeni bir temel model eğitilmedi veya ince ayar yapılmadı. Bilgi defteri, model ağırlığı eğitimi değildir. Yerel modelin genel Türkçe veya tüm 46 dilde yanıt kalitesinin kapsamlı değerlendirildiği iddia edilmez.

## CAD

Teknik palet çalışma çenesi için `#83827e`, antagonist için `#ff4800`, restorasyon için `#f2d56b` kullanır. Nötr aydınlatma tema renginin geometriyi boyamasını önler. Üst/alt çene rolleri aktif FDI'ye göre belirlenir. Göster / Gizle paneli ilk açılışta görünürdür; yüzde saydamlık, sıfırdan geri açma, tek başına gösterme, tümünü gizleme/gösterme, ünite görünürlüğü, geçici Alt görünümü ve kamera yönüne bağlı antagonist gizleme içerir.

Yerleştirilmiş diğer üniteler aktif ünite değişirken sahnede kalır. Aktif ünite düzenlenir; her ünitenin kole, geometri ve yerleşimi kendi proje kaydında saklanır.

Kapanış, tarama dosyalarının ortak kayıtlı koordinatlarını kullanır. Açılma 0–12 mm görüntüleme dönüşümüdür; 0 mm dosyanın kayıtlı kapanışıdır. Kontak renkleri ve kontrolü gerçek antagonist yüzeyine göre hesaplanır. Antagonist yokken çalışma modeli sahte antagonist olarak kullanılmaz. Kaynak geometri açılma/saydamlık değişiminde değiştirilmez. Bu sürüm kinematik artikülatör veya otomatik tarama hizalama içermez.

## Kontroller

| Kontrol | Sonuç ve kapsam |
|---|---|
| Ana doğrulama zinciri | Derleme dışındaki 34 çekirdek komut, sıfır uyarılı lint, TypeScript ve Next.js üretim derlemesi: toplam 37 komut. Ayrı günlükler `verification/RC42` içindedir. |
| Gerçek yerel çıkarım | llama.cpp b9380 ve resmi Qwen3 1.7B Q8_0 ile Linux CPU üzerinde gerçek yanıt ve akış alındı. 16:40 ve Kuzey rafı deneme notundan doğru kullanıldı. Bulut/Ollama çağrısı yapılmadı. Gerçek template/tokenizer uçları da kullanıldı. |
| Windows motor arşivi | Resmi 16.067.676 bayt arşivin SHA-256 değeri doğrulandı ve uygulamanın çıkarma koduyla gerekli EXE/DLL dosyaları çıkarıldı. Windows EXE'si çalıştırılmadı. |
| Motor sınırları | Parçalı indirmeyi sürdürme, yanlış checksum ve güvenilmeyen yönlendirme reddi, arşiv yol kaçışı reddi, GGUF içe aktarımı, bağlam azaltma, loopback kimlik doğrulama ve akış doğrulandı. Bu çekirdek testte süreç/çıkarım taklit edilir; gerçek çıkarım ayrı satırdadır. |
| Masaüstü IPC | Sahip pencere, ana frame, origin, başka pencerenin iptali, kurulum/model ekleme kanalları ve meşgul durum korumaları geçti. Electron pencereleri testte taklit edilir. |
| AYA arayüzü | Kurulum akışı, kurulu model seçimi, kısmi ve tamamlanmış yanıt, eski istek token'ının yok sayılması, iptalde sorunun korunması, Core/model/belge ayrımı ve bilgi defterinin yeniden açılışta korunması geçti. Bu tarayıcı akışında model yanıtı taklit edilir. |
| Gerçek CAD görünümü | Yazılımsal WebGL ile teknik materyal renkleri, yüzde sıfırdan geri açma, tamamen gizleme, geçici Alt görünümü, antagonist açılması ve sıfır kayıtlı kapanış geçti. |
| Çok üniteli tasarım | Yerleştirilmiş iki restorasyonun aynı anda çizilmesi ve bir üniteyi gizleyip açma gerçek editörde doğrulandı. İçe alınmış form ve şekillendirme kayıt/yeniden açılışta korundu. |
| Günlük CAD | Sentetik implant dayanaklarında kole yerleşimi; STL/OBJ kütüphanesi; kaydet/çık onayı; hata halinde açık kalma; açıkça seçilen yerel çıkış ve kurtarma; yayın öncesi kayıt ve eşzamanlı kayıt çatışması reddi geçti. |
| Genel ekran | Sekiz araç, gerçek şekillendirme, geri al/yinele, gizli hedef koruması, panel taşıma/klavye, tema/dil değişimi ve mobil sınırlar geçti. |
| Dil paketleri | 46 dil; 4.849 kaynak anahtarı. Yeni kısa başlıklar burada hazırlanıp 45 çeviri paketine ve masaüstü kopyalarına eklendi. Paket bütünlüğü ve arayüzde kullanıcı metinlerinin korunması geçti. Ana dil editör incelemesi iddia edilmez. |
| Eski formlar | RC37 dosya/kod hash karşılaştırması ve özgün form kontrolleri geçti; iptal edilmiş 24 aile ve `public/tooth-forms` geri eklenmedi. |

CAD tarayıcı kontrolleri gerçek editörü kullanır; veri sunucusu yanıtları test tarafından karşılanır. Canlı hasta kayıtları üzerinde işlem yapılmadı. Kontrol ekranları dahili inceleme içindir ve dağıtım ZIP'ine eklenmez.

## Referans ve teslim

Göster/gizle ve antagonist görünümü için exocad'in herkese açık Group Selector ve kontak belgeleri incelendi. Gri/kırmızı teknik renk örnekleri kamuya açık yapılandırma rehberinden alındı; uygulama kodu DentAYA içinde yazıldı. Exocad kodu, ekran görüntüsü veya lisanslı diş kütüphanesi pakete alınmadı. Tam Exocad işlev eşitliği iddia edilmez.

- https://wiki.exocad.com/wiki/index.php/CAD_Module
- https://wiki.exocad.com/wiki/index.php/Visualizing_contacts_and_occlusions
- https://content.exocad.com/content/secure-area/exocad_DentalCAD_Configuration_Guide_DentalCAD_Platform_en.pdf

Bu teslim kaynak ZIP'idir. Hazır Windows kurulum EXE'si bu ortamda üretilmedi veya çalıştırılmadı. Windows'ta çalışan `.env.local` ile `DENTAYA_GUNCELLE_DERLE.cmd` kullanılmalıdır. `node_modules`, `.next`, gerçek bağlantı dosyaları, model ağırlıkları, native test ikilileri ve QA görselleri dağıtımda bulunmaz. Paket kaynak hash özeti ve ZIP CRC kontrolü teslim öncesi doğrulanır.
