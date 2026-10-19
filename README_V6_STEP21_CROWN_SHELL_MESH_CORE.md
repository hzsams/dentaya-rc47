# DentAYA MVP v6 — Step 21 Crown Shell + Mesh Core

Bu paket Step 20 CAD Kernel MVP'nin kümülatif devamıdır. Hedef, DentAYA Design içinde yalnızca clearance relief değil, gerçek kapalı shell topolojisine yaklaşan bir MVP geometri çekirdeği oluşturmaktır.

## 1. Crown Shell MVP

Yeni `cad-crown-shell-engine.ts` motoru:

- mevcut restorasyon dış anatomisini cervical düzlemde crop eder,
- yüzeyi tolerance tabanlı weld ederek indexed surface oluşturur,
- vertex normallerinden inner offset yüzeyi üretir,
- outer + inner yüzeyleri ters winding ile birleştirir,
- cervical boundary edge'lerini quad/triangle stitch ile kapatır,
- kaynak taramaya nearest-surface preparation-fit pass uygular,
- minimum / maksimum wall tahmini çıkarır,
- sonuç geometrisini CAD Kernel QC'den geçirir.

Bu özellik **MVP geometri çekirdeğidir**. Klinik olarak doğrulanmış gerçek intaglio, robust boolean veya manufacturing validation değildir.

## 2. Preparation Fit MVP

Inner shell'in cervical/axial kısmı kaynak scan spatial indexine göre yaklaştırılır. Hedef boşluklar:

- margin zone gap
- cement gap
- axial gap
- radial gap
- transition
- milling compensation

`Preparation fit blend` ile etki 0–1 aralığında kontrol edilir.

## 3. Mesh Repair

Yeni `cad-mesh-repair-engine.ts`:

- vertex weld,
- degenerate triangle removal,
- indexed mesh rebuild,
- signed-volume ile winding yönü kontrolü,
- normal rebuild,
- işlem öncesi / sonrası CAD Mesh QC

uygular.

Arbitrary hole filling veya mesh boolean healing yaptığını iddia etmez.

## 4. Design UI

Margin / Internal Fit bölümüne yeni **Crown Shell / Intaglio MVP** paneli eklendi:

- Crown shell oluştur
- Mesh repair
- Wall thickness
- Cervical cut
- Preparation fit blend
- Shell opacity
- Weld tolerance
- Shell'i temizle
- Kesit görünümü

Kernel QC paneli artık aktif crown-shell durumunu da gösterir.

## 5. Export davranışı

Crown Shell preview aktifse STL export artık dış anatomy mesh yerine shell mesh'i export eder. Connector objeleri export grubuna eklenmeye devam eder.

## 6. Tool Suite

Aşağıdaki araçlar Tool Suite'e canlı/preview olarak işlendi:

- Crown Shell MVP
- Preparation Fit MVP
- Cervical Stitch
- Shell Wall Thickness
- Shell Mesh Repair
- Cement Gap Zones
- Axial Gap
- Radial Gap

## Ürün doğruluğu

Step 21 şu iddiaları **yapmaz**:

- klinik olarak valide edilmiş intaglio,
- Exocad eşdeğeri crown-bottom kernel,
- production-ready boolean engine,
- self-intersection repair,
- otomatik margin segmentation,
- üretim sertifikasyonu.

Ama browser içinde gerçek bir inner/outer stitched shell ve mesh-cleanup pipeline'ı sağlar; bu Step 20 clearance tabanlı MVP'den önemli bir geometri çekirdeği ilerlemesidir.
