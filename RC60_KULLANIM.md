# DentAYA RC60 kullanım

Sürüm `1.0.0-rc.60`, AYA Core `0.16.0`. Tam kaynak güncellemesidir; önceki RC paketleri ayrıca kurulmaz. Verilerinizi, `.env.local` ve kişisel ayarlarınızı koruyun. Windows derleme adımları [KURULUM.txt](KURULUM.txt) içindedir. Paket hazır Windows EXE veya model ağırlıkları içermez.

## AYA ve uzun notlar

**Sohbet ayarları → Bellek ve notlar → AYA bilgi defteri** içindeki etkin notlardan soruyla ilgili bölüm seçilir. Tek uzun paragrafın sonundaki bilgi de seçilebilir. Alıntı en fazla 2200 karakterdir; notun tamamının her turda modele gireceği garanti edilmez. Asıl not değiştirilmez. Notları kullanmayı kapatınca modele taşınmazlar. Kaynak gösterme gerçek model çıkarımı veya klinik onay anlamına gelmez.

Yerel model hazırken normal sorular ve takipler modele gider. Hedef, kararlar ve açık sorular çalışma belleğinde görüntülenir ve düzenlenir. Bunlar model eğitimi değildir. Yerel sohbet API anahtarı veya DentAYA hesabı istemez; otomatik bulut geçişi yoktur. Model yokken Core rehberi ayrı motor etiketiyle kullanılabilir.

## Sohbet geçmişi

Geçmiş saklamak isteğe bağlıdır. Değişmemiş sohbeti açmak, yeniden yüklemek veya arayüz dilini değiştirmek kaydın tarihini, sırasını ve revizyonunu değiştirmez. Başka pencere gerçek bir değişiklik yapmış veya kaydı silmişse RC59 çakışma koruması devam eder. **Saklanan sohbeti yükle** ve **Bu çalışmayı ayrı sohbete kaydet** seçenekleri korunur. Bu iyimser revizyon denetimidir; atomik pencere kilidi değildir.

Ana sohbetin gönderilmemiş taslağı sayfadan ayrılma veya yeniden yüklemede saklanmaz. CAD panelinin aynı proje/kaynak/ünite içindeki taslak ve bekleyen soru koruması süreç ömründe devam eder. CAD'de kullanıcı **Uygula** tıklamadan öneri geometri işlemi başlatmaz; manuel CAD deterministik çalışır.

## Yerel motor kurulumu

**Sohbet ayarları → Genel → Model ve çalışma ayarları** bölümünden motor kurulabilir, mevcut yerel model seçilebilir veya GGUF eklenebilir. **İndirmeyi durdur** sonucunu bekler ve durumu yeniler; aynı anda yinelenen tıklama tek istek gönderir. Başka pencerede başlatılan indirme bu pencereden iptal edilmez; meşgul bilgisi gösterilir. İndirmeyi başlattığınız pencereden durdurun.

Aktarım 45 saniye boyunca ilerlemezse kurulum ağ hatasıyla yeniden denemeye açılır. İlerleyen büyük bir indirmeye 45 saniyelik toplam süre sınırı konmaz. Yarım dosya yeniden denemede devam edebilir; tam boyut ve SHA-256 doğrulanmadan model kullanılmaz. İptal veya bağlantı hatası sonrası yenileme/durdurma kontrolleri kullanılabilir kalır. **Yerel yanıtı test et** normal sohbet ve kişisel bağlamdan ayrı kontroldür.

Sol üst klasör menüsü, robotsuz İş takibi ve **Neon Midnight**, **Graphite Turquoise**, **Deep Turquoise**, **Deep Coral** arka planları korunur. Zorunlu beş saniyelik yükleme yoktur. Güncel testler ve açık kalanlar [RC60_KONTROL_RAPORU.md](RC60_KONTROL_RAPORU.md) içindedir. Gerçek model anlamsal kabulü, Windows EXE ve canlı kurum/klinik kabulü kaynak testlerinden ayrı değerlendirilir.
