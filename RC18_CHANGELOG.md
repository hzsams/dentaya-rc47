# DentAYA RC18 — Feature Freeze + CAD Rectangular Tool Panel

## CAD sol panel
- Sol CAD kontrol alanı masaüstünde 286 px'e büyütüldü.
- Panel dış boşlukları kaldırıldı; kontrol yüzeyi sol kenardan viewport sınırına kadar tek dikdörtgen panel olarak çalışıyor.
- 1280 px altında 258 px, 1080 px altında 236 px adaptif genişlik; mobil kırılımda panel gizlenir.
- Yuvarlatılmış kart görünümü yerine üretim/CAD istasyonu hissi veren düz kenarlı satırlar kullanıldı.
- Aktif satır sol tarafta DentAYA vurgu çizgisiyle işaretlenir.

## Semboller ve hız
- Workflow: Scan, Margin, Anatomy, Contacts, Thickness, Review için özgün inline SVG semboller eklendi.
- Araçlar: Orbit, Measure, Add, Remove, Smooth, Flatten, Connector için özgün SVG semboller eklendi.
- Undo, Redo, Fit ve Tool Library için ayrı semboller eklendi.
- Her model aracının sağında mevcut kullanıcı kısayolu gösterilir.
- Panel altına sticky **Aktif Araç** alanı eklendi.

## Feature freeze
- RC18 Faz 1 feature-freeze noktasıdır.
- RC19: full QA / security / performance.
- RC20: final pilot candidate + setup/deploy.
- Hasta modülü sonraki fazda kalır.

## Doğrulama
- `npm run verify:cad-interaction` → 36/36 PASS
- `npm run verify:cad-workflow` → 18/18 PASS
- `npm run verify:cad-panel` → 12/12 PASS
- `DesignStudioClient.tsx` TypeScript transpile/syntax kontrolü → PASS
