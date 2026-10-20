# DentAYA RC51 / masaüstü çalışma düzeni

Kurulum: [KURULUM.txt](KURULUM.txt). Bu teslim tam kaynak güncellemesidir; hazır Windows EXE içermez. AYA Core `0.8.0` ve RC50 sohbet özellikleri korunur.

## İş yöneticisi

Üstteki **İş yöneticisi**, **Design** ve **AYA** sekmeleri ana çalışma alanları arasında geçiş yapar. Sol modül listesi hasta, vaka, randevu, finans ve mesajlaşma ekranlarına erişim sağlar. Modül adını arayarak listeyi daraltabilirsiniz. Sistem araçları kendi açılır grubunda kalır.

İş yöneticisinde vaka kuyruğu ve teslimat listeleri mevcut kurum kayıtlarını kullanır. Listeyi arama ve ilgili filtrelerle daraltın; vaka satırı gerçek vaka kaydına gider. Günlük işler ve bildirimler sağ paneldedir. Hesap veya kurum bağlantısı yokken bu alan boş durum ve oturum/kurum seçeneklerini gösterir; örnek iş veya sahte sayı üretmez.

Alt durum çubuğu mevcut modülü, tarayıcının ağ durumunu ve kaynak sürümünü gösterir. Ağ açık göstergesi sunucudaki işlemin başarılı olduğunu ifade etmez. Dil seçimi aynı çubuktadır. CAD kendi çalışma alanı durumunu kullanır.

## Klavye ve görünüm

- **Alt+M:** Modül menüsünü açar ve aramaya odaklanır.
- **Ctrl+K:** Mevcut hızlı navigasyonu açar; hesap/kurum erişiminin desteklediği ekranlarda çalışır.
- **Ctrl+,**: Görünüm ve çalışma tercihlerini açar.
- **Esc:** Açık menü veya iletişim kutusunu kapatır.

Sol üst menü düğmesi geniş ekranda modül panelini açıp kapatır; dar ekranda ve CAD'de modül menüsüne erişir. Önceki renk, marka, dil ve hareket tercihleri korunur. Yeni masaüstü metinleri Türkçe/İngilizcedir; diğer dillerde İngilizce fallback kullanılır. Mevcut 46 dil paketi kaldırılmaz.

## DentAYA Design

Nesne ve görünürlük araçları solda, 3B çalışma alanı ortada, seçili görevin özellikleri sağdadır. Üst görev çubuğu kılavuzlu aşamaları görünür tutar; mevcut aşama kapıları ve uzman modu korunur. Kılavuzlu görevler dosyalar → kole → yerleşim → anatomi → serbest şekillendirme → temaslar → inceleme → kayıt sırasındadır.

Özellik paneli varsayılan olarak kenara bağlıdır. Başlığından taşıma veya mevcut klavye taşıma işlemi paneli serbest konuma geçirir. Başlıktaki kenara bağlama kontrolü ve konum sıfırlama işlemi bağlı düzene döndürür. Önceki kayıtlı serbest panel konumları korunur.

İmplant koleye yerleştirme, ünite geçişi, şekillendirme, geri alma, kaydetme, kayıt hatasında ekranda kalma ve yerel kurtarma mevcut CAD akışını kullanır. CAD’den üst sekmelerle başka bir modüle geçiş de kayıt sonucunu bekler; hata varsa tasarım ekranı açık kalır. Bu sürüm geometri algoritmalarını değiştirmez. AYA üst araç çubuğundan açılır; uygulanabilir öneri mevcut **Uygula** işlemiyle başlatılır.

AYA hedef/karar/açık soru komutları, model seçimi ve çalışma belleğinin sınırları [RC50 kullanımında](RC50_KULLANIM.md) açıklanır. Model hazırken normal konuşmada önceliğini korur; model kapalıyken manuel CAD çalışır.

Güncel test sonuçları ve tamamlanmayan kabul işleri: [RC51_KONTROL_RAPORU.md](RC51_KONTROL_RAPORU.md).
