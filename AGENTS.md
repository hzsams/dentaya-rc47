# DentAYA çalışma talimatı

Bu klasör RC46/RC47 tabanından geliştirilen RC52 kaynak güncellemesidir. Önce CODEX_DEVIR_NOTLARI.md ve CODEX_BASLANGIC_PROMPTU.md dosyalarını oku; bunlar ilk WIP devir kayıtlarıdır. Güncel kapsam ve test sınırları RC52_KONTROL_RAPORU.md içindedir. RC52'nin dokuz tarayıcı kontrolü, tam verify zinciri, üretim derlemesi ve üretim yükleme kontrolü geçti. Windows EXE, gerçek model çıkarımı ve canlı kurum kabulünü doğrulanmış kabul etme.

- RC52, Studio aydınlık panellerini, mor başlıkları ve CAD'de sağ koyu komut şeridini kullanır; nesneler parametrelerin üstünde soldadır. CAD'de ortak uygulama başlığını veya ek modül kenar çubuğunu geri getirme. exocad/3Shape ergonomik referanstır; tescilli kod, logo veya arayüz varlığı kopyalama. Geçerli dil, açıkça seçilmiş görünüm tercihleri, kılavuzlu/uzman mod ve taşıma/sıfırlama davranışlarını koru.
- Yükleme yalnız gerçek bekleyen işlemin ömrünü izler. Zorunlu 5 saniyelik okuma, işlem sonrasında kalan katman veya hazır ekranda odak tuzağı ekleme. Bilgi kartları ve mini oyunlar isteğe bağlı kalır.
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

