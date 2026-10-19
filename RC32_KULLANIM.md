# DentAYA RC32 — Tam arayüz çeviri güncellemesi

31 dil seçeneği, Avrupa Birliği’nin 24 resmî dilinin tamamını içerir. Türkçe kaynak arayüzüne eklenen 30 dil paketinin her birinde 4.610 sabit metin vardır. Menüler, form etiketleri ve açıklamaları, araç ipuçları, boş durumlar, hata ve başarı mesajları, CAD panelleri ve masaüstü menüleri çevrilir. Dil görüntülemek için çeviri API anahtarı veya yerel sohbet modeli gerekmez. Kurulu masaüstü uygulaması paketleri yerel dosyalardan okur; web sürümü henüz yüklenmemiş dil dosyasını uygulama sunucusundan alır.

## Windows’ta güncelleme

1. ZIP dosyasını yeni bir klasöre çıkarın. Çalışan önceki sürümün `.env.local` dosyasını yeni klasörde `package.json` ile aynı yere kopyalayın.
2. Node.js 22 veya üzeri ve npm 11 gerekir. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasına çift tıklayın. Bu dosya `npm.cmd` kullanır; PowerShell betik politikasını değiştirmeniz gerekmez.
3. Derleme bittiğinde `dist-desktop/DentAYA-Setup-1.0.0-rc.32.exe` seçili olarak açılır. DentAYA’yı kapatıp kurucuyu çalıştırın.
4. Ayarlar → Dil ve bölge üzerinden dili seçin. CAD ekranındaki dil seçicisi aynı tercihi kullanır.

Bu teslim kaynak kod paketidir. Windows NSIS kurucusu Linux doğrulama ortamında üretilmedi veya çalıştırılmadı; komut dosyası kurucuyu Windows’ta üretir.

## RC32’de tamamlanan alanlar

İngilizce ekran bağlamları yeniden incelendi; diş hekimliği ve CAD terimleri düzeltildi. 30 dil için ad/soyad, teknisyen, alt ve üst diş arkı, altyapı, kurye alımı, gece plağı, siman aralığı ve kusp koruma terimleri ortak bir sözlüğe bağlandı. Önceki paketlerde yanlış anlam taşıyan ifadeler ve kopyalanmış kısa İngilizce etiketler yeniden işlendi. İrlandaca, Maltaca, Japonca ve Çince paketler yeniden üretildi; kullanılan farklı yerel modellerin bağlam dışı çıktıları denetlendi.

Ana sayfa ve bildirim merkezi artık sistem bildirim başlıklarını, tasarım sürümü mesajlarını ve vaka/teslimat durumlarını seçili dilde gösterir. Vaka geçmişindeki oluşturma, kabul, üretim, kalite kontrol, iptal, onay, revizyon ve teslimat kayıtları çevrilir. Ekip rol listeleri, kurye araç türleri, tarama bağlamı, AYA tercih ve model indirme durumları kapsama alındı. Başlangıç rehberindeki adım sayıları ve rol başlıkları tam mesaj şablonlarıyla gösterilir.

Dil değişimi paket yüklenince uygulanır. Eski manifestle saklanmış dil düzeltmeleri bu sürümün yeni metinlerini geçersiz kılamaz. Hasta adları, kullanıcı notları, mesajlar, topluluk içerikleri, vaka başlıkları, takip kodları, dosya adları ve FDI numaraları korunur. CAD geometrisini veya geçmişini çevirmek dil özelliğinin işi değildir. Standart birimler, klavye tuşları, yazı tipi adları, ürün adları ve dosya biçimleri teknik adlarını korur.

## Doğrulama

`npm run verify` dil paketlerinin bütünlüğünü, görünür ekran metinlerini, sistem mesajlarında kullanıcı verisinin korunmasını, dil sözlüğünü, TypeScript, lint, masaüstü dil aktarımı, mevcut CAD ve iş akışlarını, veritabanı göçlerini ve üretim derlemesini denetler. `npm run verify:ui-browser` 31 dilde gerçek ekran kontrollerini, bildirim gövdelerini, dosya seçimini, form/diş durumunu ve AYA motor mesajlarını test eder. `npm run verify:cad-browser` CAD sahnesi, araçlar, görünürlük, panel hareketi, geometri geçmişi ve dil geçişlerini test eder. Bu testlerde uygulama bağlantıları sahte test verisiyle yürütülür; canlı hesap veya gerçek hasta kaydı kullanılmaz.

Paket kapsamı tamamlanmıştır. Çeviriler geliştirme sırasında yerel modellerle hazırlanıp bağlam ve terim düzeltmeleri yapılmıştır; uygulama kaynakları bulut çeviri servisine gönderilmemiştir. Tüm dillerde ana dil editör onayı veya klinik onay iddia edilmez. Bu sürüm mevcut klinik ve üretim doğrulama gereksinimlerini değiştirmez.
