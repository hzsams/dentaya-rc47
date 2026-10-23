# DentAYA RC56 kontrol raporu

Sürüm `1.0.0-rc.56`, AYA Core `0.12.0`. Taban RC55: `c9957942c43690c1cb9a84e9efd6a65e9218a643`. Kanıtların toplanma zamanı: 2026-10-24T02:37:12+03:00. Bu rapor RC56 üzerinde çalıştırılan süreçleri kapsar; önceki sürümlerin geçen testleri yeni kontrol sayılmadı.

## Lab Yöneticisi

Laboratuvar ana sayfasına solda kurum genelindeki açık iş, geciken termin, bugün teslim ve onay sayılarını gösteren panel eklendi. Tam laboratuvar kuyruğu dokuz sabit filtre, 40 satırlık sayfalama, açık sayfada arama ve bağlama göre vaka/CAD bağlantıları sunar. Kurum kapsamı her sorguda uygulanır; sayılar preview satırlarından türetilmez. Yeni migration veya otomatik durum yazımı yoktur. Yeni görünür başlıklar ortak kaynak manifestine ve 45 paket kopyasına eklendi; Türkçe/İngilizce sağlanır, diğer dillerde bu yeni alanlar açıkça işaretli İngilizce fallback kullanır. Önceki çeviri kayıtları değiştirilmez. Ekip bağlantısı owner/admin ile sınırlıdır; mevcut sunucu yetkileri korunur.

Başarısız yenilemede son başarılı snapshot korunur. Aynı başarısız filtre tekrar denenebilir; korunan snapshot üzerinde sayfalama görüntülenen kuyruğu kullanır. Oturum kapandığında veya kullanıcı değiştiğinde eski kuyruk, kurum ve bekleyen istekler geçersizleşir. HomeClient'taki geç gelen üyelik/kurum yanıtlarının önceki kullanıcıyı geri getirmesi de düzeltildi. Tarayıcı regresyonu gerçek hesap UI'sı ve Supabase çapraz sekme bildirimleriyle iki giriş/iki çıkış yapar; geciktirilen eski kuyruk ve üyelik yanıtlarını serbest bırakarak eski hasta referanslarının geri gelmediğini denetler. Backend sentetik fixture'dır.

## AYA Core

“Modelin üstüne kuron yapalım” gibi TR/EN ifadeler kole/yerleşim yardımına bağlandı. Tanım, anatomi, yüzey görünümü ve olumsuz istekler ayrılır. “Peki şimdi?” / “Sonuç nasıl?” yalnız aynı proje/kaynak/ünitedeki ilgili CAD turuna bağlanır; eski ölçüm ve araç sonuçları tekrar güncel kanıt sayılmaz. Geometri değişince eski rapor geçersiz kalır.

Yerel model hatasında güncel CAD rehberi uygulanabilir mevcut önerileri korur ve motor hatasını açıkça gösterir. İptal veya bağlam değişimi yeni öneri üretmez. Hazır model toparlanınca model önceliği sürer. 27 tipli araç sözleşmesi ve kullanıcı Uygula kapısı değişmedi; otomatik geometri komut döngüsü eklenmedi.

Bellek sıfırlama yetkisi noktalama kaldırılmadan önce kontrol edilir. Alıntı, soru, numaralı veya alan bazlı silme isteği bütün hedef/karar/açık soru belleğini temizleyemez. Kısmi patch, ilgisiz alanları korur. Model yönergesi güncellendi; JSON şeması değişmedi. 141 bellek vakası, 25 görev vakası ve 39 CAD kanıt grubu genel verify içinde geçti. En dolu CAD bağlamında 2048 token yanıt payı ayrıldığında giriş bütçesini aşan yönerge kısaltıldı; ilk hedef, güncel CAD kanıtı ve 27 aracın yönergesi korunarak gerçek bridge bütçe testi geçti. Bütçe veya çıktı payı yükseltilmedi. Bunlar model eğitimi değildir.

## CAD tasarımı ve gerçek kesit

Uzman İnceleme paneli gerçek restorasyon ve ham tarama üçgenlerinin seçili düzlemle kesişimini çizer; çizgi uzunluğu mm ve güvenilir kapalı alan mm² gösterilir. İndeksli/indekssiz mesh, dünya dönüşümü, ters düzlem, iç içe boşluklar ve ayrık çevrimler birim testleriyle denetlenir. Açık, dallanan, çakışan, coplanar veya sınırlandırılmış kesitte alan verilmez. Üçgen/segment sayısı ve alan karşılaştırmaları sınırlıdır; yoğun hizalı konturlar da bu sınıra dahildir. Görünüm önbelleği geometri/dönüşüm/düzlem değişiminde yenilenir; çizgi varlıkları kapatmada ve bağlam değişiminde temizlenir. Ölçümler görüntülenen mesh üzerinden hesaplanır; büyük taramalarda sadeleştirilmiş önizlemenin alanı tam çözünürlüklü tarama ölçümü sayılmaz. Bu alan, intaglio uyumu veya duvar kalınlığı değildir. Geometri ve undo geçmişi değiştirilmez.

Daha önce yalnız Son kontrol sayfasını açan STL katalog komutu gerçek aktif ünite indirmesine bağlandı. Yalnız güncel koleye yerleşmiş, kapalı tek gövdeli ve dejenere yüz içermeyen restorasyon ham tarama koordinatlarında dışa aktarılır. Ayrı bağlayıcı katıları birleşmiş üretim köprüsü gibi gönderilmez. Yerel kurtarma araması ve kurtarma kararı bitmeden indirme veya klinik gönderim açılmaz. İndirme başlatılması kayıt/gönderim tamamlandı diye sunulmaz.

Gerçek WebGL regresyonunda 46 kuron, 47 kapşon ve ters eksenli 16 kuronu sentetik ham preparasyonlara yerleştirildi. 46 üzerinde gerçek fırça darbesi, undo/redo ve üç ünite için STL indirme, tek kapalı gövde ve her dışa aktarılan köşenin kaydedilen geometriyle ham koordinatlarda eşleşmesi kontrol edildi. Testte eğik silindirin yaklaşık bounding box merkezi yerine gerçek dönüştürülmüş tarama köşeleri kullanılır. Elle düzenlenmiş kuronda başlangıç minimum yüksekliği dondurulmaz; gerçek düzenlenmiş geometri eşleşmesi aranır. Üniteler kaydedilip yeniden açıldığında mesh'ler birebir korunur. Kolesiz başlangıç dışa aktarılamaz, gizli kalır; başarısız legacy yükseltme önceki mesh ve ankrajı korur.

Günlük akış ayrıca implant/dayanak kole yerleşimi, şekillendirme, ünite geçişi, kayıt hatası, kaydet/çık, yerel kurtarma, geciken kayıt yanıtı, klinik gönderim checkpoint'i ve bağlamlı AYA sonuçlarını denetler. Sentetik taramalar gerçek hasta veya üretim kabulü değildir. Kişisel form kütüphanesinin gerçek STL içe aktarma, üniteye yerleştirme, şekillendirme, yeniden açma, yerel katalog silindikten sonra proje geometrisini koruma ve klinik gönderim checkpoint akışı da ayrıca geçti. Önceki deterministik anatomi ve sekiz manuel araç korunur.

## Logo ve mini oyunlar

Logo sayısı 100'den 120'ye çıktı. 101–120 özgün dental/CAD motifleri; SVG hacim/metal/kenar ışığı katmanları ve PNG/ICO biçimleri içerir. Önceki 01–100 katalog kayıtları ve 900 varlık dosyası baseline SHA-256 karşılaştırmasında değişmedi. 120 logo × 2 tema × 3 görünüm = 720 gerçek tarayıcı kombinasyonu, tercih aktarımı/yeniden açma ve yeni 120. seçim denetlendi. Masaüstü IPC fixture'dır; Windows çalıştırması değildir. Bunlar gerçek 3B mesh değildir.

Önceki üç oyuna Işık Matrisi ve Mine Dizisi eklendi; toplam beş oyun vardır. Işıklar için 4096 ulaşılabilir durum ve kaydırma için 360 durum bağımsız çözüm aramasıyla kontrol edildi; her oyunda 1024 seed denendi. Yeni oyunlar ipucu, geri alma ve ayrı rekor kullanır. Gerçek tarayıcıda ipuçlarıyla çözüm, legal hamleler, tek kazanım kaydı, sekme/hücre klavye erişimi, reload, depolama hatası, çevrimdışı oynama ve 390px düzen denetlendi. Gizlenen hafıza oyununun zamanlayıcısı temizlenir. Oyunlar zorunlu yükleme beklemesi oluşturmaz.

## Çalıştırılan kontroller

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| mini-games | GEÇTİ | 18.66 sn |
| brand | GEÇTİ | 290.48 sn |
| cad-restoration | GEÇTİ | 260.09 sn |
| cad-inspection | GEÇTİ | 370.64 sn |
| cad-daily | GEÇTİ | 187.38 sn |
| cad-guided | GEÇTİ | 358.53 sn |
| aya-work | GEÇTİ | 21.83 sn |
| aya-conversation | GEÇTİ | 25.18 sn |
| aya-state | GEÇTİ | 15.12 sn |
| cad-library | GEÇTİ | 113.12 sn |
| lab-workspace | GEÇTİ | 55.24 sn |
| desktop-shell | GEÇTİ | 46.25 sn |
| full-verify | GEÇTİ | 216.1 sn |
| loading-reading | GEÇTİ | 25.58 sn |
| Native b9380 JSON grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 2310 kaynak dosyası |

Tam verify; mevcut çeviri, AYA runtime/bellek/araç, CAD kernel/anatomi/implant/şekillendirme/kayıt, migration/PGlite ve modül kontrollerini; yeni laboratuvar/oyun/kesit testlerini; sıfır uyarılı lint, TypeScript ve Next standalone üretim derlemesini içerir. Tarayıcı fixture paketleri ve genel verify sırayla çalıştırıldı. Standalone yükleme kontrolü hazır ekranı tutan zorunlu süre/katman olmadığını ayrıca denetler.

Kanıtlar: [kaynak doğrulaması](verification/RC56/source-verification.json), [tarayıcı sonuçları](verification/RC56/browser-results.json), [grammar](verification/RC56/native-grammar-report.json). Güncel loglar ve 64 ekran görüntüsü aynı klasördedir. [Lab paneli](verification/RC56/screenshots/RC56_Home_Lab_Manager.png), [iş kuyruğu](verification/RC56/screenshots/RC56_Lab_Work_Queue.png), [kesit ölçümleri](verification/RC56/screenshots/CAD_Section_Measurements.png) ve [manuel kuron](verification/RC56/screenshots/RC56_manual_crown_design.png) bu koşulardan alınmıştır.

## Tamamlanmayanlar

Sabit resmî Qwen GGUF adresine güncel ağ denemesi proxy CONNECT 403 verdi. Native b9380 motoru ve grammar doğrulandı fakat model ağırlıkları yok: gerçek model çıkarımı **0 vaka** ve model anlamsal kabulü doğrulanmadı. Tarayıcıdaki model/masaüstü köprüsü fixture'dır. Grammar kontrolü gerçek C++ kütüphanesindedir; çıkarım değildir. [Model erişimi](verification/RC56/model-access-report.json), [native engel](verification/RC56/native-inference-report.json).

Windows EXE üretimi/Windows çalıştırması ve canlı kurum backend kabulü yapılmadı. Teslim tam kaynak ZIP'idir; önceki paketlerin ayrı kurulması gerekmez. Tüm modüllerin profesyonel/klinik kabulü, intaglio ve üretim uygunluğu veya exocad işlev eşdeğerliği tamamlanmış sayılmaz. Gerçek bilgi kartı sayısı 500, kaynak grubu 60, logo sayısı 120, oyun sayısı 5 ve ayrı hazır soru kataloğu 1008'dir; 30.000 gerçek içerik hedefi tamamlanmadı.
