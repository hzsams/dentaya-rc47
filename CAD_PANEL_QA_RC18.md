# RC18 CAD Panel QA

## Görsel/yerleşim
- [x] Sol CAD paneli 286 px masaüstü genişliğinde.
- [x] Panel dış padding kullanmıyor; kenardan kenara dikdörtgen yüzey.
- [x] Tool satırları tam genişlik ve düz köşeli.
- [x] Aktif satır sol vurgu çizgisi + accent yüzey ile ayrışıyor.
- [x] 1280/1080 kırılımlarında 258/236 px adaptif panel.
- [x] 920 px altında viewport lehine panel gizleniyor.

## Semboller
- [x] Workflow adımlarında SVG semboller.
- [x] Sculpt/model araçlarında SVG semboller.
- [x] Undo/Redo/Fit/Library sembolleri.
- [x] Tamamlanan workflow adımında check rozeti.

## Kullanım
- [x] Her araçta kısayol rozeti.
- [x] Alt bölümde sticky aktif-araç özeti.
- [x] RC14-RC17 sculpt, kısayol, symmetry, recovery ve marjin davranışları korunuyor.

## Otomatik doğrulama
```powershell
npm.cmd run verify:cad-panel
```
Beklenen: `CAD panel verify PASS (12/12)`
