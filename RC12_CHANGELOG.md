# DentAYA Production RC12 — Pilot Hardening

## Eklenenler

- `operational_events` append-only pilot gözlem tablosu ve kurum bazlı RLS.
- `dentaya_log_operational_event(...)` güvenli RPC; kullanıcı ve aktif kurum sunucu tarafında damgalanır.
- `/ops-health` owner/admin ekranı: son 24 saat toplam, kritik, hata ve ağ geri dönüşü sayaçları + olay akışı.
- Global browser error / unhandled rejection / route render hata kaydı.
- Kurye tarafında rota yenileme, konum gönderme, shipment update ve teslimat tamamlama hatalarının operasyon kaydı.
- Ağ yeniden geldiğinde `dentaya-network-restored` olayı yayınlanır; lojistik ekranı mevcut otomatik refresh akışını gerçekten tetikler.
- Google Routes isteğinde transient 408/429/5xx ve network hataları için sınırlı exponential retry.
- Telemetry detaylarında token/secret/password/authorization/cookie/key isimli alanlar istemci tarafında filtrelenir.

## Güvenlik

- `operational_events` için authenticated doğrudan INSERT/UPDATE/DELETE yoktur.
- Kayıt yalnız güvenli RPC üzerinden eklenir.
- Okuma yalnız aynı kurumun aktif `owner` / `admin` üyelerine açıktır.
- `SECURITY DEFINER` fonksiyonu boş `search_path` ile çalışır.
- Mesaj, rota, hata kodu ve JSON detay boyutları sınırlandırılmıştır.

## Sürüm

- Uygulama: `1.0.0-rc.12`
- Supabase migration: 22
- Yeni migration: `20260920000700_pilot_hardening_observability.sql`
