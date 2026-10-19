# Step 21 — Crown Shell + Mesh Core QA

## Build
- [ ] `npm.cmd run build` yeşil
- [ ] `/design` açılıyor
- [ ] mevcut vaka / scan seçilebiliyor

## Crown Shell
- [ ] Margin / Internal Fit panelinde `Crown shell oluştur` görünüyor
- [ ] Shell oluşturulduğunda anatomy görünümü yerine shell görünümü geliyor
- [ ] Kesit görünümünde inner ve outer yüzey görülebiliyor
- [ ] `Shell'i temizle` anatomy mesh'e geri dönüyor
- [ ] Wall thickness ayarı shell'i yeniden oluşturduğunda sonucu değiştiriyor
- [ ] Cervical cut ayarı shell sınırını değiştiriyor
- [ ] Preparation fit blend 0 iken kaynak scan'e fit uygulanmıyor
- [ ] Preparation fit blend >0 iken fitted vertex sayısı raporlanıyor

## Mesh Repair
- [ ] `Mesh repair` shell aktifken çalışıyor
- [ ] Shell yokken güvenli uyarı veriyor
- [ ] Degenerate triangle sayısı raporlanıyor
- [ ] QC sonrası boundary / non-manifold değerleri görülebiliyor

## Export
- [ ] Shell aktifken export shell geometrisini alıyor
- [ ] Shell temizlenince export tekrar anatomy mesh'i alıyor
- [ ] Connector export davranışı korunuyor

## Kernel QC
- [ ] `CAD Kernel QC` shell topolojisini raporluyor
- [ ] Watertight durumu görünür
- [ ] Wall tahmini görünür
- [ ] Fitted inner vertex sayısı görünür
- [ ] Cervical stitch edge sayısı görünür

## Truthfulness
- [ ] UI metninde manufacturing validation iddiası yok
- [ ] Gerçek intaglio / boolean parity iddiası yok
- [ ] MVP / Ar-Ge sınırı görünür
