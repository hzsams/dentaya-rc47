# DentAYA RC27 kontrol raporu

Tarih: 3 Ekim 2026. Kaynak sürümü: 1.0.0-rc.27. Temel: kayıtlı RC26 paketi.

## Değişiklikler

- Türkçe dahil 15 seçilebilir dil ve 220 kaynak metnin 14 dile çevirisi.
- 54 arayüz dosyasında dil bağlantısı; menü, modül başlıkları, ortak işlemler, temel form alanları ve CAD araç etiketleri.
- Dil seçimi tüm ekranlarda, hızlı görünüm panelinde ve genel ayarlarda bulunur. Yerel kalıcılık ve sekmeler arası güncelleme sağlanır.
- React'ın sunucu görünümüyle aynı dil anlık görüntüsüne bağlı çeviriler kullanılır. Açılışta metin uyuşmazlığı ve dil değişiminde formun yeniden kurulması önlenir.
- Menü araması Türkçe ve seçilen dildeki modül adlarını bulur.
- Tarih, sayı ve para gösterimi dil tercihine bağlandı. Klinik kayıt değerleri, hasta adları, notlar ve kullanıcı gönderileri değiştirilmez. Para birimleri dönüştürülmez.
- Arapçada sağdan sola arayüz; CAD ve FDI koordinatlarında soldan sağa sabit geometri.
- AYA isteklerinde izin verilen dil kodu; büyük gövdeler için doğru 413 yanıtı. Tanılama isteği aynı kalır.
- Paket, çalışma zamanı sürümü, istemci başlığı ve Windows derleme yardımcısı RC27 ile eşitlendi. Eski RC20 sürümüne sabitlenmiş kontrol kapıları düzeltildi.

## Gerçekleştirilen kontroller

| Alan | Kontrol | Sonuç |
|---|---|---|
| Dil kataloğu | 15 dil, eksik hücre, geçersiz dil, bilinmeyen metin, tarih/para biçimleri | Geçti |
| Tarayıcı | 15 dil seçimi, hasta adı/not/tarih/sayı alanlarının korunması | Geçti |
| Açılış ve kalıcılık | Yeniden yükleme, ikinci sekme, engellenmiş depolama, sunucu metni uyuşmazlığı | Geçti |
| Görünüm | Arapça 390/1440 px, yatay taşma, CAD yönünün korunması | Geçti |
| Gezinti | 31 sayfa rotası ve sabit bağlantı hedefleri | Kırık hedef yok |
| CAD | Geometri çekirdeği, iş tanımı, görünürlük, kapalı test mesh'inde 100 fırça işlemi ve geri alma sınırları | Geçti |
| Diş seçimi | FDI komşuluğu, köprü bağlantısı, plan aktarımı, dört formda komşu aralıkları | Geçti |
| Ana ekran / operasyon | Kurum filtreleri, sayımlar, gecikme ve öncelik sıralaması | Geçti |
| Topluluk | Yerel veritabanında erişim kuralları, taslaklar, yorumlar, takip, medya ve moderasyon | Geçti |
| Vaka / üretim / teslimat | Yerel veritabanında klinik → CAD revizyonu → sevkiyat → teslimat kanıtı | Geçti |
| Veritabanı | 26 migration'ın yerel doğrulaması | Geçti |
| AYA | Yetkilendirme, gövde boyutu, izinli dil, tanılama ve sağlayıcı hata durumları; taklit yanıtlarla | Geçti |
| Arayüz / masaüstü | Sekiz tarzın doğrulaması, deneyim tercihleri; Windows logo işlemlerinin taklidi | Geçti |
| Güvenlik / performans | Mevcut kaynak kontrol kapıları | Geçti |

20 doğrulama betiği başarılıdır. ESLint ve TypeScript kontrolü başarılıdır. Üretim derlemesi başarılıdır (36 statik çıktı; dinamik API ve parametreli rotalar korunur).

Yeniden çalıştırılabilir testler: `npm run verify:localization`, `npm run verify:aya`, `npm run verify:community`, `npm run verify:e2e`, `npm run verify:cad`, `npm run verify:release`. Tüm kapılar için `npm run verify` (Node 22+, npm 11+). Yerel ayarların doğrulaması için `npm run verify:env` ayrıca gerçek hizmet bilgileri ister.

## Sınırlar

Bu sürüm tam ürün yerelleştirmesi değildir. Ayrıntılı CAD yönergelerinin, bazı özel form alanlarının, sunucu hata açıklamalarının ve yardım metinlerinin bir bölümü Türkçe kalır. Ayarlarda bu kapsam açıkça belirtilir. 15 dil seçeneği olması tüm metinlerin çevrildiği anlamına gelmez.

31 rota kontrolü statik bağlantı incelemesidir; tüm özel ekranların gerçek kullanıcı hesabıyla uçtan uca kullanıldığı anlamına gelmez. Tarayıcı dil testinde gerçek arayüz bileşenleri ve kontrollü form kullanıldı. Windows kurulumu, kullanıcının canlı Supabase veritabanı, Google Maps ve gerçek AYA sağlayıcısı bu ortamda sınanmadı. Kaynak ZIP hazır Windows EXE'si değildir.

Araştırma taramaları, anatomi modelleri ve lisans dosyaları önceki paketten korunur. Genel CAD geometri testleri hasta özelinde klinik/üretim uygunluğu doğrulaması değildir. Önceden eksik olan hizmet bağlantıları veya SQL kurulumları ayrıca tamamlanmalıdır.
