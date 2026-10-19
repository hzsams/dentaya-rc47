# DentAYA 1.0.0-rc.11 — Phase 1 Pilot Operations

Bu paket hasta modülünü yeni faza açmadan mevcut Faz 1 çekirdeğini sıkılaştırır: **klinik + laboratuvar + CAD + kurye + AYA**.

## RC8 — Production courier

- Google Routes üzerinden sunucu tarafı rota, mesafe ve trafik duyarlı ETA hesabı.
- Kurye canlı konumu ve son görülme durumu.
- Alım öncesi kurye → laboratuvar, alım sonrası kurye → klinik aktif rota mantığı.
- Google Maps navigasyon devri.
- Teslim alan kişi, opsiyonel PIN/not/fotoğraf ile teslimat kanıtı.
- Kanıt yoksa `delivered` geçişi veritabanı tarafından reddedilir.
- Planlanan ve gerçekleşen teslimat metrikleri shipment üzerinde saklanır.

## RC9 — Operasyonel bildirim

- Kalan süre ilk kez 15 dakikanın altına indiğinde hedef kuruma **Kurye yaklaşıyor** bildirimi üretilir.
- Alım öncesinde laboratuvar, teslim yolunda klinik bildirilir.
- Aynı eşik içinde tekrar rota hesaplanması duplicate bildirim üretmez.

## RC10 — Pilot/deploy readiness

- `/api/health` zorunlu production servislerinin yapılandırma durumunu secretsız raporlar.
- `/pilot-check` Supabase oturumu, kurum üyeliği, WebGL ve Maps servislerini görünür kontrol eder.
- Server-only Maps anahtarları browser'a gönderilmez.

## RC11 — AYA operasyon zekâsı

AYA platform özeti artık kurum bağlamında:

- aktif teslimat sayısını,
- ETA zamanı geçmiş aktif teslimatları,
- aktif vaka sayısını,
- termini geçmiş vakaları,
- onay bekleyen ve öncelikli işleri

görür ve ilk aksiyonu bunlara göre önerir. Kurye kurumunda geciken teslimat varsa AYA doğrudan Lojistik ekranını öne çıkarır; klinik/lab tarafında termini geçmiş vaka ve geciken teslimat önceliği uygulanır.

## Database

Toplam migration: **21**.

Yeni son iki migration:

- `20260920000500_production_courier_ops.sql`
- `20260920000600_operational_notifications.sql`

## Production env

```env
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=
GOOGLE_MAPS_GEOCODING_KEY=
GOOGLE_MAPS_ROUTES_KEY=
```

`GOOGLE_MAPS_GEOCODING_KEY` ve `GOOGLE_MAPS_ROUTES_KEY` server-only tutulmalıdır.

## Verification

Tam release gate:

```powershell
npm.cmd install
npm.cmd run verify
```

Bu komut lint, strict typecheck, CAD doğrulaması, migration doğrulaması, otomatik uçtan uca iş akışı ve production build'i kapsar.
