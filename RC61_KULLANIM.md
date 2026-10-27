# DentAYA RC61 kullanım

Sürüm `1.0.0-rc.61`, AYA Core `0.17.0`. Tam kaynak güncellemesidir; önceki RC paketlerinin ayrıca kurulması gerekmez. Bu ZIP hazır Windows EXE veya model ağırlıkları içermez. Windows derleme adımları [KURULUM.txt](KURULUM.txt) içindedir. Çalışan verilerinizi, `.env.local` ve kişisel ayarlarınızı koruyun.

## Yerel AYA'yı başlatma

**AYA → Sohbet ayarları → Genel → Model ve çalışma ayarları** bölümüne girin. Yerel sohbet API anahtarı veya DentAYA hesabı istemez; otomatik bulut geçişi yoktur.

- **Yerel motoru kur** mevcut SHA-256 ve boyut doğrulamalı llama.cpp / Qwen3 1.7B paketini kurar. Bu küçük başlangıç seçeneğinin pinleri değiştirilmedi.
- **16 GB RAM için Qwen3 4B:** bilgisayarınızda [Ollama](https://ollama.com/download/windows) kurulu ve çalışıyorsa **Ollama ile 4B modeli indir** düğmesi görünür. İndirme bittikten sonra `qwen3:4b` modelini listeden seçin. İşlemci hızı ve diğer açık uygulamalar yanıt hızını etkiler; bu bir performans garantisi değildir. Ollama indirmeyi kendi yerel servisiyle yönetir; DentAYA bunu managed modelin sabit SHA-256 indirmesi olarak sunmaz.
- **Yerel model ekle** uyumlu GGUF dosyanızı içe aktarır. Kurulu model görünmüyorsa **Motoru ve modelleri yenile** kullanın.
- **Yerel yanıtı test et** sohbet geçmişi, notlar ve çalışma belleğinden ayrı geçici bir kontrol başlatır. Hazır/kurulu durumu başarılı model yanıtıyla aynı değildir.

İndirme ve iptal durumları ayrı gösterilir. Başka pencerenin başlattığı indirme bu pencereden durdurulmuş sayılmaz. Ağ kesilirse soru ve manuel CAD araçları kullanılabilir kalır. Managed modelde yarım dosya yeniden denemede sürdürülebilir; tam boyut/hash doğrulanmadan kullanılmaz. Ollama aktarımı da ilerleme yoksa zaman aşımıyla yeniden denemeye açılır.

## Serbest sohbet ve bellek

Normal mesajlar doğrudan seçili yerel modele gider; hazır soru seçmeniz gerekmez. Modelin doğal metni akış halinde görünür. Model yoksa, meşgulse, hata verirse veya yanıtı durdurursanız otomatik rehber yanıtı eklenmez. Sorunuz korunur; modeli kontrol edip tekrar gönderebilirsiniz. Yarım akış tamamlanmış cevap olarak geçmişe yazılmaz.

Hedef, karar ve açık sorular **Bellek ve notlar** içinde görünür ve elle düzenlenebilir. Başarılı sohbetten sonra ayrı, sınırlandırılmış bir yerel model çağrısı açık kullanıcı hedeflerini/kararlarını çıkarır; kişisel not, katalog, CAD veya eski konuşma bu çağrıya girmez. Bu işlem başarısız olsa da asıl yanıt kalır. Yeni soru önce bekleyen bellek işlemini durdurur; eski sonuç başka oturuma veya elle değiştirilmiş belleğe uygulanmaz. Bellek model eğitimi değildir ve doğruluk garantisi vermez.

Açık bellek kaydetme/silme komutları ve acil durum uyarıları deterministik kontrollerdir; model çıkarımı diye sunulmaz. Eski rehber yanıtları kayıtlı konuşmada görülebilir; yeni model bağlamında geçmiş model cevabı gibi kullanılmaz.

Kişisel notlar yalnız açık tercih ve ilgili alıntılarla sohbet bağlamına girer. Sistem talimatı sayılmaz. Kaynak göstermek klinik/üretim onayı değildir.

## CAD içinde AYA

Varsayılan **Yanıt kaynağı → Yerel model** güncel proje/kaynak/ünite, gerçek ölçüm ve kayıt durumunu kullanarak yanıt/öneri hazırlar. Model hatası otomatik hazır öneri üretmez. İstenirse **Yanıt kaynağı → Araç rehberi** açıkça seçilir; bu ayrı etiketli deterministik yardımdır. Rehber mesajları model konuşma geçmişine aktarılmaz.

27 tipli komut mevcut **Uygula** kapısını kullanır. Öneri tek başına geometriyi değiştirmez. Eski öneri değişmiş ünite/geometriye uygulanmaz. Kaydetme, koleye yerleştirme, şekillendirme, undo/redo, kayıt hatasında ekranda kalma ve yerel kurtarma mevcut araçlarla çalışır. Manuel CAD modelden bağımsızdır.

## Geçmiş ve sınırlar

Geçmiş saklamak isteğe bağlıdır. Değişmemiş kaydı açma/dil değiştirme no-op davranışı ve başka pencerenin gerçek değişikliğinde açık yükle/ayrı kopya seçenekleri korunur. Bu iyimser localStorage revizyon denetimidir; atomik pencere kilidi değildir. Ana sohbetin gönderilmemiş taslağı sayfadan ayrılma/yenilemede saklanmaz; CAD aynı kapsamın taslağını süreç ömründe korur.

Bu sürümde gerçek model yanıt kalitesi, Windows EXE ve canlı kurum/klinik kabulü tamamlanmadı. Resmî model sunucularına bu geliştirme ortamından erişim engellendi. Güncel gerçek test sonuçları ve açık kalanlar [RC61_KONTROL_RAPORU.md](RC61_KONTROL_RAPORU.md) içindedir.
