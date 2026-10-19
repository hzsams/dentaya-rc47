# RC47 — AYA ile çalışma

Yerel model hazırken doğrudan yazın. Tanım soruları, yeni ifadeler ve bağlamlı takipler modele gider. Bilgi rehberini özellikle seçtiğinizde çevrimdışı kaynaklar kullanılır. Motor etiketi gerçek yanıt yolunu gösterir.

Çalışma belleğinde hedef, kararlar ve açık sorular görünür. Belleği temizleme ve yeni sohbet kontrolleri vardır. Kalıcı geçmiş kapalıysa ana sohbet/bellek kalıcı depoya yazılmaz. CAD panelinin geçici oturumu proje/kaynak/üniteye göre ayrılır; bu model eğitimi değildir.

CAD'de üstteki mevcut AYA panelini açın. Durumu değerlendirmesini isteyin, önerinin gerekçesini okuyun ve **Uygula** düğmesine basın. Model kendiliğinden geometri değiştirmez. Kaynak, ünite, geometri veya ayarlar değişirse eski öneri reddedilir. İşlem sonucu gerçek callback'ten gelir; AYA güncel kontrol raporunu bir kez yorumlayabilir.

Örnek: “İmplant kolemi çizdim ama üstünde diş yok; mevcut durumda ne yapabilirim?”, “Antagonist olmadan neyi kontrol edebiliriz?”, “Önce görünürlüğü düzeltelim, sonra mesh kontrolüne bakalım.” Araçlar mevcut deterministik işlemleri çağırır.

Antagonist yoksa kapanış analizi yapılmış sayılmaz. Kaynak mesafesi duvar kalınlığı değildir; kabuk offset değeri tahmindir. Kayıtlı kapanış görünümü yeni çene hizalaması değildir. Klinik/üretim onayı verilmez.

Hata veya iptalde soru taslakta kalır. Geçersiz JSON planı uygulanmaz. Kayıt başarısızsa mevcut yerel kurtarma/tekrar kaydetme akışını kullanın. Test kapsamı ve eksikler: [RC47_KONTROL_RAPORU.md](RC47_KONTROL_RAPORU.md).
