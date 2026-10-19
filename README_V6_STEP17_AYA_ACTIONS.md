# DentAYA MVP v6 — Step 17: AYA Real Actions

Bu sürümde AYA'nın platform komutları yalnızca açıklama üretmekten çıkarıldı. AYA artık desteklenen komutlarda **gerçek uygulama aksiyonu** çalıştırır.

## AYA'nın artık gerçekten yapabildiği işlemler

### Navigasyon
- Lobiye git
- Klinik merkezini aç
- Lab merkezini aç
- Hastaları aç
- Vakaları aç
- DentAYA Design'ı aç
- Tarama Stüdyosunu aç
- Taramaları aç
- Mesajları aç
- Finansı aç
- Lojistiği aç
- Bildirimleri aç
- Ekibi aç
- Öğrenim Rehberini aç
- Release Check ekranını aç

### Görünüm / kişiselleştirme
- Açık veya koyu tema uygula
- 24 DentAYA tema adını anlayıp uygula
- Yazı boyutunu küçük / normal / büyük yap
- Animasyonları tam / azaltılmış / kapalı yap
- Kompakt modu aç / kapat
- Cam / solid / soft panel görünümünü değiştir

### Bildirimler
- Tüm bildirimleri aç / kapat
- Vaka bildirimleri
- Tasarım / CAD bildirimleri
- Finans bildirimleri
- Teslimat bildirimleri
- Mesaj bildirimleri
- Sistem bildirimleri

### Ayarlar bölümleri
AYA artık doğru Settings bölümüne doğrudan yönlendirir:
- Hesap
- Görünüm
- Çalışma Alanı
- Bildirimler
- Kurum
- Sistem

`/settings?section=...` deep-link desteği eklendi.

## AYA ismi
Ürün içi tam ad:

**AYA — Akıllı Yardım Asistanı**

AYA, DentAYA'nın platform içi yardım, yönlendirme ve desteklenen kullanıcı ayarlarını uygulama katmanıdır.

## Robot görseli
Dört state görseli yeniden kesildi:
- `aya-idle.png`
- `aya-thinking.png`
- `aya-ready.png`
- `aya-alert.png`

Arka plan / HUD adaları temizlenip gerçek şeffaf PNG olarak kullanılıyor. Robot artık sahnenin kendi koyu dental-tech fonuna oturuyor; önceki green-screen / kart üstüne yapıştırılmış görsel hissi azaltıldı.

## Örnek komutlar
- `Açık temayı aç`
- `Midnight temasına geç`
- `Yazıları büyüt`
- `Animasyonları azalt`
- `Kompakt modu aç`
- `Mesaj bildirimlerini kapat`
- `Görünüm ayarlarını aç`
- `DentAYA Design ekranını aç`
- `Öğrenim rehberini aç`
- `Bu vakada şu an ne eksik?`

## Not
AYA'nın ayar aksiyonları yalnızca desteklenen uygulama tercihlerini değiştirir. Klinik kararları veya üretim doğrulaması otomatikleştirilmez.
