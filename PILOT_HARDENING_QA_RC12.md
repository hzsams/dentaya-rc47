# DentAYA RC12 — Pilot Hardening QA

## Otomatik / statik kontroller

- [x] Değiştirilen TS/TSX dosyaları TypeScript transpile syntax kontrolünden geçti.
- [x] `package.json` ve `package-lock.json` JSON doğrulaması geçti.
- [x] Migration verifier RC12 telemetry tablosu, RLS policy ve RPC'yi kontrol edecek şekilde genişletildi.
- [x] Paket sürümü `1.0.0-rc.12`.
- [ ] Kullanıcı ortamında `npm run verify` tam yeşil olmalı.

## Pilot saha senaryoları

- [ ] Owner/admin `/ops-health` ekranını açabiliyor.
- [ ] Dentist/technician/courier rolü `/ops-health` verisini okuyamıyor.
- [ ] Route render hatası telemetry tablosuna tek kayıt düşüyor.
- [ ] Aynı hata 20 saniye içinde tekrarlandığında istemci dedupe çalışıyor.
- [ ] İnternet 5+ saniye kesilip geri geldiğinde `network_recovered` olayı oluşuyor.
- [ ] İnternet geri gelince lojistik shipment/location/route verisi yenileniyor.
- [ ] Google Routes geçici 5xx/429 hatasında en fazla 3 deneme yapılıyor.
- [ ] Kurye konum gönderimi başarısızsa operasyon olayı oluşuyor.
- [ ] Shipment durum güncellemesi başarısızsa operasyon olayı oluşuyor.
- [ ] Teslimat tamamlanamazsa `critical` olay oluşuyor.
- [ ] Telemetry detaylarında secret/token benzeri anahtarlar kaydedilmiyor.
