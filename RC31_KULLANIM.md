# DentAYA RC31 — Tam arayüz dil paketleri

RC31, yalnızca bölüm başlıklarını değil sabit ekran metinlerini çevirir: menüler, düğmeler, form açıklamaları, araç ipuçları, boş durumlar, hata metinleri, dosya seçme denetimleri ve CAD panelleri. Türkçe kaynak arayüzüne ek olarak 30 dil paketi uygulamayla birlikte gelir; bunlar Avrupa Birliği’nin 24 resmî dilinin tamamını kapsar. Masaüstü paketinde dil görüntülemek için API anahtarı, internet bağlantısı veya yerel model kurulumu gerekmez. Web kullanımında henüz açılmamış bir dilin dosyası uygulamanın kendi sunucusundan yüklenir; sunucuya erişim gerekir. Bulut çeviri servisi kullanılmaz.

## Windows’ta güncelleme

1. ZIP dosyasını yeni bir klasöre çıkarın. Önceki çalışan uygulamanın `.env.local` dosyasını yeni klasörde `package.json` ile aynı yere kopyalayın.
2. Node.js 22 veya üzeri ve npm 11 gereklidir. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasına çift tıklayın. Komut dosyası `npm.cmd` kullanır; PowerShell betik politikasını değiştirmeniz gerekmez.
3. Derleme tamamlandığında `dist-desktop/DentAYA-Setup-1.0.0-rc.31.exe` seçili olarak açılır. DentAYA’yı kapatıp bu kurucuyu çalıştırın.
4. Ayarlar → Dil ve bölge üzerinden dili seçin. CAD ekranındaki dil seçicisi de aynı tercihi uygular. Tercih cihazda kaydedilir.

Bu teslim kaynak kod paketidir. Windows NSIS kurucusu Linux doğrulama ortamında oluşturulmamış veya çalıştırılmamıştır; yukarıdaki komut dosyası kurucuyu Windows’ta üretir.

## Dil kapsamı ve veri korunması

31 seçenek: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Felemenkçe, Lehçe, Romence, Rusça, Ukraynaca, Arapça, Çince, Japonca, İsveççe, Danca, Yunanca, Çekçe, Korece, Bulgarca, Hırvatça, Estonca, Fince, Macarca, İrlandaca, Letonca, Litvanca, Maltaca, Slovakça ve Slovence.

Dil değişimi paket yüklenince uygulanır. Hasta isimleri, kullanıcı tarafından yazılmış notlar, topluluk gönderileri, dosya isimleri ve diş numaraları otomatik çevrilmez. Tarih/sayı gösterimi seçili bölgeye göre biçimlendirilir. Arapça sağdan sola gösterilir. Dil değiştirmek CAD geometrisini dönüştürmez.

Gelişmiş dil ayarlarından sabit metin düzeltmelerini JSON olarak dışa/içe aktarabilirsiniz. Kısmi düzeltmeler tam paketin geri kalanını silmez. Başka sürümün manifestiyle veya desteklenmeyen anahtarlarla hazırlanan paketler reddedilir.

## Çeviri niteliği

Paketler geliştirme sırasında bilgisayarda çalışan açık modellerle üretildi. Çeviri için uygulama metinleri bir bulut çeviri servisine gönderilmedi. İngilizce terim sözlüğünde ve bazı dil metinlerinde düzeltmeler yapıldı. Bütün dillerin ana dili editörlerce incelendiği iddia edilmez; teknik kapsam kontrolü dilbilimsel/klinik onay değildir. Hasta notlarını çevirmek veya klinik karar vermek bu özelliğin görevi değildir.

Mevcut CAD araçlarının ve tarama dosyalarının korunması hedeflenmiştir. Bu sürüm mevcut klinik/üretim doğrulaması gereksinimlerini değiştirmez.
