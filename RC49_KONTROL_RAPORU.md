# RC49 kontrol raporu

Sürüm: `1.0.0-rc.49`; AYA Core: `0.7.0`. Tarih: 19 Ekim 2026. RC48 üzerine AYA'nın temel konuşma davranışı geliştirilmiştir. Önceki modül çalışmalarının kapsam ve sınırları [RC48 raporunda](RC48_KONTROL_RAPORU.md) bulunur.

## Değişiklikler

- Ad/kimlik, amaç, yetenek, sınır, yerel motor, gizlilik, bellek, ekran/CAD erişimi ve temel sohbet için ortak TR/EN diyalog katmanı eklendi. Kibar hitaplar, noktalama ve birden fazla temel soru işlenir. Bir kelimenin metin içinde geçmesi kimlik yanıtını tetiklemez; alıntı, çeviri veya yazı görevi yutulmaz.
- AYA profili yerel modelin güvenilir sistem talimatına bağlandı; isteğe bağlı katalog ve kişisel notlardan bağımsızdır. Model hazırsa normal soruların önceliği modeldedir. Notlar sistem talimatına dönüşmez.
- Sohbet geçmişindeki açık isim beyanı kullanılabilir; son düzeltme geçerlidir. Asistanın kendi mesajı, alıntı veya üçüncü kişinin adı kullanıcı adı sayılmaz. İsim inkârı/unutma önceki adı kullanmayı durdurur; mesajları silmiş gibi davranmaz. Kalıcılık veya model eğitimi iddiası yoktur.
- “Daha kısa” gerçekten kısaltır; “örnek ver” bellek/gizlilik gibi son konuyla ilgili örnek verir. Yeni konu ve “devam etme” eski dental katalog yanıtını sürdürmez. Teşekkür ve kısa onay uygun konuyu korur.
- Model hata yolunda bilinen temel soru Core ile yanıtlanabilir; motor ve hata açıkça belirtilir. İptalde Core yanıtı kendiliğinden devam etmez. Sorunun, taslağın ve çalışma belleğinin korunması sürer.
- Manuel CAD ve tipli araç izin listesi korunur. Bu değişiklik geometri işlemi çalıştırmaz; ölçüm veya kayıt başarısı uydurmaz.

## Doğrulama

Doğrudan diyalog testi 214 davranış kontrolü içerir: TR/EN ve kibar ifadeler, birleşik sorular, isim kanıtı/düzeltme/unutma, kısa takipler, alıntı/görev sınırları, eski katalog konusunun kesilmesi ve hesaplama/acil durum yönlendirmesi. Hazır 1008 katalog sorusu ve 77 ifade regresyonu ayrıca korunur.

Ortak yönlendirici testi temel soruların model hazırken modele ulaşmasını, model hatasında açık Core yanıtını, iptalin nihai kalmasını, bellek ve CAD durumunu denetler. Model bağlam testi kimliğin katalog açık/kapalı ve agent/legacy yollarında sistem talimatı olduğunu denetler.

Tarayıcı testi gerçek sohbet bileşeninde temel soruları, birleşik yanıtı, isim düzeltme/unutmayı, konuya bağlı örneği, durdurma ve yeni konu sınırını; ayrıca mevcut bellek, CAD, mobil, iptal ve geç gelen sonuç korumalarını denetler. Yerel model ve CAD köprüleri bu testte mock kullanır.

`npm run verify` exit 0 ile tamamlandı; CAD kernel/yerleşim/şekillendirme/kayıt akışı testleri de zincire dahildir. Son temel sohbet düzenlemelerinden sonra AYA paketi (214 kontrol), tarayıcı, sıfır uyarılı lint, tip kontrolü ve 38 sayfalık üretim derlemesi tekrar exit 0 ile tamamlandı.

Bu sürümün yürütülen komutları ve sonuçları `verification/RC49/results.json`, günlükleri aynı klasördedir. Kaynak paket `node scripts/verify-source-integrity.mjs` ile kontrol edilir.

## Tamamlanmayan doğrulamalar

- Gerçek GGUF çıkarımı bu sürümde çalıştırılmadı. Sistem talimatının modele taşındığı doğrulanır; modelin gerçek dil kalitesi/hızı henüz doğrulanmış değildir.
- Linux ortamında Windows Setup EXE üretilmedi veya çalıştırılmadı. Teslimat kaynak güncellemesidir.
- Canlı kurum/Supabase, gerçek tarama, klinik veya üretim kabulü yapılmadı. RC48'de belirtilen modül sınırlamaları devam eder.
- 30.000 gerçek bilgi kartı hedefi tamamlanmadı; üründe 220 kısa kart ve ayrı 1008 soru kataloğu vardır. Bu sürüm hazır soru sayısını artırmaz.

Model ağırlıkları, kişisel ayarlar, sırlar, `node_modules`, `.next` ve geçici tarayıcı sayfaları kaynak paketine girmez. Web sitesi deposuna dağıtım yapılmaz.
