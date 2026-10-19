# DentAYA MVP v6 — Step 4B QA

## Bağlantı / Retry
- [ ] İnterneti kapat → alt bağlantı uyarısı görünür.
- [ ] İnterneti aç → “Bağlantı geri geldi” görünür.
- [ ] Mesajlar yeniden yüklenir.
- [ ] Vakalar yeniden yüklenir.
- [ ] Vaka Komuta Merkezi yeniden veri çeker.
- [ ] Kurye canlı kayıtları yeniden yüklenir.
- [ ] Bildirimler yeniden yüklenir.
- [ ] Hasta / randevu listeleri bağlantı sonrası güncellenir.

## Hasta
- [ ] Ad/soyad boş → kayıt olmaz.
- [ ] Hatalı e-posta → anlaşılır Türkçe uyarı.
- [ ] Çok kısa/uzun telefon → uyarı.
- [ ] Gelecek doğum tarihi → uyarı.
- [ ] Çift tık → tek hasta.

## Vaka
- [ ] Hasta/lab seçilmeden oluşturulamaz.
- [ ] Hatalı FDI (örn. 99) reddedilir.
- [ ] Geçmiş termin reddedilir.
- [ ] Klinik not >4000 karakter reddedilir.
- [ ] Çift tık → tek vaka.

## Mesaj
- [ ] Boş mesaj gönderilmez.
- [ ] >4000 karakter gönderilmez.
- [ ] Offline iken gönderilmez.
- [ ] Bağlantı geri gelince konuşma yeniden yüklenir.
- [ ] Hızlı Enter/tık → tek mesaj.

## Tarama
- [ ] Yalnız STL/PLY.
- [ ] Boş dosya reddedilir.
- [ ] >50 MB reddedilir.
- [ ] Bütünlük 0–100.
- [ ] Teknik not >4000 reddedilir.
- [ ] Offline upload reddedilir.
- [ ] Retry aynı request-id üzerinden çalışır.

## Fiyat
- [ ] Sent lab fiyatı 0 TL olamaz.
- [ ] İndirim hasta fiyatını aşamaz.
- [ ] Tahsilat net fiyatı aşamaz.
- [ ] Genel gider 0–500.
- [ ] Hedef marj 0–100 aralığında.
- [ ] DB de aynı kuralları CHECK constraint ile korur.

## Kurye
- [ ] Offline iken durum değişmez.
- [ ] Hatalı status transition Türkçe açıklanır.
- [ ] Bağlantı geri gelince gönderi/konum yenilenir.

## CAD
- [ ] Offline iken kliniğe gönderim başlamaz.
- [ ] Upload / version / review hataları teknik İngilizce yerine anlaşılır mesaj verir.
- [ ] Submit çift tık kilidi çalışır.

## Build
- [ ] `npm.cmd run build`
- [ ] `/design`
- [ ] `/scan-studio`
- [ ] `/cases/<id>`
- [ ] `/messages`
- [ ] `/finance`
- [ ] `/logistics`
