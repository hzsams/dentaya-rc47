# DentAYA RC40 — kullanım

## Windows güncellemesi

1. ZIP'i yeni bir klasöre açın; `DentAYA_Production_RC40` klasörünü kullanın.
2. Çalışan projenizin `.env.local` dosyasını `package.json` ile aynı klasöre kopyalayın.
3. Tek giriş dosyası olan `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çalıştırın. Node.js 22+ ve npm 11+ gerekir.
4. Derleme bittiğinde açık DentAYA programını kapatın ve `dist-desktop\DentAYA-Setup-1.0.0-rc.40.exe` dosyasını çalıştırın.

Paket kaynak kodudur; hazır Windows EXE'si içermez. Mevcut bağlantı ayarları korunur; derleme etiketi RC40'a yükseltilir. Veritabanı şeması değişmediği için bu güncelleme yeni migration gerektirmez.

## Kole sonrası diş yerleşimi

İş tanımını onaylayın ve çalışma taramasını seçin. Aktif ünitenin kolesini, preparasyon veya implant dayanağının çevresinde çizip **Sonraki** ile ilerleyin. Diş, çizdiğiniz kolenin konum ve düzlemine yerleşir; başlangıç boyutu yerel koleye göre hesaplanır. Kamera bu dişe odaklanır. Geçerli bir kapalı çevre oluşturmayan kole ilerlemeyi durdurur.

Anatomi bölümündeki veya AYA panelindeki **Koleye yerleştir** düğmesi yerleşimi yeniden uygulamak için kullanılabilir. Aynı koleye tekrar yerleştirmek şekillendirmeyi silmez veya dişi tekrar daraltmaz. Giriş eksenini vaka için kontrol edin; aşağı çevrilmiş taramalarda eksen seçimi önemlidir.

Her ünitenin kolesi, yerleşimi, geometri ve konum ayarları ayrıdır. Ünite değiştirirken tamamladığınız şekillendirme kaybolmaz; seçilen tarama yeniden indirilmez. Form ailesini değiştirmek o ünitenin başlangıç anatomisini yeniden oluşturur. Ünite başına geri alma geçmişi açık oturumda korunur; program yeniden açıldığında geri alma geçmişi yeniden başlar.

## Kaydetme ve çıkış

**Kaydet**, parametrelerle birlikte düzenlenmiş dişin tüm noktalarını ve yüzlerini, başlangıç geometrisini, yerleşimini ve varsa Crown Shell geometrisini kaydeder. Otomatik kayıt, kole veya geometri değişikliklerini de izler. Önceki RC39 ayarları ve form seçimleri okunmaya devam eder.

Başlıktaki **Kaydet ve çık**, Hub geri düğmesi ve son kontrol adımındaki **Kaydet ve çık** aynı kayıt işlemini kullanır. Kayıt tamamlanana kadar pencere değişiklik yapılmasını engeller; sunucu başarıyla cevap verdiğinde laboratuvar ekranına geçer.

Uzak kayıt başarısızsa CAD açık kalır. Yeniden **Kaydet ve çık** ile deneyebilir veya güvenli yerel kopya oluşturulduysa **Yerel kaydet ve çık** seçebilirsiniz. Sonraki açılışta **Kurtarma kaydı bulundu → Geri yükle** ile devam edin ve bağlantı gelince sunucuya kaydedin. Bu açıkça seçilmiş yerel kopya yedi günlük otomatik temizlikte silinmez. Yerel kopya aynı cihazın uygulama depolamasındadır; başka cihazda görünmesi için uzak kayıt gerekir.

Başka bir oturum projeyi değiştirmişse kayıt eski veriyi onun üzerine yazmaz. Çalışmanızı yerel kopyada koruyup güncel proje durumunu yeniden açın. Kliniğe gönderme işlemi önce tam CAD kaydını tamamlar, sonra mevcut STL ve onay akışını çalıştırır.

## CAD içinde AYA

Başlıktaki **AYA** panelini açın. **Marjin** ve **Kaydet** yardım düğmeleri aktif diş, model yükleme durumu, kole nokta sayısı ve kayıt durumuna göre yönlendirme verir. Yerleşim ve çıkış düğmeleri açık kullanıcı işlemleridir; mesaj yazmak kendi başına geometriyi değiştirmez.

Belge rehberi model, API anahtarı veya dış çeviri servisi gerektirmez. Yerel model kuruluysa diğer sorular mevcut Ollama modeliyle cevaplanır. Modelin CAD bağlamı ünite ve iş akışı bilgileriyle sınırlıdır; tarama noktaları veya hasta adı bu bağlama eklenmez. Ana AYA sohbetinde de belge rehberi tarayıcıda kullanılabilir, devam soruları son kullanıcı sorusunu izler.

İmplant marka arayüzü, cerrahi plan veya üretim toleransı bu durum bilgisinden çıkarılmaz. Mevcut iç uyum/Crown Shell çekirdeği yaklaşık yüzey eşlemesi kullanır; hasta özel üretim uygunluğu ayrıca kontrol edilmelidir.
