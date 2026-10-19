# DentAYA RC35 — Birleşik uygulama güncellemesi

Bu paket RC33'ün modül, başlık/açıklama ve doğrulama kayıtlarını; RC34'ün tek renk paletini birlikte içerir. Önceki iki paketi sırayla kurmanız gerekmez.

## CAD: adım adım çalışma

CAD **Adım adım** modunda açılır. Kaydedilmiş projeler kendi aşamasında devam eder. Araç şeridi, parametre grupları, sağ tık menüsü ve klavye kısayolları aynı aşama kurallarını izler.

| Aşama | Açılan çalışma alanı |
| --- | --- |
| 1 · Tarama verisi | Ana tarama seçimi, model bilgileri, kamera ve inceleme |
| 2 · Preparasyon marjini | Marjin çizimi, nokta düzenleme, iç yüzey ve giriş ekseni |
| 3 · Anatomi ve şekillendirme | Anatomi, konum, ekle/çıkar/yumuşat/düzleştir ve iç yüzey |
| 4 · Temas ve oklüzyon | Temas haritası, gerekli yüzey düzeltmeleri; çok üyeli işlerde bağlantı aracı |
| 5 · Kalınlık ve kontrol | Ölçüm, mesafe/kesit görünümleri ve mevcut geometri kontrolü |
| 6 · Son kontrol | Hazır olma kontrolleri ve tek STL/onaya gönderme düğmesi |

- **Sonraki / Geri** düğmeleri parametre penceresinin altındadır. İş tanımı, yüklenmiş tarama ve en az üç marjin noktası gereklilikleri ileri geçişte kontrol edilir. Geçiş durdurulursa gelecek aşamanın paneli açılmaz.
- Tarama seçimi, model henüz yüklenmemişken de erişilebilir. Model yüklenene kadar yüzey araçları çalışmaz.
- **Uzman** modu yalnız açıkça seçildiğinde bütün mevcut araç gruplarını açar. Bir sekmeye, sağ tık aracına veya kısayola basmak bu modu kendiliğinden açmaz. Adım adım moda dönüş ilgili aşamanın araçlarını yeniden sınırlar.
- Araç seçimi tek ana şeritte; nesne görünürlüğü tek nesne panelinde; kaydetme tek üst düğmede bulunur. Sağ tık aynı komutların bağlama uygun kısa yoludur.
- Aşama değişimi mevcut 3D sahneyi yeniden kurmaz. Bir projeyi veya kaynak dosyasını değiştirmek ayrı bir işlemdir. Aşama kaydı üstteki **Kaydet** düğmesiyle projeye kaydedilir.
- Son kontrol aşamasına geçmek tasarımı gönderilmiş saymaz. Klinik inceleme durumu ancak mevcut STL gönderim işlemi başarılı olursa oluşur.

CAD işlemleri mevcut manuel ve deterministik geometri araçlarıyla yürütülür. AYA isteğe bağlı ayrı bir yardımcıdır; tasarım aşamalarını yönetmez. Bu güncelleme arayüz/iş akışı güncellemesidir; yeni boolean çekirdek, yeni restorasyon motoru veya Exocad ile teknik eşdeğerlik iddiası içermez.

## Sade menüler ve tek renk paleti

Ana sayfa, klinik ve laboratuvar ekranlarındaki yinelenen genel modül bağlantıları kaldırıldı. Özet kartları bilgiyi gösterir; modüller tek menüden açılır. Aynı katalog komutunu çağıran farklı başlıklar birleştirildi. Menü gizlenmişse üst çubuktaki **Çalışma alanı menüsü** kullanılabilir.

Renk ayarı: **Ayarlar → Görünüm → Renkler ve görünüm → Renk paletleri**. Retro, Old Money, temalar ve özel renkler aynı kontrol içindedir. Hızlı görünüm penceresi aynı ayarı kullanır. RC34'ün görünüm aktarımı, eski görünüm dosyalarını kabul etmesi ve CAD'in paleti izlemesi korunur.

31 dil, logo, ses, diş seçimi, kurtarma kayıtları ve RC33 doğrulama ekranı korunur. RC34 arşivinde eksik kalan `electron/aya/core.cjs`, RC33'ün özgün dosyasından geri kondu; yerel AYA açılışı ve paket içeriği kontrol edilir.

## Windows güncelleme

1. ZIP'i yeni bir klasöre çıkarın ve `DentAYA_Production_RC35` klasörünü açın.
2. Çalışan projenizin `.env.local` dosyasını yeni klasörde `package.json` yanına kopyalayın.
3. DentAYA'yı kapatın. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasına çift tıklayın.
4. Derleme sonunda `dist-desktop\DentAYA-Setup-1.0.0-rc.35.exe` dosyasını çalıştırın.

Bu güncelleme yeni SQL gerektirmez. RC33 doğrulama kayıtlarını ilk kez kuranlar mevcut `public/setup/DentAYA_RC33_Dogrulama.sql` dosyasını bir kez uygular. Klinik/laboratuvar verileri bu paketle taşınmaz veya sıfırlanmaz; mevcut bağlantı bilgileri kullanılır.

## Yazılım kontrolleri

`npm run verify` temel kontrolleri ve üretim derlemesini kapsar. `npm run verify:cad-guided-browser`, `npm run verify:cad-browser` ve `npm run verify:appearance-browser` gerçek arayüz/3D kontrollerini çalıştırır; veritabanı çağrıları test verileriyle karşılanır. Sonuçlar `verification/RC35` içindedir. Önceki sürümlerin kontrol kayıtları tarihsel olarak korunur.

Hedef Windows kurucusu bu Linux geliştirme ortamında üretilmedi veya çalıştırılmadı. RC33 başvuru/kanıt kapsamı için `TUSEB_D_KAPSAM_VE_DOGRULAMA.md` geçerlidir.
