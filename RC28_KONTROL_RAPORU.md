# DentAYA RC28

4 Ekim 2026 (Türkiye). Temel paket: doğrulanmış RC27.

## Yerel AYA

Masaüstünde varsayılan AYA ekranı artık yerel model bağlantısıdır. Electron ana süreci yalnız `http://127.0.0.1:11434` adresindeki Ollama ile konuşur. Sabit adres, yönlendirme engeli, ana pencere/CAD penceresi ve aynı köken denetimi uygulanır. Yerel sohbet Supabase oturumu veya harici API anahtarı istemez. Bulut modu isteğe bağlı ve ayrı kalır; hata halinde otomatik geçiş yapılmaz.

Kurulu GGUF metin modelleri listelenir. Bulut etiketi veya uzak model bilgisi olan modeller reddedilir. Kullanıcının düğmeye basmasıyla Qwen3 4B modeli indirilebilir; ilerleme, iptal, yeniden deneme ve model seçimi bulunur. Motor uygulaması ve model ağırlıkları kaynak ZIP'e dahil değildir. İlk kurulum internet ve yeterli disk/bellek gerektirir. Model indirilince yerel sohbet çevrimdışı kullanılabilir; uygulamanın diğer veritabanı modülleri çevrimiçi hizmetlerini kullanmaya devam eder.

İstek 8.000 karakter, geçmiş son 8 mesaj ve mesaj başına 2.000 karakter ile sınırlıdır. Eşzamanlı üretim/indirme kilidi, 180 saniye yanıt süresi, yanıt boyutu sınırı ve isteği başlatan pencereye ait iptal işlemi bulunur. Model hatasında yazılan soru korunur. Model değiştirilince yanıt doğrulama durumu sıfırlanır. Gerçek yanıt alınmadan yalnız “hazır” durumu gösterilir.

Bu özellik yeni bir temel modelin sıfırdan eğitimi değildir. AYA için yerel çıkarım entegrasyonudur. Model dosyaları ve klinik kayıtlar otomatik gönderilmez; yalnız sohbet metni yerel motora iletilir. AYA kayıt veya CAD geometrisini değiştiremez.

## Görünüm

16 arayüz tarzı ve 11 diş/model tarzı. Yeni arayüzler: Japandi, Art Deco, Riviera, Espresso, Lavender, Terracotta, Ice, Cobalt. Yeni model tarzları: Opal, Rose Ceramic, Graphite Pro, Mint Studio.

Arayüz tarzı seçimi CAD zeminini yeniden “Arayüz temasından” durumuna getirir. CAD yazı tipi arayüzle eşleştirilir. Diş seçimi görünümünün malzeme rengi, pürüzlülüğü ve metalikliği CAD'in doğal görünümüne aktarılır. Bu davranış CAD sahnesi ve fare ayarından kapatılabilir. Analiz modlarının renkleri ve model koordinatları korunur. Görsel form tercihi gerçek restorasyon anatomisini değiştirmez.

## Diller

20 dil: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Hollandaca, Lehçe, Romence, Rusça, Ukraynaca, Arapça, Basitleştirilmiş Çince, Japonca, İsveççe, Danca, Yunanca, Çekçe, Korece. 220 ortak metnin 19 çevirisi vardır. Menü ve ortak arayüz kapsamıdır; her ayrıntılı açıklama ve yeni AYA kurulum metni tamamen çevrilmiş değildir.

## Doğrulama ve sınırlar

- Yerel AYA servis testleri: yalnız sabit yerel adres, kimlik bilgisi göndermeme, uzak model engeli, sınırlı geçmiş, dil, boş yanıt, iptal sahibi, eşzamanlılık, indirme ilerlemesi, motorun yokluğu. Model yanıtları taklit edildi.
- Mevcut bulut AYA hata/yetki testleri; 16 arayüz tercihi; diş yerleşimi ve CAD katman testleri.
- Dil kataloğunda eksik çeviri hücresi ve geçersiz dil kontrolü.

Windows kurulum EXE'si ve gerçek Ollama modeli bu ortamda çalıştırılmadı. Donanıma özgü model hızı veya klinik doğruluk iddiası yoktur. Kaynak pakette araştırma taramaları, anatomi modelleri ve lisanslar korunur.

## Başvuru belgeleri

- https://docs.ollama.com/api/chat
- https://docs.ollama.com/api/tags
- https://docs.ollama.com/windows
- https://ollama.com/library/qwen3:4b

Qwen3 4B model sayfasındaki indirme boyutu yaklaşık 2,5 GB'dır. Bu boyut motorun kurulumu ve çalışma belleğini kapsamaz.

Tarayıcı sonucu: varsayılan yerel modda bulut sohbet isteği yok; ağ kapalıyken taklit masaüstü köprüsüyle yanıt alındı. Hata sonrası sorunun korunması, durdurma, model seçiminin kalıcılığı ve 390 px görünüm geçti. 20 dil, 16 arayüz, 11 model tarzı denendi. Gerçek WebGL sahnesinde model görünümü değişti; geometri koordinatları aynı kaldı. Kalınlık analiz görüntüsü model tarzı değişiminde aynı kaldı. Seçili arayüz yeniden açılışta korundu. Bunlar yerel LLM'nin gerçek çıkarım hızını ölçen testler değildir.

Son kontrol: ESLint sıfır uyarı ile geçti. Üretim derlemesi ve TypeScript kontrolü geçti. CAD içinde eski sabit renkler kaldırıldı; Japandi seçimi gerçek WebGL sahnesinde ve CSS değişkenlerinde doğrulandı.
