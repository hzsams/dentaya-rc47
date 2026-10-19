# DentAYA RC43 — kontrol raporu

Sürüm **1.0.0-rc.43** · 15 Ekim 2026.

**Güncel ek — 10 saniye okuma:** Hızlı yüklemelerden sonra aynı bilgi cümlesi ilk yükleme başlangıcından itibaren toplam 10 saniye korunur. Veri hazırsa Çalışmaya geç/Esc ile erken geçilebilir. Ardışık aşamalar aynı süreyi paylaşır; uzun gerçek yükleme sonrasında ek 10 saniye beklenmez. Aşağıdaki ana sonuçlar ilk RC43 doğrulamasına aittir; bu değişikliğin hedefli kontrolleri `verification/RC43/reading-10s/` içinde ayrı tutulur.

RC42'nin mevcut kaynak paketi temel alındı. 100 kaynaklı kısa bilgi, ortak yükleme görünümü ve Kusp Kilidi oyunu eklendi. AYA motoru, CAD geometrisi, özgün diş formları ve proje kayıt şeması değiştirilmedi. Yeni veritabanı migration'ı yoktur.

## Bilgiler

`src/lib/i18n/dental-facts.json` içinde 100 farklı Türkçe cümle ve İngilizce karşılığı bulunur. Her birinin kaynak kaydı vardır. Kaynaklar ADA/MouthHealthy, NIDCR, FDA ve AAE'nin herkese açık sayfalarıdır. 12 konu/kaynak grubu kullanıldı. Metinler burada hazırlanmış kısa özgün anlatımlardır; dış çeviri hizmetine proje metni gönderilmedi. 100 cümle ve kurum bağlantıları `RC43_100_DIS_BILGISI.txt` içinde de yer alır.

Genel anatomi ve ağız sağlığı bilgileri gösterilir; kişisel teşhis, ilaç dozu veya hastaya özel tedavi kararı verilmez. İngilizce karşılıklar ve oyun metinleri hazırlanmıştır; diğer diller bu yeni içerikte İngilizce kullanır. Mevcut 46 arayüz dil paketinin kapsamı genişletilmiş gibi gösterilmez.

Bilgi havuzu Fisher–Yates ile karıştırılır. Aynı oturumdaki 100 seçim tamamlanmadan tekrar oluşmaz; tur sınırında da aynı cümle arka arkaya gelmez. Otomatik değişim 12 saniyedir; duraklatılabilir, odak kartta olduğunda bekler ve görünmeyen sekmede çalışmaz. Oyun veya cümleler için yeni bir dış API bağımlılığı yoktur.

## Mini oyun

Kusp Kilidi; dört sekiz konumlu işaretin bağlantılı döndürüldüğü, diş yüzeyinden esinlenen özgün bir uygulama bulmacasıdır. Seçilen kusp iki, saat yönündeki komşusu bir adım döner. Ters hareket aynı işlemi geri alır. Başlangıç düzenleri geçerli hamlelerden üretilir; ipucu çözücüsü bütün dört işaretin merkezde hizalanmasına giden hamleleri hesaplar.

Oyun klinik geometri ölçümü veya CAD düzenleme aracı değildir. Kendi çizilmiş SVG grafiği, dokunma/klavye, ters çevirme, ipucu, yeni bulmaca ve cihazda rekor içerir. Hasta/vaka verilerine erişmez. Ağ bağlantısı kesildiğinde yüklenmiş sayfada çalışmaya devam eder.

Yükleme penceresindeki oyun, uygulama kökünde modal olmayan ayrı bir paneldir. Verinin hazır olmasını engellemez; yükleme tamamlandıktan sonra da açık kalabilir. Kapanırken odak açık bir uygulama alanına döner. İş hazır olunca başlık tamamlandığını söyler. Aynı cümle 10 saniyelik toplam okuma penceresinin kalanında korunur; Çalışmaya geç/Esc ile kapanır. Gerçek yükleme 10 saniyeyi aşmışsa ilave okuma beklemesi yoktur. Sahte yüzde gösterilmez.

## Doğrulama

| Kontrol | Sonuç ve kapsam |
|---|---|
| 100 cümle | Türkçe/İngilizce sayısı, tek cümle biçimi, farklılık, boyut ve kaynak alanları kontrol edildi. |
| Rastgele seçim | Her dilde üç tam turda tekrar olmadığı ve tur sınırında art arda aynı cümle gelmediği doğrulandı. |
| Bulmaca | 768 farklı başlangıç/düzey için çözüm ve ipucu; ters hareketin geri alması ve durumun değiştirilmeden hesaplanması geçti. |
| Gerçek oyun ekranı | Dokunma/tıklama, ters hareket, çözülme, rekorun yeniden açılışta korunması, ağ kesikken oynama ve mobil taşmama geçti. |
| Gerçek CAD yüklemesi | Tarama cevabı testte bekletildi; bilgi ve mini oyun açıldı; tarama serbest bırakılınca ekran hazır oldu, oyun hazır bilgisini gösterdi ve bilgi kartı kalktı. |
| CAD regresyonu | Gerçek tarama üzerine kole çizimi, sekiz görev, gecikmiş kayıt cevabı, araçlar, renk/görünürlük, kayıtlı kapanış ve yeniden açılış geçti. Sunucu yanıtları sentetik testle karşılandı. |
| Arayüz ve dil | Otomatik bilgi değiştirme/duraklatma, klavye/ipucu, Türkçe–İngilizce–Arapça seçiminde yeni içeriğin dil davranışı ve mevcut 46 dil arayüz kontrolleri doğrulandı. |
| Üretim sunucusu | Son derlemenin bağımsız sunucusunda oyun, 100 bilgi, çevrimdışı kullanım ve oyun içinden Escape ile kapanma doğrulandı; tarayıcı hatası oluşmadı. |
| Ana kontroller | Ana zincirdeki 35 çekirdek komut, lint, TypeScript ve Next.js üretim derlemesi; toplam 38 komut. Çıktılar `verification/RC43/` içindedir. |

Tarayıcı denemeleri gerçek uygulama ve yazılımsal WebGL kullanır. Gerçek hasta verisine veya canlı üretim sunucusuna yazılmadı. Tarayıcı QA görselleri dağıtım ZIP'ine alınmaz. Windows kurulum EXE'si bu ortamda üretilmedi veya çalıştırılmadı; teslim kaynak paketidir. Kaynak hash özeti, tek CMD giriş dosyası ve ZIP CRC'si teslim öncesinde doğrulanır.

## 10 saniyelik okuma ekinin doğrulaması

Güncel kaynakta lint, TypeScript, mevcut 46 dil kontrolü, genişletilmiş bilgi/oyun kontrolleri ve üretim derlemesi geçti. Son üretim sunucusu tarayıcı kontrolünde aynı cümlenin korunması, toplam 10 saniyede otomatik kapanma, veri hazırken erken geçiş ve odak dönüşü, 15 saniye bekletilmiş gerçek isteğin erken açılmaması, uzun yüklemeden sonra ek bekleme olmaması, mini oyunun açık kalması ve 390 piksel mobil görünüm doğrulandı. Zaman sınırları tarayıcı saatiyle sınandı; sunucu yanıtları sentetik testle karşılandı. Kaynak durum testleri ardışık yüklemelerin aynı süreyi paylaşmasını ve eski zamanlayıcının yeni oturumu kapatmamasını da kontrol eder. Bu ekin altı kontrol kaydı `verification/RC43/reading-10s/checks.json` içindedir. Önceki CAD geometri/regresyon sonuçları yukarıdaki ilk RC43 kontrol kapsamına aittir.

## Windows EBUSY derleme düzeltmesi — 16 Ekim 2026

Kullanıcı kaydında `.next/server/functions-config-manifest.json` için EBUSY/unlink hatası, OneDrive altındaki kaynak klasörde görüldü. Tek CMD artık kaynakları her denemede `%LOCALAPPDATA%\DentAYA\Builds\rc43-…` altında yeni bir çalışma klasörüne kopyalar; `.next`, `node_modules` ve eski dağıtım klasörlerini dışarıda bırakır. Paket kurma, sürüm etiketi ve masaüstü derleme bu kopyada çalışır. `.env.local` içeriği konsola basılmaz; kaynak dosyalar silinmez, çalışan süreçler zorla kapatılmaz. Kopyalama hataları için Robocopy’nin 8 ve üstü çıkış kodları durdurulur.

CMD denetim akışı, alıntılanmış yollar, tek giriş dosyası ve ZIP hash/CRC bütünlüğü incelendi. Uygulama/AYA/CAD kodu ve bağımlılık kilit dosyası önceki doğrulanmış paketle byte düzeyinde aynıdır; 10 saniyelik okuma özelliği korunur. Windows CMD ve EXE derlemesi bu Linux ortamında çalıştırılmadı; kullanıcı bilgisayarındaki sonuç henüz doğrulanmadı. Bu düzeltme bağımlılık güvenlik sürümlerini değiştirmez. Kayıt: `verification/RC43/windows-build-fix.json`.
