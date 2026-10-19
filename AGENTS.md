# DentAYA çalışma talimatı

Bu klasör RC46/RC47 tabanından geliştirilen RC48 kaynak güncellemesidir. Önce CODEX_DEVIR_NOTLARI.md ve CODEX_BASLANGIC_PROMPTU.md dosyalarını oku; bunlar ilk WIP devir kayıtlarıdır. Güncel kapsam ve test sınırları RC48_KONTROL_RAPORU.md içindedir. Windows EXE ve gerçek model çıkarımını doğrulanmış kabul etme.

- Kullanıcının önceliği: sade ve tutarlı profesyonel arayüz, model öncelikli yerel AYA, çalışma belleği ve gerçek CAD araçlarıyla bağlamlı yardım. “AI based kaldır” açıklaması AYA’yı kaldırmak değildir.
- CAD manuel ve deterministik çalışır; asistan mevcut tipli komutları kullanıcı tıklamasıyla çağırır.
- Üründe 220 gerçek kısa bilgi kartı vardır; 30.000 kapasite testini gerçek içerik sayısı diye sunma. Hazır soru sayısını artırmayı ana görevin yerine koyma; iptal edilen RC38 form ailelerini geri getirme.
- İmplant koleye yerleştirme, kayıt/çıkış, yerel kurtarma ve mevcut kernel testlerini koru.
- Yerel model/API anahtarsız çalışma, loopback, doğrulanmış indirmeler, iptal ve token bütçesini koru. Buluta otomatik geçiş ekleme.
- Gerçek kaynak kodunu esas al; eski RCxx raporları WIP doğrulaması değildir.
- İlk devirdeki react-hooks/refs hatası ve modeli gölgeleyen eski test beklentileri düzeltildi. Güncel kontrolleri çalıştır; eski raporları yeni değişikliğin doğrulaması sayma. Tarayıcı fixture testleri ile genel verify zincirini sırayla çalıştır.
- package-lock kullan; bağımlılıkları gerekçesiz topluca yükseltme. Yeni sırlar, .env.local, node_modules, .next ve geçici test sayfaları teslimata girmez.
- Rutin, geri alınabilir kod değişikliklerinde ilerle. Üretim web sitesine dağıtım bu görevin kapsamı değildir.
- Türkçe, somut ilerleme bilgisi ver. Mock/native çıkarım, kaynak ZIP/Windows EXE, geliştirme/üretim doğrulaması ayrımlarını açık tut.

