# DentAYA RC59 kontrol raporu

Sürüm `1.0.0-rc.59`, AYA Core `0.15.0`. Taban RC58: `0642a3966d2998a47d6f79364abac82aea72b4a6`. Kanıt toplama: 2026-10-26T20:25:36+03:00. Bu sürüm AYA'nın bağlam, kayıt ve yaşam döngüsü hatalarını düzeltir. Gerçek yerel model anlamsal kabulü tamamlanmadığı için AYA'nın tümüyle bitmiş veya klinik üretime kabul edilmiş olduğu iddia edilmez.

## Konuşma bağlamı ve bellek

Uzun geçmiş mesajlarının yalnız ilk 2400 karakteri tutulduğu için sona eklenen düzeltme ve olumsuz kısıtlar sonraki turda kaybolabiliyordu. Artık mesajın başlangıcı ve sonu birlikte korunur; atlanan orta bölüm `[history shortened]` ile işaretlenir. İlgili eski konuşma çiftlerini seçerken son düzeltmeler de taranır. Son bütçe azaltımı başlangıç ve sonu 600/400 karakter tabanlarında da korur. Güncel istek, canlı CAD ve bellek sınırları değişmedi. Saklanan asıl mesajlar kısaltılmaz. Gerçek yerel köprü girdisi test edildi; testte model çıkarımı mock'tur. Her eski ayrıntının sınırlı bağlama sığacağı garanti edilmez.

Sohbet kaydında tam normalize edilmiş kayıt revizyonu karşılaştırılır. Başka pencerede daha yeni yazılmış veya silinmiş kayıt, eski penceredeki gecikmiş yanıt tarafından sessizce değiştirilmez. Çakışmada bu pencerenin konuşması, belleği ve taslağı korunur. Kullanıcı saklanan güncel kaydı yükleyebilir veya çalışmasını ayrı sohbet olarak kaydedebilir. Yükleme yazılmamış mesajı korur; silinmiş kayıt kendiliğinden yeniden oluşturulmaz. Başarısız Sil işlemi mevcut sohbeti ve satırı korur. Geçmiş kapatma ve mesajsız son belleği açık temizleme kuralları sürer. Depolama şeması değişmedi. Bu, localStorage üzerinde iyimser revizyon denetimidir; gerçek eşzamanlı yazmalar için veritabanı işlemi veya atomik pencere kilidi iddiası değildir.

Tarayıcı testi aynı origin'de iki gerçek sayfa açar; bekleyen model yanıtı sırasında diğer pencereden hedef günceller, kayıt siler ve kota hatası üretir. Yeni kayıt/ayrı kopya/taslak ve başarısız silme korunması kontrol edilir. Model yanıtları sentetiktir.

## CAD taslağı ve uygulanabilir yardım

CAD asistanı kapatılıp aynı proje/kaynak/ünitede açıldığında yazılmamış taslak korunur. Normal istek beklerken kapanan panelin sorusu yeniden denemek için geri gelir. Önceki isteğin sonradan tamamlanması yeniden açılmış panelde yazılan yeni taslağı değiştiremez. Mevcut tek otomatik geometri-kontrol yorumu kullanıcının taslağını tüketmez; başarı, geçersiz yanıt, motor hatası, iptal ve eski bağlamda sentetik yorum sorusu taslağa yazılmaz. Geç gelen gerçek araç sonucu mesaj/bellek/kanıt akışını kullanır; yeni panelin taslağına dokunmaz. Güvenli motor başlangıç açıklamaları CAD'de de kullanılır.

Host'un post-commit tek kullanımlık kanıtı, scope/snapshot/dataToken filtreleri ve 27 tipli araç sözleşmesi korunur. Öneri kendiliğinden geometri işlemi çalıştırmaz; kullanıcı **Uygula** tıklar. Deterministik kernel, implant kole yerleşimi, ham model üzerinde kuron/kapşon, fırça/geri al/yinele, ünite/vaka geçişi, kayıt hatası, yerel kurtarma ve kaydet/çık mevcut akışlardır. Güncel gerçek WebGL günlük ve inceleme testleri bu yolları yeniden denetler. Sentetik tarama/backend verisi kullanılır; klinik iç uyum veya üretim kabulü değildir.

## Yerel motor

Motor başlangıcı model dosyası veya loopback portunu beklerken Stop/kapanış gerçekleşirse bekleyen iş artık sonradan süreç oluşturamaz. Zaten iptal edilmiş istek spawn yapmaz. Stop sonrası yeni istek başlayabilir; dispose kalıcıdır. Bu hata orijinal RC58 kodunda gerçekten yeniden üretildi: iptal edilmiş istekte spawn sayısı 12 kalacağına 13 oldu. Yeni regresyon kaynak düzeltmesiyle geçer.

Önbellekteki doğrulanmış dosyanın hash kontrolü sırasında iptal de tamamlanmış kurulum sayılmaz. İptal edilmiş kurulum ready yayımlamaz. Sabit indirme hashleri, HTTPS/host izin listesi, loopback ve süreç anahtarı, token bütçesi ve buluta otomatik geçmeme korunur. Başlangıç hatası için önceki on güvenli teşhis regresyonu ve beş yeni süreç yaşam döngüsü vakası geçti.

Resmî sabit Qwen3 1.7B Q8_0 adresine güncel yetkili ağ denemesi yine **proxy CONNECT 403** verdi; origin HTTP yanıtı alınmadı. Bu otomatik onay reddi veya Hugging Face origin 403 değildir. Ağırlık indirilmedi; hash/pin değiştirilmedi ve alternatif güvenilmeyen kaynak kullanılmadı. Gerçek çıkarım betiği çalıştırıldı fakat model-validation/ENOENT aşamasında durdu: **0 çıkarım vakası**, modelin Türkçe/anlamsal kabulü doğrulanmadı. Gerçek b9380 C++ grammar **22/22** geçti; güncel yanıt şema hashleri eşleşir. Grammar testi model çıkarımı değildir.

## Güncel doğrulamalar

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| aya-conversation | GEÇTİ | 32.75 sn |
| aya-state | GEÇTİ | 42.14 sn |
| aya-work | GEÇTİ | 19.34 sn |
| cad-daily | GEÇTİ | 245.13 sn |
| cad-inspection | GEÇTİ | 529.74 sn |
| full-verify | GEÇTİ | 173.89 sn |
| loading-reading | GEÇTİ | 27.24 sn |
| Native b9380 grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 2509 dosya; gerçek boyut ve SHA-256 eşleşmesi |

Tam verify; AYA parser/bellek/bütçe/yerel köprü ve motor, kullanıcı arayüzü durumu, CAD araçları/kesit/yerleşim/kernel/kütüphane/kayıt, mevcut modül/migration/PGlite, güvenlik, çeviri ve sürüm denetimlerini; sıfır uyarılı lint, TypeScript ve standalone üretim derlemesini içerir. Ardından derlenmiş uygulamada yükleme testi çalışır. Zorunlu beş saniyelik bekleme yoktur. Tarayıcı fixture testleri ve genel verify sırayla çalıştırıldı.

Kanıtlar: [kaynak](verification/RC59/source-verification.json), [tarayıcı](verification/RC59/browser-results.json), [motor](verification/RC59/native-runtime-report.json), [grammar](verification/RC59/native-grammar-report.json), [gerçek model engeli](verification/RC59/native-inference-report.json), [resmî model erişimi](verification/RC59/model-access-report.json). Aynı klasörde 31 güncel ekran görüntüsü ve test logları bulunur. [İki pencere çakışması](verification/RC59/screenshots/RC59_AYA_Two_Window_Conflict.png), [silinen kaydın korunması](verification/RC59/screenshots/RC59_AYA_Deleted_Record_Recovery.png), [CAD taslağı](verification/RC59/screenshots/RC59_CAD_AYA_Draft_Preserved.png), [gerçek host sonucu](verification/RC59/screenshots/RC59_Host_Action_Receipt.png).

## Korunanlar ve açık sınırlar

RC58 sol üst klasör menüsü ve robot kaldırılmış İş takibi korunur. RC59'da ayrı tam desktop/operasyon/professional-shell browser paketi yeniden çalıştırılmış sayılmaz. Ayrı üç preparasyon/STL browser paketi, tüm 72 görünüm/46 dil matrisi de yeni kabul sayılmaz. Güncel CAD inceleme testi dört referans arka planın gerçek GL rengini kontrol eder. Yeni logo, oyun, katalog veya geometri ailesi yoktur.

Gerçek sayılar: 500 TR/EN bilgi kartı, 60 kaynak, 1008 soru kataloğu, 120 hacim etkili SVG logo, 5 mini oyun, 72 görünüm. SVG'ler gerçek 3B mesh değildir; 30.000 gerçek içerik hedefi tamamlanmadı. Gerçek model anlamsal kabulü, Windows Setup EXE üretimi/çalıştırması ve canlı kurum/klinik kabulü eksiktir. exocad eşdeğerliği veya tüm modüllerin profesyonel üretim kabulü iddia edilmez.

RC59 tam kaynak güncellemesidir; önceki paketler ayrı kurulmaz. Bu ZIP hazır Windows EXE veya model ağırlıkları içermez. Kullanım [RC59_KULLANIM.md](RC59_KULLANIM.md), Windows adımları [KURULUM.txt](KURULUM.txt) içindedir.
