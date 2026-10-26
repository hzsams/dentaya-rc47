# DentAYA RC58 kontrol raporu

Sürüm `1.0.0-rc.58`, AYA Core `0.14.0`. Taban RC57: `134b45ec71be134f297b7003bf52cc90aebc02fa`. Güncel kanıt toplama: 2026-10-26T15:33:06+03:00. Önceki RC raporları yeni doğrulama sayılmadı.

## Klasör menüsü ve İş takibi

Tek Modüller düğmesi sol üste taşındı. Klinik, Laboratuvar, Yönetim ve Çalışma alanı altında alt klasörler ve önceki 24 hedef korunur. Liste, klasör simgesi ve aç/kapat düğmeleri kullanır; website kart ızgarası değildir. Arama eşleşen üst yolları açar; temizlemek kullanıcının klasör düzenini geri getirir. Yol değişince eski arama temizlenir, yeni aktif yol açılır, diğer açık klasörler korunur. Aynı sayfada kapatıp açmak kullanıcının arama/katlamalarını sıfırlamaz. Türkçe ve İngilizce metin, diğer dillerde İngilizce fallback vardır. Ok tuşları/Home/End, Enter/Boşluk, Tab, Alt+M ve Escape davranışı korunur. Desteklenmeyen aria-tree klavye sözleşmesi ilan edilmez; native listeler ve disclosure düğmeleri kullanılır.

CAD'deki mevcut Modüller komutu aynı listeyi açar. Ortak uygulama başlığı CAD'de gizli bir ikinci başlık olarak da tutulmaz. İkinci sahne veya CAD'e ek kenar çubuğu eklenmedi. Değişmiş çalışma ve açık vaka geçiş kapıları, mevcut hızlı erişim şeridi tercihi ve RC57 geciken close odak koruması korunur.

Operasyon sayfası kurum kapasitesi, öncelik kuyruğu ve vaka/teslimat metrikleri nedeniyle korunmuştur. Büyük tanıtım alanı, robot, AYA puanı ve modelMode=local iddiası kaldırıldı. `AyaRobot.tsx` ve yalnız ona ait dokuz görsel, diğer kullanımlar denetlenerek silindi. Yeni kompakt ekran **Yönetim → İşler ve finans → İş takibi** altındadır. Sekiz metrik, vaka aşamaları, arama/filtre ve gerçek bağlantılar sürer. Kapasite kaydı owner/admin yetkisi, sürüm eşleştirmesi, tek işlem ve çevrimdışı denetimlerini korur; eksik/başarısız ayar yüklemesinde varsayılanlar kaydedilemez. Mevcut sorgu sınırları (400 vaka, 700 inceleme, 500 gönderi) korunur; bu ekran sınırsız kurum geneli sayım veya canlı kurum kabulü sayılmaz. Yeni backend veya migration yoktur.

## AYA sohbeti, bellek ve gerçek CAD sonuçları

Yerel model testi ayrı ve geçici bir sonuç alanıdır. Test çağrısına boş geçmiş/bellek, kapalı not/bilgi seçenekleri gönderilir; kullanıcının sorusu, kişisel notları veya çalışma hedefi teste taşınmaz. Test yanıtındaki bellek güncellemesi yok sayılır, sonuç normal geçmişe kaydedilmez ve sonraki normal sorunun bağlamına girmez. RC57 taslak koruma, zorlanmış tekrar deneme, iptal ve normal düzenlenmiş soruyu yeniden gönderme davranışları korunur. Geçmiş depolama şeması değiştirilmedi.

Ana sohbet pencere odağında motor durumunu yeniden sorgular. Geçici boş model listesi kullanıcı seçimini kaybettirmez; seçilmiş model yeniden bulunduğunda tercih korunur. İyileşen durum eski durum sorgusu hatasını temizler. Güncel motor başlangıç kodları TR/EN yönlendirmeyle gösterilir.

Modelin merge güncellemesi dolu belleğe yeni karar eklerken eski anlaşmaları sessizce düşürebiliyordu. Birleşim sınırı aşarsa güncelleme atomik olarak reddedilir; önceki hedef/kararlar korunur. Şema ve 27 tipli araç değiştirilmedi; model önceliği, kullanıcı Uygula kapısı ve manuel/deterministik CAD sürer. Bunlar model eğitimi veya sınırsız özerk ajan değildir.

Başarılı CAD sonucu önceden işlem öncesi snapshot/dataToken ile damgalanıp işlem sonrası normalizer tarafından atılabiliyordu. Artık gerçek callback tamamlanınca host bekleyen durumunu commit eder, aynı scope/generation içinde tek kullanımlık güncel kanıt üretir. Panel kendi başına eski sonucu yeni duruma damgalamaz. Proje/kaynak/ünite değiştirip geri dönme, iptal edilmiş bağlam geçişi ve unmount geç gelen sonucu güncel kanıt yapmaz. Eski metin yalnız geçmişte kalabilir; modele güncel sonuç olarak gönderilmez. Katı normalizeWorkspace filtreleri gevşetilmedi. Gerçek browser köprü girdisi Node'daki gerçek normalizer üzerinden de kontrol edilir; held async save + leave/return, eski sonuç sızıntısını denetler.

## Yerel motor ve gerçek çıkarım sınırı

Başlangıç stderr'i IPC'ye verilmeden son 8192 karakter üzerinde sınıflanır. Bellek, model dosyası, kitaplık, izin, port ve genel başlangıç için statik hata kodları vardır; ham hata, dosya yolu veya süreç anahtarı dışarı taşınmaz. Başarısız başlangıç süreci kapatır ve status.error kaydeder; başarılı yeniden deneme bunu temizler. Çıkmış/iptal edilmiş süreç geç health yanıtıyla hazır sayılamaz. İlgili managed/setup/yerel köprü regresyonları güncel kaynakta çalıştırıldı.

Resmî sabit Qwen3 1.7B Q8_0 adresi yetkili ağ denemesinde yine proxy CONNECT 403 verdi. b9380 motor/kitaplık hashleri ve native C++ grammar **22/22** geçti; güncel yanıt şema hashleri eşleşir. Gerçek çıkarım betiği model-validation/ENOENT aşamasında durdu: **0 çıkarım vakası**, model anlamsal kabulü doğrulanmadı. Ağırlık indirilmedi, alternatif güvenilmeyen kaynak veya buluta otomatik geçiş kullanılmadı. Sohbet browser model yanıtları mock'tur.

## Güncel kontroller

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| aya-conversation | GEÇTİ | 38.76 sn |
| aya-state | GEÇTİ | 23.52 sn |
| aya-work | GEÇTİ | 24.66 sn |
| desktop-shell | GEÇTİ | 84.63 sn |
| professional-shell | GEÇTİ | 14.27 sn |
| operations-workspace | GEÇTİ | 22.97 sn |
| cad-daily | GEÇTİ | 245.1 sn |
| cad-inspection | GEÇTİ | 547.13 sn |
| full-verify | GEÇTİ | 186.17 sn |
| loading-reading | GEÇTİ | 24.89 sn |
| Native b9380 grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 2462 dosya; gerçek boyut ve SHA-256 eşleşmesi |

Tam verify; AYA parser/merge sınırı, host tek kullanımlık sonuç kanıtı, geç yanıt/bağlam kuşağı, yerel motor hata sınıflama, model seçimi, navigasyon kataloğu ve mevcut CAD/kernel/yerleşim/kütüphane/kayıt/çeviri/migration/PGlite modül kontrollerini; sıfır uyarılı lint, TypeScript ve standalone üretim derlemesini içerir. Son yükleme testi derlenmiş uygulamada çalışır. Zorunlu beş saniye beklemesi yoktur. Browser fixture testleri ve genel verify sırayla çalıştırıldı.

Güncel gerçek WebGL günlük testi implant kole yerleşimi, şekillendirme/geri al/yinele, ünite/vaka geçişi, kayıt/çık, yerel kurtarma ve yeni işlem sonucu kanıtını denetler. İnceleme testi kaynak/ünite/düzlem kesit kanıtını, model hatasında Core yorumunu ve dört arka planın gerçek GL rengini denetler. Bunlar sentetik tarama/backend verileridir; gerçek hastada üretim uyumu değildir. RC57'deki ayrı üç preparasyon/STL browser paketi ve tüm 72 görünümün 46 dil matrisi RC58'de yeniden çalıştırılmış sayılmaz. İlgili kernel/yerleşim Node testleri güncel tam verify içindedir.

Kanıtlar: [kaynak](verification/RC58/source-verification.json), [tarayıcı](verification/RC58/browser-results.json), [native grammar](verification/RC58/native-grammar-report.json), [motor denetimi](verification/RC58/native-runtime-report.json), [model engeli](verification/RC58/native-inference-report.json). Loglar ve 55 güncel ekran görüntüsü aynı klasördedir. [Klasör menüsü](verification/RC58/screenshots/RC58_Module_Folders_Desktop.png), [alt klasör arama](verification/RC58/screenshots/RC58_Module_Folders_Nested_Search.png), [İş takibi](verification/RC58/screenshots/RC58_Operations_Workspace.png), [ayrı model testi](verification/RC58/screenshots/RC58_AYA_Diagnostic_Isolation.png), [motor seçimi](verification/RC58/screenshots/RC58_AYA_Focus_Model_Recovery.png), [güncel host sonucu](verification/RC58/screenshots/RC58_Host_Action_Receipt.png).

## Korunanlar ve tamamlanmayanlar

Arka plan adları **Neon Midnight**, **Graphite Turquoise**, **Deep Turquoise**, **Deep Coral**; Ayarlar → Görünüm içindedir. Önceki seçimler kendiliğinden değişmez. Paletler genel uygulama ve CAD arka planına uygulanır; mini oyunlara özel tema değildir. Toplam 72 görünüm, 120 hacim etkili SVG logo, 5 mini oyun, 500 TR/EN bilgi kartı/60 kaynak ve 1008 soru kataloğu korunur. Logo/oyun veya soru sayısı bu sürümde artırılmadı. SVG'ler gerçek 3B mesh değildir; 30.000 gerçek içerik hedefi tamamlanmadı.

Gerçek model anlamsal kabulü, Windows Setup EXE üretimi/çalıştırması ve canlı kurum/klinik kabulü tamamlanmadı. exocad eşdeğerliği, tüm modüllerin profesyonel üretim kabulü veya intaglio/üretim uygunluğu iddia edilmez. RC58 tam kaynak ZIP'idir; RC56/RC57'nin ayrı kurulması gerekmez. Kullanım [RC58_KULLANIM.md](RC58_KULLANIM.md), Windows adımları [KURULUM.txt](KURULUM.txt) içindedir.
