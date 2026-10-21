# DentAYA RC53 / AYA, uzman inceleme ve marka seçenekleri

Sürüm `1.0.0-rc.53`, AYA Core `0.9.0`. Kurulum adımları [KURULUM.txt](KURULUM.txt) içindedir. Bu çalışma kaynak güncellemesidir; hazır Windows Setup EXE içermez. **RC53 kaynak ve tarayıcı kontrolleri tamamlandı.** Güncel durum ve sınırlar [kontrol raporunda](RC53_KONTROL_RAPORU.md) ayrı gösterilir.

## AYA ile bağlamlı çalışma

Yerel model kurulu ve hazırken Otomatik mod normal konuşmayı modele yönlendirir. Yeni bir ifadeyle sorunuzu yazabilir, ardından “Bunun yapısını biraz açar mısın?” gibi bir takip sorusu sorabilirsiniz. AYA, iletilen konuşmayı ve çalışma belleğindeki hedefi kullanır; önceki konunun kaynaklarını kısa takipler için yeniden seçebilir. Yeni bir konuya geçtiğinizde güncel istek önceliklidir.

Örneğin önce “46 numaralı kronu kontrol ediyoruz; dış konturu koruyacağız” deyin, sonra “Aynı kararla sıradaki adım ne?” diye devam edin. Hedef, kararlar ve açık sorular **Sohbet ayarları → Bellek ve notlar** bölümünden görülebilir ve düzenlenebilir. Modelin boş bıraktığı bellek alanları önceki notları kendiliğinden silmez. Doğrudan bellek komutları, yeni sohbet ve geçmiş saklama tercihi korunur; örnekler [RC50 kullanımında](RC50_KULLANIM.md) bulunur. CAD sohbeti kendi proje/kaynak/ünite kapsamını kullanır. Bunlar oturum notlarıdır; kalıcı model eğitimi değildir.

Yanıttaki **Seçilen kaynaklar** alanını açarak ilgili uygulama belgesi, bilgi notu veya kaynak bağlantısını görebilirsiniz. Bu alan yanıtın her cümlesinin bağımsız doğrulandığı anlamına gelmez. HTTPS kaynak bağlantıları ayrı sekmede açılır. Kişisel notlar ve belgeler doğrulanmış talimat kabul edilmez; not eklemek uygulama kurallarını değiştirmez. Bilgi kullanımını ve çalışma notunu dahil etme tercihini mevcut sohbet ayarlarından yönetebilirsiniz.

Yerel sohbet API anahtarı veya DentAYA hesabı gerektirmez. İlk motor/model kurulumu internet ve disk alanı ister; uygun model kurulduktan sonra çıkarım cihazda çalışır. Buluta otomatik geçiş yoktur. Model yokken çevrimdışı Core rehberi kullanılabilir; bu yanıtlar gerçek model çıkarımı olarak sunulmaz. RC53 geliştirme ortamında model ağırlığı indirmeleri ağ tarafından engellendiği için gerçek GGUF çıkarımı ve Türkçe yanıt kalitesi bu teslimde doğrulanmış değildir.

## CAD içinde öneriler

Mevcut sağ komut şeridinden **AYA** panelini açın. Asistan güncel üniteyi, kullanılabilir araçları ve gerçekten hesaplanmış rapor özetini kullanarak öneri sunabilir. İzin listesinde toplam **27 tipli araç** vardır; çalışma aşaması ve uzman modu bunların hangilerinin kullanılabileceğini belirler. Hepsi her anda açık değildir.

Öneriyi **Uygula** düğmesiyle siz başlatırsınız. Proje, kaynak, ünite veya çalışma durumu değiştiğinde eski öneri geçersiz olur. Kaydetme başarısızsa kaydedildi/çıkıldı sayılmaz. Model kapalıyken manuel CAD kullanılmaya devam eder.

Yeni görsel öneriler uzman inceleme panelini açma, el fenerini açma ve kapatmadır. Model ışık gücü, kesit mesafesi veya rastgele geometri parametresi çalıştıramaz. Mevcut inceleme sonuçlarının yeniden yorumlanması gerçek callback sonucunu kullanır; öneri kendi başına tamamlanmış işlem değildir.

## Uzman inceleme

CAD'de **Uzman** moduna geçin ve sağ komut şeridindeki **İnceleme** düğmesini açın. Tek mevcut 3B sahne üzerinde dört sekme bulunur:

- **Işık:** El fenerini açın; ışığı görünüm merkezine veya işaretçinin altındaki görünür yüzeye yöneltin. Işık gücü, ışın yarı açısı ve pozlamayı ayarlayın.
- **Yüzey:** Aktif restorasyonun kenarlarını, en fazla 240 örnek vertex normalini, düz yüzey gölgelemesini veya iç yüzey görünümünü açın.
- **Kesit:** X/Y/Z veya giriş yönünü seçin; kesit tarafını ters çevirin ve düzlemi kaydırın. Referansı restorasyon merkezi veya sahne başlangıcı olarak seçebilirsiniz.
- **Kamera:** Aktif restorasyona odaklanın, görünümü 90° sola/sağa çevirin veya tüm nesneleri ekrana sığdırın.

**İnceleme görünümünü sıfırla** mevcut inceleme kontrollerini başlangıç değerlerine getirir. Bu araçlar ışık, kamera ve görünümü değiştirir. Kesit, geometriyi kesip yeni bir kapalı gövde oluşturmaz; el feneri, kenar ve normal çizgileri ölçüm veya üretim uygunluğu onayı vermez. Kaynak mesafesi gerçek duvar kalınlığı değildir; kabuk offset değeri tahmindir. Antagonist ve güncel analiz yoksa kapanış güvenliği çıkarılamaz.

## 500 bilgi kartı ve 100 logo

İsteğe bağlı bilgi kartlarında **500 ayrı TR/EN kayıt ve 60 kaynak** vardır. Önceki 220 karta 280 mesh, koordinat, aktarım ve görüntüleme bilgisi eklendi. Kaynak ve lisans kaydı [bilgi kartları belgesinde](BILGI_KARTLARI_RC53_KAYNAKLAR.md) bulunur. Aynı kart kaynağı AYA'ya ilgili eğitim kanıtı da sağlayabilir. Ayrı **1008 soru-cevap** kataloğu korunur; bu iki sayı toplanarak model zekâsı veya eğitim büyüklüğü diye sunulmaz. 30.000 sayısı gerçek içerik sayısı değildir.

Görünüm ayarlarının logo alanında **100 özgün seçenek** bulunur. Aramayla adı veya malzemeyi daraltın, bir seçeneği tıklayıp önizlemeyi kontrol edin. Zümrüt, yeşim, titanyum ve şampanya görünümleri vektör ışık/gölge katmanlarıyla derinlik hissi verir; bunlar döndürülebilir 3B modeller değildir. Önceki 01–18 seçim kimlikleri korunur. **Masaüstü simgesine uygula** yalnız kurulu Windows uygulamasında mevcut kısayolu günceller; gerçek Windows kabulü ayrıca yapılmalıdır.

Studio yerleşimi, kılavuzlu CAD aşamaları, implant koleye yerleştirme, geri alma, kayıt/kurtarma ve gerçek işlem süresini izleyen yükleme davranışı korunur. Yeni inceleme, marka ve AYA metinleri TR/EN sunulur; diğer dillerde İngilizce fallback kullanılır. Mevcut 46 dil seçeneği korunur; yeni alanların tamamının 46 dilde editör onayı aldığı iddia edilmez.
