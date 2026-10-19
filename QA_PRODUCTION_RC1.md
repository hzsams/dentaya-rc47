# DentAYA Production RC1 — QA Kaydı

Tarih: 20 Eylül 2026

## Otomatik sonuçlar

| Kontrol | Sonuç |
|---|---|
| ESLint (`--max-warnings=0`) | PASS — 0 hata, 0 uyarı |
| TypeScript strict | PASS |
| CAD kernel | PASS — mesh record, half-edge, BVH, nearest surface, repair, crown shell, registration |
| Supabase migrasyonları | PASS — 15 dosya, temiz PGlite PostgreSQL motorunda |
| RLS | PASS — 30/30 public tablo |
| SECURITY DEFINER | PASS — eksik sabit search_path yok |
| Storage | PASS — `dentaya-files` private, 100 MiB sınırı |
| Next production build | PASS — 27 route |

## HTTP smoke

Supabase ortam değişkenleri olmadan güvenli kurulum uyarısı görüldü. Dev sunucuda aşağıdaki rotalar içerik üreten `200` yanıt verdi:

`/`, `/start`, `/release-check`, `/settings`, `/design`, `/cases`, `/patients`, `/scan-studio`, `/api/ai-assistant`

## Tarayıcı notu

Çalışma ortamındaki Chrome/Unix-socket kısıtı nedeniyle `agent-browser` daemon başlatılamadı. Bu nedenle görsel screenshot yerine aynı sunucuda HTTP route smoke ve Next üretim build doğrulaması kullanıldı. Gerçek staging alanında ilk manuel kabul adımı; Chromium/Chrome ile mobil-geniş ekran kontrolü, Auth, Storage upload, rol negatif testleri ve WebGL CAD etkileşimidir.

## Açık canlı kapıları

Kod release candidate seviyesinde. Gerçek hasta verisi öncesi production Supabase projesi, SMTP, alan adı/TLS, yedekleme-geri yükleme, bağımsız güvenlik testi, KVKK/GDPR metinleri ve klinik/CAD kullanıcı kabulü tamamlanmalıdır.
