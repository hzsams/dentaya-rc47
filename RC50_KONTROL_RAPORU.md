# RC50 kontrol raporu

Sürüm: `1.0.0-rc.50`; AYA Core: `0.8.0`. Tarih: 20 Ekim 2026. RC49 üzerine çalışma belleği, desteklenen çok adımlı görevler ve model kapalıyken CAD önerileri eklendi. Önceki modül kapsam ve sınırları [RC48 raporunda](RC48_KONTROL_RAPORU.md), temel sohbet değişikliği [RC49 raporunda](RC49_KONTROL_RAPORU.md) kayıtlıdır.

## Uygulanan davranış

- Hedef/karar/açık soru sohbetten açık TR/EN komutlarla kaydedilir, değiştirilir ve kaldırılır. Çok satırlı değişiklik atomiktir: kapasite veya satır hatası önceki belleği değiştirmez. Kopya denetimi Unicode metni ve `+`, `-`, `!=` gibi anlam taşıyan işaretleri korur. Alıntı, koşullu istek veya aynı satırdaki başka görev kayıt komutu sanılmaz.
- Açık bellek kontrolleri deterministiktir; normal hatırlama ve sohbet istekleri hazır modele öncelikle gider. Geçmiş kaydı tercihi, yeni sohbet sıfırlaması ve CAD kapsamları korunur. Model hatası veya zorlanan model testinin başarısızlığı belleği değiştirmez.
- Mevcut hesaplama/birim/yüzde araçları, temel diyalog, bilgi tanımı, kontrol listesi ve teslim taslağı en fazla 6 desteklenen görev olarak birleştirilebilir. Teslim taslağı çalışma belleğini kullanır; gönderilmiş mesaj, yapılmış kontrol veya vaka kaydı iddia etmez. Alıntı ve desteklenmeyen görev atlanıp tamamlanmış sayılmaz.
- CAD'de geçerli proje/kaynak/ünite kapsamı ve durum kimliğiyle, yalnız kullanılabilir tipli araçlar önerilir. Güncel gerçek rapor, iş tanımı, kole/yerleşim, görünürlük, geri alma geçmişi ve kayıt sonucu değerlendirilir. İmkânsız/çelişkili veri öneri üretmez. Yeni bilgi yoksa sayısal ölçüm üretilmez.
- Antagonist örnekleri, kabuk offset duvar tahmini ve kaynak mesafesi ayrımları korunur. Temiz raporun bilgi mesajı hata sanılmaz. Negatif işlem istekleri tersine çevrilmez; farklı görev türlerini birleştiremiyorsa açıkça netleştirme istenir.
- CAD uygulaması mevcut kullanıcı tıklaması, tipli callback ve güncel durum kapısını kullanır. Bu sürüm kernel veya mesh işlemlerini değiştirmez. Çevrimdışı kontrol sonrası rapor yorumu Güncel durumu değerlendir ile yenilenir; sınırsız otomatik ajan döngüsü yoktur.

## Kontroller

Yeni bellek testinde 141 davranış kontrolü; görev bileşiminde 25 kontrol; gerçek deterministik geometri verisiyle CAD diyalog testinde 28 davranış grubu vardır. Önceki 214 temel sohbet kontrolü ve 1008 katalog kaydı korunur. Bunlar eğitim verisi veya yeni ürün soru sayısı değildir.

CAD testi gerçek Box/Plane mesh kontrolü, marjin kalitesi, küre kabuk duvar tahmini ve örneklenmiş antagonist temasını mevcut kernel ile hesaplar. Bu sonuçları mevcut rapor özetleyici ve araç kapılarına verir; eski proje/kaynak/ünite/geometri önerisi gerçek callback çağrılmadan reddedilir.

Yeni tarayıcı testi gerçek AyaChat/CadAyaPanel bileşenlerinde açık bellek, yeni sohbet, geçmiş tercihiyle yeniden yükleme, çok adımlı yanıt, modele bellek iletimi, Uygula gerekliliği, eski önerinin kapanması, eksik antagonist ve başarısız kayıt davranışını denetler. Model ve CAD callback'leri sentetiktir; bu tarayıcı testi gerçek geometri işlemi çalıştırdığını iddia etmez.

`npm run verify` exit 0 ile tamamlandı: sıfır uyarılı ESLint, TypeScript, CAD kernel/yerleşim/şekillendirme/kayıt iş akışı, gerçek migration verileriyle şema/rol kontrolleri ve 38 sayfalık üretim derlemesi geçti. Önceki AYA tarayıcı regresyonu ve yeni çalışma/CAD tarayıcısı ayrı ayrı exit 0 ile tamamlandı. Geçersiz hesap, sayısal sonuç üretmeden açık hata mesajıyla yanıtlanır; eski sessiz-null beklentisi bu davranış ve sayısal çekirdek reddiyle güncellendi.

Yürütülen komutlar, nihai sonuçlar ve günlükler `verification/RC50/` altında tutulur. Kaynak paketin bütünlüğü `node scripts/verify-source-integrity.mjs` ile kontrol edilir.

## Tamamlanmayan kabul işleri

- Gerçek GGUF çıkarımı, modelin Türkçe dil kalitesi ve donanım hızı bu sürümde doğrulanmadı. Hazır modelin çağrılması, sistem talimatı, bellek ve hata yolları mock köprüyle test edilir. Core genel dil modeli değildir; her yeni serbest cümleyi anladığı iddia edilmez.
- Linux ortamında Windows Setup EXE üretilmedi veya çalıştırılmadı. Teslimat kaynak güncellemesidir.
- Canlı kurum/Supabase, çok kullanıcılı akış, gerçek tarama, klinik ve üretim hassasiyeti kabulü yapılmadı. RC48 raporundaki diğer modül sınırlamaları devam eder.
- Üründeki gerçek kısa bilgi kartı sayısı 220; ayrı soru kataloğu 1008 kayıttır. 30.000 içerik hedefi tamamlanmadı.

Model ağırlıkları, kişisel `.env.local`, sırlar, bağımlılık/derleme klasörleri ve geçici tarayıcı sayfaları teslimata girmez. Web sitesi deposuna dağıtım yapılmaz.
