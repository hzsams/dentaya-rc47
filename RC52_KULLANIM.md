# DentAYA RC52 / Studio çalışma düzeni

Kurulum: [KURULUM.txt](KURULUM.txt). Sürüm `1.0.0-rc.52`, AYA Core `0.8.0`. Bu teslim tam kaynak güncellemesidir; hazır Windows EXE içermez. **RC52 kaynak kontrolleri geçti.** Dokuz tarayıcı regresyonu, tam verify zinciri ve üretim yükleme kontrolünün sonuçları ile gerçek Windows/model/canlı kurum kabulünün sınırları [kontrol raporunda](RC52_KONTROL_RAPORU.md) bulunur.

## Ortak çalışma alanı

Uygulamanın giriş adresi doğrudan İş yöneticisini açar. DentAYA Studio, aydınlık panelleri ve erik moru başlıkları kullanır. CAD dışındaki ekranlarda üstte kompakt başlık ve çalışma alanı sekmeleri, solda simgeli etkinlik şeridi, altta durum çubuğu bulunur. Etkinlik şeridi iş yöneticisi, Design, hastalar, taramalar, mesajlar, finans ve AYA'ya erişir. AYA dahil diğer modüller modül menüsünden de açılır; CAD'den bu geçişler kayıt ve kurtarma kapılarını kullanır. Ayarlar kategori listesi ve ilgili ayar alanlarıyla çalışır.

İş yöneticisindeki ana iş tablosunu arama ve mevcut filtrelerle daraltın. Seçili kaydın ayrıntıları bağlama göre açılır; üst araç şeridi mevcut işlemleri sunar. Vaka ve teslimat alanları mevcut kurum kayıtlarını kullanır. Oturum veya kurum bağlantısı eksikse erişim ve boş durum gösterilir; örnek iş veya sahte sayı üretilmez.

Durum çubuğu mevcut modülü, tarayıcının ağ durumunu ve sürümü gösterir. Ağ açık göstergesi sunucu kaydının başarılı olduğu anlamına gelmez. Dar ekranda modül menüsü kullanılır. CAD kendi tam çalışma alanını ve durum göstergelerini kullanır.

## DentAYA Design

CAD'de ortak uygulama başlığı gösterilmez. Solda nesneler ve görünürlük listesi, onun altında seçili görevin beyaz parametre paneli bulunur. Mevcut komutlar sağdaki koyu araç şeridinden açılır; 3B çalışma alanı ortada kalır. Bu düzen mevcut CAD araçlarını kullanır.

Kılavuzlu aşamalar dosyalar → kole → yerleşim → anatomi → serbest şekillendirme → temaslar → inceleme → kayıt sırasını izler. Aşama kapıları ve uzman modu korunur. Panel taşıma, kayıtlı serbest konum, yeniden bağlama ve konum sıfırlama seçenekleri mevcut kontrollerden kullanılır.

Yeni CAD oturumlarında düz mor Studio arka planı seçilir; ızgara ve eksenler kapalı başlar. Görünüm ayarlarından arka planı, ızgarayı ve eksenleri değiştirebilirsiniz. Daha önce açıkça seçilmiş sahne arka planı ve görünüm seçenekleri korunur. Diğer temalar ve kişisel marka/dil tercihleri kullanılmaya devam eder.

İmplant koleye yerleştirme, ünite geçişi, şekillendirme ve geri alma mevcut işlemlerle çalışır. Kaydetme ve modül geçişi sunucunun başarılı kayıt yanıtını bekler. Kayıt hatasında tasarım açık kalır; yeniden deneme ve mevcut yerel kurtarma seçenekleri kullanılabilir. Bekleyen kurtarma kararı çözülmeden kayıt veya geçiş başlatılmaz. Bu sürüm yeni geometri algoritması eklemez.

AYA, sağ komut şeridindeki **AYA** düğmesinden açılır. Uygulanabilir CAD önerisini **Uygula** ile siz başlatırsınız; çalışma değiştiğinde eski öneri uygulanamaz. Yerel model kapalıyken manuel CAD çalışır. Hedef, karar ve açık soru komutları ile çalışma belleği [RC50 kullanımında](RC50_KULLANIM.md) açıklanır; normal konuşmada hazır yerel model önceliğini korur.

## Yükleme ve erişim

Zorunlu 5 saniyelik okuma/bekleme kaldırılmıştır. Yükleme görünümü yalnız ilgili işlem hazırlanırken gösterilir; işlem hazır olduğunda kartı okumayı veya bir oyunu bitirmeyi beklemez. Hazır ekranda otomatik okuma katmanı açılmaz. Bilgi kartları ve mini oyunlar mevcut isteğe bağlı kontrollerden açılabilir.

- **Alt+M:** Modül menüsünü açar ve aramaya odaklanır.
- **Ctrl+K:** Erişiminizin desteklediği ekranlarda mevcut hızlı navigasyonu açar.
- **Ctrl+,**: Görünüm ve çalışma tercihlerini açar.
- **Esc:** Açık menü veya iletişim kutusunu kapatır.

Yeni masaüstü metinleri TR/EN ve diğer diller için İngilizce fallback kullanır. Mevcut 46 dil paketi kaldırılmaz. Üründe 220 gerçek kısa bilgi kartı ve ayrı 1008 soru-cevap kaydı bulunur; 30.000 gerçek içerik hedefi tamamlanmış değildir.
