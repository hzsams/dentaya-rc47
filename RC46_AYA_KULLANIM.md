# AYA RC46 · kullanım ve sınırlar

## 1008 soru nasıl sayıldı?

200 konuda dört farklı amaç için ayrı yanıt yazıldı: tanım, izlenecek yol, kontrol ve sık hata; toplam 800 kayıt. 32 daimi ve 20 süt dişi kodunun her biri için diş adı, bölge, dişlenme/grup ve rakam anlamına ilişkin dört kayıt eklendi; toplam 208. Sonuç: **1008 soru-cevap / 252 konu**. Eş anlamlı yazım varyantları bu sayıya katılmadı. Konular: AYA, CAD iş akışı, geometri, görünüm/renk, tarama/dosya, masaüstü/veri, temel diş bilgisi, üretim kontrol notları ve FDI kodları.

## Kendi cümlenle sor

AYA'da veya CAD asistanında yazıp Gönder'e bas:

- “Kanka selam nasılsın?”
- “Koleyi nasıl kontrol ederim?”
- “İmplant üstü diş gelmiyor.” (CAD'de açık işin durumuyla yanıtlanır.)
- “Kaydet ve çık çalışmıyor.” (Gerçek kayıt durumunu kontrol et.)
- “STL ile OBJ farkı ne?”
- “Zrikonya nedir?” (küçük yazım hatası)
- “75 hangi diş?”
- “Dentin nedir?” ardından “Peki nasıl kontrol ederim?”, “Daha kısa” veya “Devam”.

Konu değiştirirken yeni konuyu açıkça adlandır. Yeni sohbet eski bağlamı kullanmaz. Kısa ve belirsiz mesajlarda açıklama istenebilir. Her yazım hatası veya her serbest cümle için başarı garantisi yoktur.

## Soru kütüphanesi

Kütüphaneyi aç; konu grubunu seç veya ara. Cevabı ve başvuru açıklamasını açarak oku. “Soruyu hazırla” yalnızca yazı alanını doldurur; göndermek ve CAD işlemi yapmak ayrı kullanıcı eylemleridir. Liste sekiz kayıtlık sayfalara bölünmüştür.

## Core ve model farkı

Hazır bilgi, hesap ve iş araçları cihaz içinde deterministik çalışır; model kurulumu gerektirmez. Katalog dışında metin üretmek için kurulu masaüstü yerel modeli ve Core-only kapalı mod gerekir. Model hazır değilse yazı alanı açık kalır. Hata, boş cevap veya iptalde soru mesajı silinmez. Durdur, soruyu taslağa da geri koyar.

“Yerel yanıtı test et” düğmesi hazır olduğunda gerçekten model köprüsünü çağırır. Core cevabı “yerel model yanıtı alındı” diye işaretlenmez. Bu sürüm yeni temel model eğitmez ve arka planda kendiliğinden öğrenmez. Açık uçlu yanıt kalitesi seçilen yerel modele ve donanıma bağlıdır.

## Gizlilik ve güvenlik

Otomatik bulut geçişi veya yeni dış API anahtarı yoktur. İlk model indirmesi internet gerektirir. Bilgi defteri ayrı, isteğe bağlı cihaz kaydıdır; sohbet geçmişi varsayılan olarak kapalıdır. Not eklemek modeli yeniden eğitmez.

AYA taramayı kendiliğinden görmez. Sınırlı CAD metaverisinden öneri üretir; ölçüm yapmış, geometri değiştirmiş veya kaydetmiş gibi davranmaz. Kişiye özel tanı, reçete ve implant torku tahmin etmez. Diş bilgileri genel eğitim; üretim notları genel kontrol rehberidir. Materyal/bileşene özgü güncel üretici talimatı ve yetkili onayı gerekir.

## Dil ve veri

Yeni soru-cevaplar Türkçedir. Kütüphane kabuğu TR/EN; diğer dil tercihlerinde yeni alanlar İngilizcedir ve bilgi dilinin Türkçe olduğu belirtilir. Önceki 46 arayüz paketi korunur. Modelin dil tercihi devam eder.

`RC46_AYA_1008_SORU_CEVAP.json` aynı katalogdan üretilmiş veri dökümüdür; dosyayı düzenlemek uygulamaya otomatik aktarım yapmaz. Kaynak kartları `electron/aya/catalog/` altındadır. Kişisel yeni bilgi için uygulamadaki bilgi defterini kullan.

## Kontroller

`npm run verify:aya-catalog` kanonik soruları, ayrı kullanıcı cümlelerini, bağlamı ve ortak yanıt politikasını sınar. `npm run verify:aya-conversation-browser` ana sohbet ve CAD ekranı testidir; test ortamında Playwright gerekir. `npm run verify` genel regresyonları ve üretim derlemesini çalıştırır. Motor testleri taklit çıkarım kullanır; gerçek Windows kurulumu ve gerçek GGUF yanıt kalitesi ayrıca sınanmalıdır.
