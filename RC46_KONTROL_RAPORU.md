# RC46 · doğrulama kapsamı

Tarih: 2026-10-18. Temel: RC45 Onarım 2; sürüm `1.0.0-rc.46`.

## AYA bilgisi ve yanıt akışı

- 1008 farklı kanonik soru: doğru yanıt ve doğru kaynak kimliğiyle tek tek sınandı.
- 252 konu; her konuda dört farklı yanıt. Konu sayısı ile soru sayısı ayrı tutulur.
- 77 ek kullanıcı ifadesi: konu ve soru amacı (tanım/adım/kontrol/hata) eşleştirmesi sınandı. Bunlar geliştirme regresyon örnekleridir; görülmemiş kullanıcı verisi üzerinde genel başarı oranı iddiası değildir.
- 11 konu dışı/ilgisiz girdi: benzer sözcükten alakasız dental yanıt üretmemesi sınandı.
- Devam, kısa yanıt, konu değiştirme, karşılaştırma ve kaynaklı takip soruları sınandı.
- Bilgi kullanma tercihi, açık not paylaşımı ve bilgi defteri kaynakları korundu.
- Genel belirti, ilaç ve tork sorularında tahmin yerine güvenli sınır yanıtları sınandı. Bu testler klinik doğrulama veya kapsamlı tıbbi güvenlik sertifikası değildir.
- Model yokken, hata/boş yanıt/zaman aşımında ve iptalde yanıt akışı sınandı. Kullanıcının sorusu konuşmadan silinmez.

## Tarayıcı ekran kontrolleri

Yeni `verify:aya-conversation-browser`: masaüstü köprüsü olmadan mesaj yazma, serbest soru, takip sorusu, arama/konu filtresi, soru hazırlama, geçmişi açma/kapatma, mobil yazı alanı, CAD kole ve kayıt metaverisi, otomatik CAD işlemi yapılmaması, model hatası ve iptalde sorunun korunması.

Core yanıtı model yanıtı gibi etiketlenmez. “Yerel yanıtı test et” model köprüsünü çağırır; bu ekran kontrolünde köprü taklittir, gerçek GGUF çıkarımı değildir.

Genel `verify:ui-browser`: 46 dil paketi, kullanıcı metni/dosya seçimi ve diş seçimlerinin korunması, bilgi defteri kalıcılığı, motor kurulum ekranı, akış ve eski token koruması, 200 yükleme bilgisi, üç oyunun etkileşimleri/rekorları, 56 ses işareti, mobil düzen, sohbet kopyalama/dışa aktarma ve geçmişi kapatma kontrolleri çalıştırıldı.

## Korunan önceki işlevler

Eski RC37 formları, teknisyen STL/OBJ kütüphanesi, koleye yerleştirme, kapalı gövde kontrolleri, şekillendirme ve proje geometri kaydı testleri korunur. Renk grupları ve görünürlük/çene ilişkisi testleri korunur. Yeni uygulama bağımlılığı veya veritabanı migration'ı eklenmedi.

Windows paketleme yardımcısının 25 regresyonu; eksik Electron dağıtımı, EXE'den sürüm okuma, yanlış mimari/sürüm reddi, DLL kilidinde sınırlı yeniden deneme ve gerçek Setup doğrulaması için taklit dosya/işlem düzenekleri kullanır. RC45 Onarım 2 mantığı değiştirilmedi.

## Komutlar ve sınırlar

- `npm run verify:aya-catalog`
- `npm run verify:aya-conversation-browser`
- `npm run verify:ui-browser`
- `npm run verify` (genel kontroller, lint, TypeScript ve Next üretim derlemesi)
- `node scripts/export-aya-catalog.mjs --check`
- `npm run verify:source-integrity` (paket üretildikten sonra dosya boyutu ve SHA-256)

Test ortamı Linux / Node.js 24.19.0 / npm 11.9.0; üretim derlemesi Next.js 16.3.8. Ekran testleri headless Chromium ile çalıştırıldı. Gerçek Windows Setup kurulumu, gerçek hasta işi, üretim cihazı ve gerçek yerel model yanıt kalitesi bu raporda doğrulanmış değildir. Paket tam kaynaktır, hazır Windows EXE'si içermez.

Yeni hazır bilgi Türkçedir; yeni kütüphane kabuğu TR/EN, diğer seçimlerde İngilizcedir. Önceki 46 arayüz paketi korunur. AYA Core bir bilgi/iş akışı katmanıdır; temel model sıfırdan eğitilmedi ve arka planda kendiliğinden öğrenme eklenmedi.
