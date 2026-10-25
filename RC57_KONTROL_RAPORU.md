# DentAYA RC57 kontrol raporu

Sürüm `1.0.0-rc.57`, AYA Core `0.13.0`. Taban RC56: `2d70381f79b76282da499f27200a932985497835`. Kanıt toplama: 2026-10-25T03:00:28+03:00. Bu rapor güncel RC57 süreçlerini anlatır; önceki sürümün testleri yeni doğrulama sayılmaz.

## AYA sohbeti ve çalışma belleği

Yerel yanıtı test et işlemi yazılmamış sorudan ayrı tutulur. Başarı, timeout, iptal ve tekrar göndermede kullanıcının taslağı korunur. Tekrar gönder başarısız tanı isteğini model zorlamasıyla yineler; normal başarısız soruda düzenlenen taslak gönderilir. Sabit tanı sorusunu düzenle düğmesi kullanıcının başka taslağını ezmez.

Mesajsız bir oturumun son hedefi/kararı temizlenince eski bellek-only kayıt yeniden açılışta geri gelmez. Yeni boş oturumlar saklanmaz; geçmiş saklama tercihi korunur. Silme yalnız açıkça düzenlenmiş mevcut oturumun kendi kaydına uygulanır. Başka pencerenin daha yeni belleği sessizce silinmez. Yeni sohbet/oturum seçimi başarısız istek ve bellek düzenleme sahipliğini temizler.

Normal Core CAD yardımı ilk uygulanabilir adımla başlar. Yerleşim şikâyeti otomatik tam QC isteği sayılmaz; ilgisiz mesh/antagonist dökümü azaltıldı. Açık analiz, kayıt hatası, kaynak/kole eksikliği, olumsuz/karma istekler ve iç uyum sınırları korunur. CAD diyalog kontrolü 48 grup, kesit yardım kontrolü 15 grup içerir. Bunlar temel model eğitimi değildir; hazır soru kataloğu artırılmadı.

## Gerçek kesit kanıtı ve CAD

AYA mevcut görüntülenen restorasyon/tarama kontur uzunluğunu ve güvenilir kapalı alanı yorumlayabilir. Kanıt düzlem normal/sabiti, kaynak önizleme bilgisi ve güncel veri anahtarı taşır; ham üçgen tamponu modele gönderilmez. Sayılar yalnız gerçekten hesaplanan sonuçlardan gelir. Açık, çakışan, coplanar, karmaşık veya sınırlandırılmış kesitte alan verilmez; null alan sıfır değildir. Kaynak sadeleştirilmiş görüntüleme mesh'i ise tam çözünürlüklü ölçüm iddiası kurulmaz. Kesit alanı/uzunluğu duvar kalınlığı, intaglio veya klinik uyum değildir.

Viewport kanıtı yalnız uygulanmış ayar/marjin referansları, yüklenmiş doğru kaynak, canlı ünite anahtarı ve hazır sahne eşleştiğinde yayımlar. Kaynak yükleme, ünite değişimi, kesiti kapatma veya bağlam değişimi kanıtı temizler. Aynı sayısal alanı veren ters düzlemde dahi yeni kimlik/düzlem gönderilir. Host eski anahtarı reddeder; güncel kanıt değişimi bekleyen model yanıtını geçersizleştirir.

Tam çakışan kopya yüzler önceden temiz alan gibi sayılabiliyordu. Yüz ve kesit kenarı tekrarları denetlenir; farklı üçgenlemeyle kopyalanmış kabuklar da duplicate-face uyarısıyla alanı gizler, çizgileri korur. Paylaşılan uçtan geriye binen pozitif aralıklar self-intersection sayılır. İndeksli/indekssiz kopyalar, farklı üçgenlemeler, kısmi örtüşmeler ve geçerli ortak kenar kesimleri ayrı regresyonlarla denetlendi.

QC arayüzü değişen ünite/geometri/ilgili ayardan sonra önceki sayıları göstermez; yenileme açıklaması sunar. Güncel rapor eşzamanlı geometri nesliyle ilişkilendirilir; shell oluştur/onar/temizle sonrası aynı olayda alınan taze rapor kaybolmaz. Sırf görev sekmesi değişti diye geçersizleşmez. Manuel QC ile AYA aynı taze özeti kullanır; rapor değişimi bekleyen model yanıtını iptal eder. Modelden bağımsız CAD, ilk sekiz manuel araç, 27 tipli AYA komutu, kullanıcı Uygula kapısı, anatomik başlangıç, kole kaydı, yerel kurtarma, geri alma ve STL kapıları korunur. Yeni typed komut veya otomatik geometri ajanı eklenmedi.

Gerçek WebGL testi kesit değerlerinin AYA bağlamına ulaşmasını ve model hatasında Core'un aynı sayıları yorumlamasını denetler. Düzlem ters çevrilirken sayılar aynı kalmasına rağmen yeni düzlem modele aktarılır; kesit kapalıyken kanıt kaldırılır. Günlük test gerçek şekillendirme/ünite değişiminden sonra eski QC'nin gizlendiğini, implant kole yerleşimini, geri al/yinele, kayıt hatası, kaydet/çık ve kurtarmayı denetler. Üç preparasyon fixture'ında 46 kuron, 47 kapşon ve 16 üst kuron yeniden açılış ve ham koordinatlarda STL eşleşmesiyle doğrulanır. Bunlar sentetik tarama/backend verileridir.

## Masaüstü klavye odağı

Modüller menüsünün native close olayı gecikmeli geldiğinde kullanıcı hızlı aramaya geçmiş olsa da eski tetikleyiciye odak zorlanabiliyordu. Kapanan menünün odak iadesi artık kullanıcının başka kontrol veya diyaloğa taşıdığı odağı çalmaz. Native modal, Escape ve Ctrl+K/Alt+M akışları korunur; tarayıcı regresyonu aynı görev içinde kapatıp yeni tetikleyiciye geçerek gecikmiş close olayını denetler.

## Kurtarma ve ortak arka plan paletleri

Kayıt sonrası kurtarma karşılaştırması UI kaynak kimliğini (`scan:…`) geometri yükleyicisinin kaynak parmak iziyle aynı tür kimlik sanıyordu. Farklı kimlik alanlarının karşılaştırması kaldırıldı. Yerel ve uzak tam snapshot/parmak izi, ayarlar, kole, ölçümler, aşama, durum ve zaman denetimleri korunur. Farklı uzak parmak izi ve korunmuş/yeni yerel düzenlemeler kurtarılabilir kalır; yalnız zaman damgasıyla silme yapılmaz. Günlük tarayıcı testi başarılı kayıt/yeniden açılış ve saklanan çevrimdışı kurtarmayı birlikte denetler.

İstenen görsellerden renk referansı alınarak Ayarlar → Görünüm içindeki ortak renk/arka plan kataloğuna yeni seçenekler eklendi. Neon Midnight, Graphite Turquoise, Deep Turquoise ve Deep Coral seçenekleri lacivert/siyah zeminleri ve blokların turkuaz/pembe renklerini kullanır. Ortak katalog 68 yerine 72 görünüm içerir. Seçim genel uygulamaya ve mevcut tema bağlantısıyla CAD sahnesine uygulanır; önceki tercihler ve kamera hızları korunur. Mini oyunlara özel yeni tema eklenmedi. Güncel appearance tarayıcı kontrolü seçim, kalıcılık, içe/dışa aktarma, mobil sınırlar ve ortak CAD tercih bağlantısını denetler.

## Bağlam bütçesi ve yerel model sınırı

Kesit girdisi sayısal ve sınırlı tutulur; bilinmeyen uyarı metni talimat olarak modele taşınmaz. Yönergeler anlamı koruyarak kısaltıldı. Gerçek yerel köprü testinde mevcut tam QC, son araç sonuçları, hedef, 27 araç ve yeni kesit kanıtı 8192 bağlam içinde 2048 yanıt payıyla birlikte korunur. Bütçe yükseltilmedi, güncel kanıtı atarak test geçirilmedi.

Resmî sabit Qwen GGUF erişimi güncel denemede yine proxy CONNECT 403 verdi. b9380 motor/sürüm/hash kontrolü ve C++ grammar 22/22 geçti; gerçek model kabul betiği eksik ağırlıkta model-validation/ENOENT aşamasında durdu. Gerçek çıkarım 0 vaka; model anlamsal kalitesi doğrulanmadı. Sohbet ve tarayıcı model yanıtları mock'tur. Buluta otomatik geçiş eklenmedi.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| aya-conversation | GEÇTİ | 38.49 sn |
| aya-state | GEÇTİ | 21.26 sn |
| aya-work | GEÇTİ | 22.5 sn |
| appearance | GEÇTİ | 156.9 sn |
| cad-daily | GEÇTİ | 200.38 sn |
| cad-restoration | GEÇTİ | 249.38 sn |
| desktop-shell | GEÇTİ | 41.46 sn |
| cad-inspection | GEÇTİ | 510.71 sn |
| full-verify | GEÇTİ | 187.82 sn |
| loading-reading | GEÇTİ | 25.05 sn |
| Native b9380 grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 2395 dosya; gerçek boyut ve SHA-256 eşleşmesi |

Tam verify; yeni kesit diyalog/normalizer ve analitik geometri regresyonları, yerel köprü/token bütçesi, bellek, çalışma akışı, mevcut CAD/implant/kütüphane/kayıt, çeviri, migration/PGlite ve modül kontrolleri ile sıfır uyarılı lint, TypeScript ve standalone üretim derlemesini içerir. Son yükleme testi derlenmiş uygulamada çalışır; zorunlu beş saniye beklemesi yoktur. Tarayıcı fixture paketleri ve genel verify sırayla çalıştırıldı.

Kanıtlar: [kaynak](verification/RC57/source-verification.json), [tarayıcılar](verification/RC57/browser-results.json), [grammar](verification/RC57/native-grammar-report.json), [motor erişimi](verification/RC57/native-runtime-report.json), [model engeli](verification/RC57/native-inference-report.json). Güncel loglar ve 61 ekran görüntüsü aynı klasördedir. [Gerçek kesit/AYA](verification/RC57/screenshots/RC57_AYA_Section_Evidence.png), [korunan taslak](verification/RC57/screenshots/RC57_AYA_Diagnostic_Draft.png), [yeniden açılmış boş bellek](verification/RC57/screenshots/RC57_AYA_Empty_Memory_Reload.png), [eski QC kaldırılması](verification/RC57/screenshots/RC57_CAD_Stale_QC.png), [Grafit arka plan](verification/RC57/screenshots/RC57_Background_Graphite_Desktop.png), [CAD lacivert arka plan](verification/RC57/screenshots/RC57_Background_CAD_Midnight.png).

## Korunan kapsam ve tamamlanmayanlar

RC56 Lab Yöneticisi, 120 hacim etkili SVG logo, 5 mini oyun, 500 TR/EN bilgi kartı/60 kaynak ve 1008 hazır soru kataloğu korunur. RC57'de logo/oyun sayısı artırılmadı; genel kaynak kontrolleri çalıştırıldı, önceki 720 logo tarayıcı kombinasyonu bu sürüme ait yeni test sayılmadı. Yeni kesit/yardım metinleri TR/EN ve diğer dillerde İngilizce fallback kullanır; 46 dilde yeni editoryal çeviri iddiası yoktur. 30.000 gerçek içerik hedefi tamamlanmadı.

Windows EXE üretimi/çalıştırması, gerçek model anlamsal kabulü ve canlı kurum/klinik kabulü yapılmadı. exocad eşdeğerliği, tüm modüllerin profesyonel üretim kabulü ve intaglio/üretim uygunluğu tamamlanmış sayılmaz. Teslim tam kaynak ZIP'idir; önceki RC paketlerinin ayrı kurulması gerekmez.
