# DentAYA Production RC20 — Final Pilot Candidate

RC20, Faz 1 feature freeze sonrasındaki final release candidate'tir. Yeni ana ürün özelliği eklemez; temiz Windows setup, environment doğrulaması, runtime doğrulaması, final pilot gate'leri ve release metadata tutarlılığı ekler.

## Değişiklikler
- Sürüm `1.0.0-rc.20` olarak hizalandı.
- Release label, Supabase client-info ve env örnekleri RC20 ile eşitlendi.
- `.nvmrc` ve `.node-version` ile Node 22.16.0 çalışma tabanı sabitlendi.
- `verify:runtime`: Node 22+ ve npm 11+ gate'i.
- `verify:pilot`: final paket yapısı, kritik route/API ve release dosyaları gate'i.
- `verify:env`: Supabase + Maps + release env doğrulaması; public secret sızıntısı kontrolü.
- `verify:final`: env gate + tam mevcut QA/build zinciri.
- `scripts/setup-windows.ps1`: Windows için temiz kurulum akışı.
- `SETUP_WINDOWS_RC20.md`: kullanıcı odaklı tek akış setup rehberi.
- `FINAL_PILOT_CHECKLIST_RC20.md`: staging, gerçek roller, E2E ve release sign-off listesi.
- `/release-check` manuel gate storage anahtarı RC20'ye taşındı ve final doğrulama metni güncellendi.

## Feature freeze
RC18 feature freeze devam eder. Klinik + Lab + CAD + Kurye + AYA + Operasyon Merkezi Faz 1 kapsamıdır. Hasta modülü sonraki fazda kalır.
