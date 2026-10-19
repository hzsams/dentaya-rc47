# DentAYA RC20 — Windows Setup

Bu paket final pilot candidate'tir. Yeni Faz 1 özelliği eklenmez; amaç temiz kurulum, tam doğrulama ve gerçek staging/pilot ortamına çıkıştır.

## 1. ZIP'i temiz klasöre çıkar

Önerilen yol:

```powershell
C:\Users\ahmet\dentaya-rc20
```

Eski `dentaya` klasörünün üzerine kopyalama yapma. RC20 temiz klasörde kurulmalıdır.

## 2. Tek komutluk temel setup

PowerShell'i RC20 klasöründe aç:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

Script şunları yapar:
- Node.js 22+ kontrolü
- npm 11+ kontrolü; gerekirse npm 11 kurmayı dener
- `npm ci` ile lockfile tabanlı temiz dependency kurulumu
- `.env.local` yoksa `.env.release.example` üzerinden oluşturma
- RC20 release/security/performance/pilot statik gate'lerini çalıştırma

## 3. `.env.local` değerlerini doldur

Zorunlu pilot değerleri:

```env
NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL=staging
NEXT_PUBLIC_DENTAYA_BUILD_LABEL=DentAYA Production RC20
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=
GOOGLE_MAPS_GEOCODING_KEY=
GOOGLE_MAPS_ROUTES_KEY=
```

AYA cloud açılacaksa ayrıca:

```env
DENTAYA_AI_CLOUD_ENABLED=true
OPENAI_API_KEY=
```

`OPENAI_API_KEY`, Supabase service-role veya Maps server key'lerine asla `NEXT_PUBLIC_` öneki verme.

## 4. Environment gate

```powershell
npm.cmd run verify:env
```

Bu adım PASS olmadan staging/pilot release'e geçme.

## 5. Tam final doğrulama

```powershell
npm.cmd run verify:final
```

Bu zincir runtime, release consistency, security, performance, pilot candidate, ESLint, TypeScript, CAD kernel/interaction/workflow/panel, migrations, E2E, Operations Center ve Next.js production build'i çalıştırır.

## 6. Supabase

Yerel test gerekiyorsa Docker açıkken:

```powershell
npm.cmd run db:start
npm.cmd run db:reset
```

Gerçek Supabase projesi bağlandıktan sonra production/staging migration push işlemini yalnız doğru project ref'i doğruladıktan sonra yap.

## 7. Uygulamayı aç

```powershell
npm.cmd run dev
```

Önce `/pilot-check`, sonra `/release-check`, sonra `/pilot-flow` kullan.

## 8. npm install-scripts uyarısı

`unrs-resolver` veya başka bir paket için install script uyarısı görürsen otomatik onay verme. Önce:

```powershell
npm install-scripts ls
```

çıktısını incele. Paket lockfile'da beklenen dependency ise ve script gerekiyorsa ayrıca onaylanabilir.
