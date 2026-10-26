# DentAYA RC58 kullanım

Sürüm `1.0.0-rc.58`, AYA Core `0.14.0`. Tam kaynak güncellemesidir; RC56 veya RC57'nin ayrıca kurulması gerekmez. Verilerinizi, `.env.local` ve kişisel bağlantı ayarlarınızı koruyun. Windows derlemesi [KURULUM.txt](KURULUM.txt) içindedir; bu kaynak ZIP'i hazır EXE içermez.

## Sol üst klasör menüsü

Sol üstteki **Modüller** düğmesi veya **Alt+M** ile açılır. **Klinik**, **Laboratuvar**, **Yönetim** ve **Çalışma alanı** klasörleri alt klasörleriyle açılıp kapanır. Bir modül adıyla arayın; eşleşmenin üst klasörleri otomatik görünür. Aramayı temizleyince klasör düzeni geri gelir. Ok tuşları/Home/End, Enter/Boşluk ve Tab ile gezilebilir; Escape menüyü kapatır. Geçerli sayfanın yolu açılır. Mobilde ve CAD'deki mevcut Modüller komutunda aynı liste kullanılır.

CAD'de açık vaka veya değişmiş çalışma varken mevcut kaydetme/geçiş kapıları devam eder. Ortak uygulama başlığı veya ikinci CAD sahnesi eklenmez. Eski hızlı erişim şeridi, tercihlerden açılıp kapatılabilir. Ctrl+K mevcut hızlı navigasyonu, Ctrl+, görünüm tercihlerini açar.

## Robot yerine İş takibi

**Modüller → Yönetim → İşler ve finans → İş takibi** ekranı kurumun mevcut metriklerini, öncelikli/geciken işleri, vaka aşamalarını ve laboratuvar kapasitesini gösterir. Robot, büyük tanıtım alanı ve AYA puanı kaldırıldı. Bu bilgiler model çıkarımı olarak sunulmaz. Kaynak/sunucu verisi gerektiren alanlar mevcut kurum bağlantısını kullanır.

Kapasiteyi yalnız yetkili kullanıcı kaydeder. Çevrimdışı durumda, eksik/başarısız ayar yenilemesinde veya başka oturumun değişikliğinde taslak korunur; güncel veri olmadan kayıt zorlanmaz. Liste arama/filtreleme ve mevcut vaka/teslimat bağlantıları sürer.

## Arka plan adları

**Ayarlar → Görünüm → Renk paletleri** bölümünde:

- **Neon Midnight:** lacivert zemin, parlak mavi vurgu.
- **Graphite Turquoise:** siyaha yakın zemin, turkuaz vurgu.
- **Deep Turquoise:** koyu turkuaz zemin.
- **Deep Coral:** koyu pembe zemin, okunaklı pembe vurgu.

Studio koleksiyonunda da bulunurlar. Seçim uygulama ve CAD tema arka planına uygulanır; mevcut tercihiniz kendiliğinden değişmez. Bunlar mini oyunlara özel temalar değildir.

## AYA Core

**Yerel yanıtı test et** konuşmadan ayrı bir kontroldür. Yazılmamış mesajınız korunur; test mevcut konuşmayı, kişisel notları veya çalışma belleğini kullanmaz. Test cevabı ayrı görünür ve geçmişe/çalışma belleğine kaydedilmez. Tekrar dene tanı isteğini yineler. Normal sorular ve mevcut geçmiş/bellek tercihleri aynı akışı kullanır.

Pencereye döndüğünüzde motor durumu yenilenir. Bir geçici durum isteği modeli boş gösterse bile seçiminiz unutulmaz; model tekrar bulunduğunda önceki seçim kullanılır. Motor başlangıç hataları bellek, model, kitaplık, izin, port veya genel başlangıç sorunu olarak açıklanır; ham süreç bilgileri ve özel yollar gösterilmez.

CAD önerisinin sonucu yalnız gerçek callback ve işlem sonrası güncel host durumuyla kanıt olur. Ünite/kaynak değiştirip geri dönülmüş olsa bile gecikmiş eski sonuç yeni kanıt sayılamaz. Dolu çalışma belleğine yeni karar eklemek eski anlaşmaları sessizce atmaz; uygun düzenleme gerekir. CAD manuel ve deterministik, 27 tipli öneri kullanıcı **Uygula** kapısındadır.

Yerel model hazırken normal konuşma modele gider. Model yokken Core rehberi çalışabilir; bu gerçek model çıkarımı değildir. Buluta otomatik geçiş yoktur. Hedef, kararlar, kişisel notlar ve kayıtlı konuşma kalıcı model eğitimi değildir.

## Korunan CAD akışları ve sınırlar

Kuron/kapşon seçilen ham modelin kolesine yerleşir. Kole olmadan başlangıç gizlidir. İmplant yerleşimi, şekillendirme/geri al, ünite geçişi, kayıt hatası, yerel kurtarma ve kaydet/çık korunur. Kesit alanı görüntülenen mesh üzerinden gelir; duvar kalınlığı/iç uyum değildir. Açık veya çakışan kesitte güvenilir alan uydurulmaz. Büyük tarama önizlemeleri sadeleştirilmiş olabilir.

120 hacim etkili SVG logo, 5 mini oyun, 500 TR/EN bilgi kartı/60 kaynak, 1008 soru kataloğu ve 72 görünüm seçeneği korunur. SVG'ler gerçek 3B mesh değildir. 30.000 gerçek içerik hedefi tamamlanmadı. Windows EXE, canlı kurum/klinik kabulü ve gerçek yerel model anlamsal kabulü kaynak testlerinden ayrı değerlendirilir. Güncel sonuçlar [RC58_KONTROL_RAPORU.md](RC58_KONTROL_RAPORU.md) içindedir.
