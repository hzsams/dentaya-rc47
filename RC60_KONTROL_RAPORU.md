# DentAYA RC60 kontrol raporu

Sürüm `1.0.0-rc.60`, AYA Core `0.16.0`. Taban RC59: `fbd214319bcd4c93d985332abd4c1c416a8f64d3`. Kanıt toplama: 2026-10-27T05:01:01+03:00. Bu sürüm gerçek not bağlamı, gereksiz sohbet çakışması ve yerel kurulum kurtarmasını düzeltir. Gerçek model anlamsal kabulü açık kalır.

## Uzun notların ilgili bölümünü kullanma

Önceki arama notun tamamını tarıyordu; alıntı ise uzun tek paragrafın başlangıcından kesilebiliyordu. Böylece doğru not kaynak gösterildiği halde sorulan bilgi gerçek model girdisinde bulunmuyordu. RC59 ile gerçek karşılaştırmada bir kaynak ve 2200 karakter alıntı vardı, son kısımdaki Z8T4 bilgisi yoktu. Güncel kod aynı notta ilgili özgün metni seçiyor; hazırlanan bağlamda ve yerel köprüye giden gerçek girdide bilgi mevcut. Bu testte çıkarım mock'tur.

Alıntı özgün kelime konumları çevresinden seçilir. Soru kapsamı ve eşleşme yoğunluğu değerlendirilir; eşit durumda sonraki bölüm tercih edilir ve son kelimenin arkasındaki değer için pay bırakılır. 2200 karakter sınırı, asıl notun değişmemesi, notları kapatma ve güvenilmeyen kanıt ayrımı korunur. Core not hatırlama da aynı seçimi kullanır. Bu sözcük tabanlı erişim iyileştirmesidir; semantik embedding, temel model eğitimi veya her uzun notun tamamını anlama garantisi değildir.

## Değişmemiş geçmişte gereksiz çakışma

Sohbeti başka pencerede yalnız açmak yeni updatedAt yazarak ilk pencerenin sonraki gerçek değişikliğini çakışmaya sokabiliyordu. Şimdi sıkı tam revizyon kapısından sonra normalize edilmiş başlık/mesaj/bellek karşılaştırılır. İçerik değişmemişse depolama yazısı ve olay üretilmez; tarih, geçmiş sırası ve revizyon korunur. Kayıt başlığı dil değişimi veya son kırk mesaj sınırı yüzünden kendiliğinden yeniden türetilmez. RC59 üzerinde yeni regresyon gerçekten saved/unchanged farkıyla başarısız oldu; güncel kod geçti.

İki gerçek tarayıcı sayfasında açma, yeniden yükleme ve TR/EN dil geçişinin ham kaydı değiştirmediği; asıl penceredeki sonraki gerçek hedef düzenlemesinin uyarısız kaydedildiği denetlenir. Gerçek yeni kayıt, silinen kayıt, gecikmiş yanıt, açık yükle/ayrı kopya ve başarısız Sil regresyonları korunur. Bu hâlâ iyimser localStorage denetimidir; atomik pencere işlemi değildir. Depolama şeması değişmedi.

## Yerel kurulum ve kurtarma

Başka pencerenin kurulumunu iptal etmeye çalışmak artık yanlış başarı yerine LOCAL_BUSY verir; indirme sahibinin iptali çalışır. Bu hata RC59 üzerinde yeniden üretildi. Kurulum, durdurma, iptal ve yenileme arayüzü tek işlem kilidi kullanır. İptal/yenileme IPC hataları yakalanır, güvenli açıklama gösterilir ve güncel durum yeniden sorgulanır; aynı tur çift tıklama tek iptal gönderir. Reddedilen işlem sonrasında kontroller yeniden kullanılabilir. Yeni gerçek bileşen tarayıcı testi bu yolları denetler; IPC sentetiktir.

Motor/model indirmesinde başlık veya gövde 45 saniye ilerlemezse AYA_DOWNLOAD_TIMEOUT ile yeniden denemeye açılır. Düzenli ilerleme süreyi yeniler; 45 saniyeden uzun büyük indirme yalnız toplam süresi yüzünden durmaz. Alınan .part bölümü korunur; yeniden deneme Range ile devam edip tam boyut/SHA-256 kapısından geçer. Açık kullanıcı iptali AbortError olarak ayrı kalır. Hareketsizlik regresyonu RC59'da test watchdog'una kadar takıldı; düzeltilmiş kod geçti. Ağ testleri kontrollü kısaltılmış süre ve mock aktarım kullanır; gerçek çok gigabaytlık Windows indirmesi değildir. Sabit model/engine hashleri, HTTPS izin listesi, süreç anahtarı, loopback ve buluta otomatik geçmeme korunur.

## Güncel kontroller

| Kontrol | Sonuç | Süre |
| --- | --- | --- |
| aya-conversation | GEÇTİ | 34.2 sn |
| aya-state | GEÇTİ | 51.9 sn |
| aya-work | GEÇTİ | 21.11 sn |
| aya-setup | GEÇTİ | 7.19 sn |
| cad-daily | GEÇTİ | 311.16 sn |
| full-verify | GEÇTİ | 177.15 sn |
| loading-reading | GEÇTİ | 25.41 sn |
| Native b9380 grammar | GEÇTİ | 22/22 |
| Kaynak bütünlüğü | GEÇTİ | 2558 dosya; gerçek boyut ve SHA-256 eşleşmesi |

Tam verify; not bağlamı/gerçek köprü girdisi, geçmiş revizyonu/no-op, indirme hareketsizliği/sahiplik ve mevcut AYA bellek/bütçe/şema/köprü; CAD/kernel/kole/yerleşim/şekillendirme/geri al/kayıt/kütüphane/kesit, modül/migration/PGlite, erişim/çeviri/sürüm kontrollerini; sıfır uyarılı lint, TypeScript ve standalone üretim derlemesini içerir. Son yükleme testi derlenmiş uygulamada çalışır. Tarayıcı fixture paketleri ve genel verify sırayla çalıştırıldı.

Güncel CAD günlük testi gerçek WebGL/host/kernel üzerinde implant kole yerleşimi, fırça/geri al/yinele, ünite/vaka geçişi, kayıt hatası, kaydet/çık, yeniden açılış, yerel kurtarma, tek kullanımlık güncel araç sonucu ve taslak korumasını denetler. Model ve backend sentetiktir. Kernel/host veya 27 araç şeması değiştirilmedi; öneriler kullanıcı **Uygula** kapısındadır. Yayın testinde son kontrol sekmesinin otomatik kaydı oturduktan sonra düğmeye basılır; pointerdown/up/click anlarında saved durumu, etkin düğme ve tek gerçek click doğrulanır. Yayın RPC sayısı, tam geometri ve yeniden sıralanmış JSONB sonrasında kayıt koşulları gevşetilmedi. Bu klinik/üretim uyumu kabulü değildir. Ayrı CAD inceleme, üç preparasyon/STL, tam görünüm/46 dil, desktop/operasyon/professional-shell browser paketleri RC60'ta yeniden çalıştırılmış sayılmaz.

Kanıtlar: [kaynak](verification/RC60/source-verification.json), [tarayıcı](verification/RC60/browser-results.json), [eski/yeni not girdisi](verification/RC60/core-excerpt-baseline.json), [not regresyonu](verification/RC60/core-excerpt-review.json), [geçmiş regresyonu](verification/RC60/history-noop-review.json), [motor](verification/RC60/native-runtime-report.json), [grammar](verification/RC60/native-grammar-report.json), [gerçek çıkarım engeli](verification/RC60/native-inference-report.json). Aynı klasörde test logları ve 28 güncel ekran görüntüsü bulunur. [Değişmemiş geçmiş](verification/RC60/screenshots/RC60_AYA_Read_Only_History.png), [kurulum kurtarma](verification/RC60/screenshots/RC60_AYA_Setup_Cancel_Recovery.png), [başka pencerenin indirmesi](verification/RC60/screenshots/RC60_AYA_Setup_Other_Window.png).

## Açık kalanlar ve korunan kapsam

Resmî sabit Qwen3 1.7B Q8_0 adresinin güncel yetkili ağ denemesi proxy CONNECT 403 verdi; origin HTTP yanıtı alınmadı. Model ağırlığı indirilemedi. Gerçek çıkarım betiği model-validation/ENOENT aşamasında durdu: 0 çıkarım vakası, Türkçe/anlamsal kabul doğrulanmadı. Gerçek b9380 C++ grammar 22/22 ve güncel şema hashleri geçti; grammar model çıkarımı değildir. Güvenilmeyen ayna, pin değişimi veya bulut geçişi kullanılmadı. Windows EXE üretimi/çalıştırması ve canlı kurum/klinik kabulü açık kalır.

Ana sohbetin gönderilmemiş taslağı rota değişimi/yenilemede korunmaz. CAD'deki ünite kapsamlı taslak koruması süreç ömründe sürer. Bu sürüm yeni kalıcı taslak şeması eklemez.

Klasör menüsü, robotsuz İş takibi ve dört referans arka plan korunur. Zorunlu beş saniye beklemesi yoktur. Gerçek sayılar: 500 TR/EN bilgi kartı, 60 kaynak, 1008 soru kataloğu, 120 hacim etkili SVG logo, 5 oyun, 72 görünüm. 30.000 gerçek içerik hedefi, gerçek 3B mesh logo veya exocad eşdeğerliği tamamlandı diye sunulmaz. RC60 tam kaynak paketidir; önceki sürümler ayrıca kurulmaz. Hazır Windows EXE/model ağırlığı içermez. Kullanım [RC60_KULLANIM.md](RC60_KULLANIM.md), Windows adımları [KURULUM.txt](KURULUM.txt) içindedir.
