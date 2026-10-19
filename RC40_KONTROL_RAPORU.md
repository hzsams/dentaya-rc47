# DentAYA RC40 — kontrol raporu

Sürüm: **1.0.0-rc.40**. Kaynak: RC39. Güncelleme tarihi: 14 Ekim 2026.

## Düzeltilen davranışlar

- Başlangıç dişi tüm çenenin merkezinde oluşturuluyordu. Kole tamamlanıp iç uyum/anatomi adımına geçilince şimdi yerel kolenin merkezi ve düzlemi kullanılır; başlangıç boyutu bu çevreden alınır ve kamera dişe odaklanır. Gizli veya yüzde sıfır görünürlükte bırakılmış restorasyon yerleştirme sırasında görünür yapılır.
- Aynı koleye yeniden yerleştirme geometriyi tekrar daraltmaz. Kole değişirse kayıtlı başlangıç geometri esas alınır ve yapılan şekillendirmenin farkları taşınır. Form ailesini değiştirmek başlangıç anatomisini yeniler.
- Proje kaydı yalnız ayarları saklıyordu. Artık tam noktalar/yüzler, reset ve yerleştirme başlangıçları, yerleşim, üniteye ait kole ve konum parametreleri, varsa shell geometrisi ve raporu saklanır. Geometri binary Float32/Uint32 olarak gzip ile sıkıştırılır; bozuk veya aşırı büyük kayıtlar uygulanmaz.
- Ünite değiştirmek taramayı yeniden yükleyip şekillendirmeyi siliyordu. Ünite ve kaynak başına ayrı geometri belleği kullanılır. Açık oturumda ünite başına geri alma geçmişi korunur.
- Başlık, Hub geri düğmesi ve son adım gerçek **Kaydet ve çık** işlemini kullanır. Modal pencere beklerken yeni değişiklik yapılmasını engeller. Sunucu kaydı onaylamadan laboratuvar ekranına geçilmez.
- IndexedDB kaydı artık istek başarısında değil transaction tamamlandığında başarılı sayılır. Açıkça seçilmiş yerel çıkış kaydı yedi günlük temizlikten korunur. Sunucunun onayladığı kurtarma taslağı, daha yeni yerel düzenlemeleri silmeden kaldırılır.
- Uzak kayıtlar sıraya alınır ve `updated_at` üzerinden eşzamanlı değişiklik kontrolü yapılır. Eski oturum yeni kaydı ezmez. Kliniğe gönderme önce tam geometri kaydını tamamlar; RPC sonrası kendi güncel kayıt zamanı alınır. PostgreSQL JSONB anahtar sırası değişikliği eşleşmeyi bozmaz. Belirsiz ağ hatasında gönderilmiş olabilecek STL/dosya kaydı silinmez.
- CAD içinde AYA aktif ünite, model, kole, görünürlük ve kayıt durumu ile yardım verir. Belge rehberi tarayıcıda ve masaüstünde model gerektirmeden kullanılabilir. Yerel model bağlantısına yalnız sınırlandırılmış iş akışı bilgileri eklenir. Belge metni ve model yanıtı ayrı gösterilir.

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| 8 FDI anatomisi × 24 aile × 3 konum/eksen, toplam 576 diş | Koleye yerleşim; kapalı tek gövde; dejenere yüz yok |
| Düz, eğimli ve ters eksen; çene merkezinden uzak kole | Servikal merkez kole merkeziyle eşleşti |
| Geçersiz kole ve bozuk geometri kaydı | Geometri değiştirilmeden reddedildi |
| Binary/gzip kayıt ve yeniden okuma | Düzenlenmiş noktalar/yüzler, yerleşim başlangıcı, shell/rapor ve ayrı kaynaklar korundu |
| Gerçek CAD + WebGL, sentetik implant dayanak taraması | Yerel boyutlandırma; gizli/sıfır görünürlükten dönüş; tekrar yerleştirmede geometri korundu |
| Gerçek fırça, iki ünite, uzak kayıt ve yeniden açma | Düzenlenen geometri ve ayrı koleler korundu |
| Geciktirilmiş kayıt ve Kaydet ve çık | Kayıt onayı beklendi; modal pencere değişiklikleri engelledi |
| Uzak hata, yerel çıkış, sekiz günlük taslak ve geri yükleme | Tam geometri geri geldi; açıkça tutulan yerel kopya temizlenmedi |
| Kliniğe gönderme ve sonraki kayıt | Gönderilen parametreler tam geometri içerdi; JSONB sırası değişse de sonraki kayıt geçti |
| Eşzamanlı başka kayıt | Eski kayıt reddedildi; CAD açık kaldı |
| Adım adım ve uzman CAD, gerçek tarama üzerinde kole çizimi | Geçti |
| Mevcut form, manuel araç, geri alma, görünürlük ve mobil panel regresyonları | Geçti |
| Ana AYA rehberi, model olmadan tarayıcı; yerel model IPC sınırları | Geçti; model çıkarımı testlerde taklit edildi |
| 46 dil, 4.820 kaynak anahtarı, 216.900 çeviri girdisi | Kapsam, paket bütünlüğü, geçiş ve mobil kontroller geçti |
| Lint, TypeScript ve üretim derlemesi | Geçti |
| Sürüm/Windows CMD, güvenlik, migration, vaka-onay-üretim-teslimat regresyonları | Geçti |

`verification/RC40` altında ayrıntılı test kayıtları ve değişiklik manifesti bulunur. Paket mevcut `npm run verify` zincirindeki 35 kontrolü kapsar; ayrıca dört tarayıcı kontrolü çalıştırılmıştır. Önceki eğitim STL'leri, 768 FDI önizlemesi ve logo dosyaları RC39 ile byte düzeyinde aynı kaldı.

## Doğrulamanın sınırı

Tarayıcı testleri gerçek uygulama ve WebGL üzerinde çalışır; sunucu cevapları kontrollü API fikstürleridir. Canlı veritabanı, kullanıcıya ait gerçek hasta taraması, kurulu Ollama modelinin yanıt kalitesi veya Windows kurulum EXE'si bu Linux ortamında çalıştırılmadı. Mevcut migration akışı yerel veritabanı testlerinde doğrulandı; bu paket yeni migration gerektirmez.

Koleye başlangıç dişi yerleştirmek, implant marka arayüzü veya cerrahi plan üretmez. Mevcut Crown Shell/iç uyum çekirdeği yaklaşık yüzey eşlemesi kullanır. Üretim uygunluğu gerçek vaka üzerinde ölçüm ve kontrollerle değerlendirilmelidir. Bu sürüm günlük çalışma ve kayıt sorunlarını düzeltir; klinik veya üretim sertifikası olarak sunulmaz.

## Teslim

Tek Windows giriş dosyası: **DENTAYA_GUNCELLE_DERLE.cmd**. Beklenen çıktı: `dist-desktop\DentAYA-Setup-1.0.0-rc.40.exe`. ZIP hazır EXE içermez; kaynak, kullanım kılavuzu ve doğrulama kayıtlarını içerir.
