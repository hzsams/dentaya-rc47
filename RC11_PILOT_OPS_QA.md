# DentAYA RC11 — Pilot Operations QA

## 1. Klinik ve Lab adresi

- [ ] Klinik Ayarlar → Kurum ekranından açık adres girer ve Google Maps ile doğrular.
- [ ] Laboratuvar kendi adresini aynı şekilde doğrular.
- [ ] Formatted address, latitude/longitude ve Place ID kaydedilir.
- [ ] Açık kurye işinde pickup başlamadan adres değişirse snapshot güncellenir.
- [ ] Pickup sonrası route snapshot değişmez.

## 2. Shipment oluşturma

- [ ] Hazır vaka için tek aktif shipment oluşur.
- [ ] Pickup = laboratuvar, dropoff = klinik.
- [ ] İkinci aktif shipment DB tarafından reddedilir.
- [ ] Sürücü atanmadan pickup yapılamaz.

## 3. Maps ve rota

- [ ] Planned route mesafe/süre yüklenir.
- [ ] Pickup öncesi aktif hedef laboratuvardır.
- [ ] Pickup sonrası aktif hedef kliniktir.
- [ ] Canlı kurye konumu haritada görünür.
- [ ] Son görülme zamanı güncellenir.
- [ ] Google Maps navigasyon bağlantısı bir sonraki durağı açar.
- [ ] Rota hesapları shipment üzerinde snapshot olarak saklanır.

## 4. ETA bildirimi

- [ ] Kalan süre >15 dk iken yaklaşma bildirimi yoktur.
- [ ] İlk kez <=15 dk olduğunda hedef kuruma `Kurye yaklaşıyor` bildirimi gelir.
- [ ] Aynı eşikte sonraki ETA refresh duplicate bildirim oluşturmaz.
- [ ] Pickup öncesi alım kurumu; in-transit aşamasında teslim kurumu hedeflenir.

## 5. Teslimat kanıtı

- [ ] Doğrudan `delivered` geçişi kanıt yoksa reddedilir.
- [ ] Teslim alan kişi zorunludur.
- [ ] PIN/not/fotoğraf opsiyoneldir.
- [ ] Fotoğraf private storage altında `shipments/<id>/proof/...` yoluna gider.
- [ ] Başarılı teslimde delivered_at ve actual metrics oluşur.
- [ ] Teslim edilmiş shipment geriye alınamaz.

## 6. Pilot readiness

- [ ] `/api/health` production ortamında `ready` döner.
- [ ] `/pilot-check` zorunlu servisleri yeşil gösterir.
- [ ] Maps Embed key domain restricted.
- [ ] Geocoding ve Routes key server-only ve API-restricted.
- [ ] Klinik, lab ve kurye üç ayrı gerçek test hesabıyla E2E geçer.

## 7. AYA operasyon özeti

- [ ] Aktif teslimat sayısı doğru.
- [ ] Geçmiş ETA'lı aktif teslimat `Geciken teslimat` olarak sayılır.
- [ ] Geçmiş due_date'li aktif vaka `Termini geçmiş vaka` olarak sayılır.
- [ ] Kurye için geciken teslimat varsa `/logistics` ilk aksiyon olur.
- [ ] Klinik/lab için termini geçmiş vaka varsa `/cases` ilk aksiyon olur.

## 8. Release gate

```powershell
npm.cmd install
npm.cmd run verify
```

Beklenen: lint + strict TypeScript + CAD + migrations + E2E + Next.js build tamamı yeşil.
