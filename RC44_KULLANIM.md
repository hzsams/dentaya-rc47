# DentAYA RC44 kullanım

Önce `KURULUM.txt` dosyasındaki adımları izleyin. Önceki paketleri ayrıca kurmak gerekmez.

## Bilgiler ve oyunlar

Yükleme kartları artık 200 farklı cümle kullanır. **Başka bilgi** elle ilerletir, **Bilgileri duraklat** otomatik geçişi durdurur. Otomatik cümle aralığı 12 saniyedir; hızlı yüklemedeki okuma ekranı ise toplam 10 saniye sürer. Veri hazır olduğunda **Çalışmaya geç** veya **Esc** ile erken kapatılır. Gerçek yükleme bu süreyi aşarsa ek 10 saniye bekletilmez.

**Mini oyunları aç** veya **AYA → Mini oyunlar** ile üç oyuna ulaşılır:

| Oyun | Nasıl oynanır | Kayıt |
| --- | --- | --- |
| Kusp Kilidi | Bir kusp iki adım, komşusu bir adım döner; dört kanalı ortada hizala. Shift ile ters çevir, ipucunu kullan. | Çözüm sayısı, en az hamle |
| İkiz İzler | İki kart aç, altı diş izi çiftini eşleştir. Farklı kartlar kısa süre sonra kapanır. | Tamamlanan oyun, en az deneme |
| Oluk Rotası | Taşları döndürerek soldaki girişi sağdaki çıkışa bağla. Bağlanan kanallar renklenir. Shift ile ters döndür; ipucu bir taşı işaretler. | Tamamlanan rota, en az hamle |

Sekme değiştirmek açık bulmacayı korur. Sayfayı yenilemek veya oyun penceresini kapatıp açmak yeni bulmaca başlatır; rekorlar ve son seçilen oyun korunur. Rekorlar bu tarayıcı/cihaz profilindedir. Depolama kapalıysa kayıt yapılamadığı gösterilir. Oyunlar yüklendikten sonra internet istemez. Oyun sırasında gerçek yükleme devam eder; bittiğinde oyun penceresi kendiliğinden kapanmaz.

## AYA Core 0.3

**Çalışma araçları** düğmeleri yazı alanına bir örnek koyar; **Gönder** ile çalıştırılır.

- `12 cm kaç mm?` → `12 cm = 120 mm`
- `0,8 mm kaç mikron` → `0.8 mm = 800 µm`
- `1800 yüzde 18` → `324`
- `1800 × 0,18` → `324`
- `Teslim notu taslağı` → doldurulabilir vaka/ünite/materyal/kontrol/teslim şablonu
- `Kontrol listesi` → AYA sayfasında genel çalışma listesi; CAD panelinde o anda açık ünitenin durumu

Metre, santimetre, milimetre ve mikron desteklenir; virgüllü veya noktalı ondalık kullanılabilir. Bu belirli araçlar model kurulu olmasa da çalışır; model modunda da sonucu AYA Core olarak etiketler. Teslim taslağı bilgi olmayan alanları `[…]` olarak bırakır. Kullanıcı tıklamadan kayıt yapmaz veya mesaj göndermez.

Bilgi defterindeki ilgili notlar takip sorularında da aranır. Kısa yanıt tercihi daha az alıntı getirir; gösterilen kaynaklar yanıtta kullanılan notlarla eşleşir. **Kopyala** yanıtı panoya alır. **Sohbeti dışa aktar** görünen konuşmayı JSON olarak indirir; geçmiş saklama tercihini değiştirmez. Geçmiş kapalıysa sayfadan ayrılınca sohbet korunmaz.

Yerel motor önceki sürümdeki gibi uygulama içinden kurulur. AYA Core çalışma katmanı geliştirilmiştir; sıfırdan eğitilmiş bir temel model değildir. Yerel modelin doğal dil yanıtları llama.cpp üzerinde açık ağırlıklı modelden gelir.

## CAD çalışma kontrolü ve renkler

CAD üst çubuğundaki **AYA** düğmesi, açık ünite için yedi durumu gösterir: iş tanımı, tarama, kole, yerleşim, görünürlük, kapanış verisi, kayıt. Durum sahne değiştikçe güncellenir. Bu liste kayıt ve sahne metadatasını kontrol eder; klinik uygunluk veya üretim onayı vermez. Kapanışın tamam görünmesi iki çene verisinin yüklü olduğunu gösterir; temasların uygun olduğunu doğrulamaz.

**Önerilen adım**, mevcut iş akışına göre iş tanımını açar, görünürlüğü geri getirir, koleye yerleştirir, sıradaki izinli aşamaya ilerletir veya kaydet/çık akışını açar. İşlem düğmeye basınca çalışır. Kole çizimi, kontaklar ve şekillendirme teknisyenin kontrolündedir. Kayıt sürerken yeni işlem önerilmez.

Sol **Göster / Gizle** panelindeki **Model görünümü** altı gruba sahiptir: Teknik, Doğal, Studio, Contrast, Ceramic, Slate. **Renk grupları** bölümünde çalışma çenesi, karşıt çene, restorasyon ve kole renkleri ayrı ayarlanır. Yeni grup seçmek özel renkleri temizler; **Varsayılana dön** teknik grubu geri getirir. Renkler CAD projesinin ayarlarıyla kaydedilir ve yeniden açılır. Çene açılması, görünürlük yüzdesi, tamamen gizleme ve kayıtlı kapanış önceki gibi çalışır. Renkler geometriyi veya materyal üretim özelliklerini değiştirmez.

Özgün diş formları ve teknisyen form kütüphanesi korunur. İptal edilen 24 aile geri getirilmedi.

## Arayüz koleksiyonları

**Ayarlar → Görünüm** bölümünde Studio, Mineral, Heritage ve Contrast koleksiyonlarını açın. Kart seçmek ana görünüm seçicisiyle aynı ayarı uygular. 12 yeni paletle toplam 28 renk paleti ve 68 görünüm seçeneği vardır. Seçim yeniden açılışta korunur; mevcut dışa/içe aktarma kullanılabilir. CAD nesne renkleri proje ayarlarından, arayüz paleti genel görünüm ayarından yönetilir.

Yeni bilgi, oyun ve çalışma aracı metinleri Türkçe ve İngilizcedir; diğer dillerde bu yeni alanlar İngilizceye düşer. Mevcut 46 dil paketi korunmuştur. Önceki sürüm belgeleri geçmiş kayıttır; güncel paket/EXE adları `KURULUM.txt` içindedir.
