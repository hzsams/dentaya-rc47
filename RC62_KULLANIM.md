# DentAYA RC62 kullanımı

Sürüm: `1.0.0-rc.62` · AYA Core `0.18.0` · 28 Ekim 2026.

## Windows uygulaması

Hazır Windows kurucusu yayımlandıysa sürümün `DentAYA-Setup-1.0.0-rc.62.exe` dosyasını kullanın. Kaynak ZIP kurucu değildir; ZIP ile çalışanlar `DENTAYA_GUNCELLE_DERLE.cmd` üzerinden kendi Windows derlemesini oluşturur. Önceki RC sürümlerini sırayla kurmak gerekmez. Kendi vaka/tarama dosyalarınızı ve yerel kurtarma verilerinizi yedekleyin.

## AYA ile konuşma

AYA > Ayarlar > Genel bölümünde yerel motor ve model durumuna bakın. İndirme, dosya doğrulaması ve yanıt üretimi farklı işlemlerdir. Yerel sohbet için DentAYA hesabı veya bulut API anahtarı gerekmez. Model kurulu değilse normal sohbet hazır cevap üretmez; kurulum adımı görünür. Ollama seçeneği bilgisayarda çalışan yerel Ollama gerektirir.

Soruyu normal cümlelerle yazın. Yanıt akarken durdurabilirsiniz. Model hatası, kesinti veya iptalde soru yeniden gönderilmek üzere korunur; yarım yanıt tamamlanmış konuşma diye kaydedilmez. Çalışma belleğinde hedefi, alınan kararları ve açık soruları görebilir, elle düzeltebilirsiniz. Bellek güncellemesi ayrı bir yerel model işlemidir; modele kalıcı eğitim verildiği anlamına gelmez.

Aynı sekmede başka modüle gidip AYA'ya dönünce çalışma kopyası ve taslak korunur. Geçmiş saklama kapalıysa konuşma yalnız süreç belleğindedir, sayfa yenilemede saklanmaz. Geçmiş açıkken kayıtlı oturumun gönderilmemiş taslağı yenilemeden sonra dönebilir; silinmiş oturum geri getirilmez. Kayıtlı olmayan yeni taslağın sayfa yenilemesinde kurtarılması garanti edilmez. Kesilen soruyu göndermek için açıkça yeniden denemeniz gerekir; otomatik gönderim yapılmaz.

## Yerel model kabul oturumu

Kurulum panelindeki kabul oturumu yalnız düğmeye bastığınızda başlar. Dokuz sentetik istek; doğal konuşma, yeni bir anlatım, hedef/karar belleği, kısmi düzeltme ve eksik CAD kanıtını sınar. Normal sohbet, kişisel not, vaka veya hasta verisi kullanılmaz; CAD işlemi yapılmaz. İlerlemeyi izleyebilir, iptal edebilir, ham soruları/yanıtları açabilir ve JSON raporunu dışarı aktarabilirsiniz.

Otomatik işaretler yalnız sınırlı sinyallerdir. Geçmesi genel doğruluk veya klinik onay anlamına gelmez. Ham yanıtların anlamını kendiniz inceleyin. Kurulu model teknik olarak hazır olup kötü yanıt verebilir; iki durum ayrı gösterilir.

Geliştiriciler kurulu yerel modeli `npm run evaluate:aya -- --model MODEL_KIMLIGI --report /rapor/yolu.json` ile aynı yalıtılmış oturumda değerlendirebilir. Bu komut model indirmez. Windows managed kurulum yolu gerekiyorsa `--directory` verilebilir; ayrıntılar `--help` çıktısındadır.

## CAD ve diğer modüller

Manuel CAD modelden bağımsız çalışır. AYA'nın önerdiği işlem yalnız Uygula tıklamasıyla ve güncel proje/ünite/mesh kapılarından sonra çalışır. Antagonist, gerçek kontrol veya kayıt sonucu eksikse üretim/kapanış güvenliği varsaymayın. Kesit alanı duvar kalınlığı değildir; kabuk offset değeri tahmindir.

Koleye yerleştirme, ünite geçişi, fırça, undo/redo, yerel kurtarma ve kaydet/çık mevcut akışları kullanır. Kayıt başarısızsa tasarımdan çıkmayın; yerel kurtarma durumunu ve hata bildirimini kontrol edin.

Hesapsız Ayarlar ekranında görünüm, dil ve AYA tercihleri kullanılabilir. Kurum hasta/vaka/randevu/finans işlemleri kendi yetkili oturumunu ve backend yapılandırmasını gerektirir. Bekleyen vaka/randevu kaydında form kilitlenir; randevunun değiştirilmiş taslağını kapatırken onay istenir. Gerçek kurum/klinik kabulü kaynak ve sentetik testlerle tamamlanmış sayılmaz.

120 hacim etkili SVG logo, 72 görünüm, 500 bilgi/60 kaynak, 1008 yardımcı katalog kaydı ve beş isteğe bağlı oyun korunur. Logo varlıkları gerçek 3B mesh değildir. Zorunlu beş saniyelik yükleme süresi yoktur.
