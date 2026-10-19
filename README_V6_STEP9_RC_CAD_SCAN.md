# DentAYA MVP v6 — Step 9: Release Candidate + CAD/Scan Advanced

Bu paket Step 8 Final MVP Shell üzerine iki işi birlikte kapatır:

1. Release Candidate hazırlığı
2. DentAYA Design + Tarama motorunda ileri geometri/analiz turu

## Release

Yeni sürüm kimliği:

```text
0.1.0-rc.1
```

Yeni route:

```text
/release-check
```

Kontroller:

- Supabase URL
- public anon / publishable key
- yanlışlıkla `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- network
- WebGL
- release host
- auth session
- active membership
- organization
- temel RLS query

Staging varsayılan olarak `robots.ts` ile noindex çalışır.

Production index açmak için:

```env
NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL=production
```

Önerilen staging:

```env
NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL=staging
NEXT_PUBLIC_DENTAYA_BUILD_LABEL=DentAYA MVP RC1
```

## Production console

Dağınık `console.error` çağrıları `devError()` arkasına alındı.

Production bundle'da kullanıcı hataları teknik console spam üretmez.

## DentAYA Design — Yeni

### 1. Giriş ekseni

Mevcut kamera görünümü:

```text
Mevcut görünümü giriş ekseni yap
```

ile insertion axis olarak kaydedilir.

Settings JSON:

```text
insertion_axis_x
insertion_axis_y
insertion_axis_z
```

### 2. Undercut analizi

Kaynak taramanın vertex normal yönü seçilen insertion axis ile karşılaştırılır.

Renk:

```text
kırmızı → ters/undercut yön
sarı    → geçiş
yeşil   → eksene daha uygun yüzey
```

Bu frezeleme sertifikasyonu değildir; CAD geometrik ön analizidir.

### 3. Temas haritası

Eski Z yüksekliği bazlı renk prototipi kaldırıldı.

Artık restorasyon vertexleri kaynak taramanın örneklenmiş spatial hash'i üzerinde nearest-neighbor mesafesi ile analiz edilir.

Temas önizlemesi gerçek scan geometrisine bağlıdır.

### 4. Kalınlık / clearance proxy

Eski yalnız yüksekliğe bağlı görünüm kaldırıldı.

Kaynak taramaya nearest distance:

```text
minimum_thickness_mm
```

hedefine göre renklendirilir.

Bu gerçek intaglio → outer wall thickness ölçümü değildir. Gerçek crown-bottom / shell geometry kernel gelene kadar `clearance/thickness proxy` olarak ele alınmalıdır.

### 5. Kesit

Yeni:

```text
Section view
section_offset_mm
```

Insertion axis normaline göre clipping plane çalışır.

### 6. Wireframe

Scan ve restorasyon mesh topolojisini tel kafes olarak incelemek mümkün.

### 7. Margin

Margin noktaları artık düz çizgi yerine kapalı centripetal Catmull-Rom spline ile gösterilir.

Ek aksiyon:

```text
Son noktayı sil
```

### 8. FDI tabanlı morfoloji ailesi

Procedural başlangıç morfolojisi:

```text
anterior
premolar
molar
```

olarak FDI diş numarasına göre değişir.

Bu hâlâ gerçek lisanslı tooth library değildir.

## Scan Studio — Yeni

### Mesh intake

STL / PLY seçildiğinde:

- invalid coordinate
- degenerate triangle
- boundary edge
- non-manifold edge
- topology analysis mode
- suspicious unit scale

kontrolleri yapılır.

50 MB sınırı korunur.

Büyük meshlerde pahalı topology pass otomatik örneklem moduna düşer.

### Unit confirmation

STL formatı kendi içinde fiziksel unit taşımaz.

Kaydetmeden önce kullanıcı:

```text
Dosya ölçüsü milimetre
```

onayı verir.

Şüpheli model ölçeği ayrıca uyarılır.

### Scan metrics

`scan_sessions.metrics` içine:

```text
unit
unit_confirmed
mesh_intake_status
topology_mode
degenerate_triangles
boundary_edges
non_manifold_edges
invalid_vertices
unit_hint
mesh_warnings
```

yazılır.

Yeni DB migration gerekmez; metrics mevcut JSONB alanıdır.

## Scan Compare — Yeni registration

Eski:

```text
center + proportional vertex-index mapping
```

kaldırıldı.

Yeni pipeline:

```text
center
→ sampled rigid ICP
→ Horn quaternion rigid solve
→ nearest-neighbor surface distance
→ deviation heatmap
```

UI ayrıca:

```text
ICP RMS
eşleşme sayısı
```

gösterir.

Bu, önceki prototipten belirgin biçimde daha anlamlıdır; ancak klinik olarak valide edilmiş longitudinal registration değildir.

## Exocad hakkında

DentAYA içine Exocad proprietary source code kopyalanmamıştır.

Tasarım akışındaki insertion axis, undercut, margin editing, freeform, contact visualization, sectional view gibi kavramlar kamuya açık ürün dokümantasyonunda tanımlanan dental-CAD iş akışlarından ve genel CAD/geometry prensiplerinden bağımsız olarak uygulanmıştır.

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step9_RC_CADScan
```

içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Ardından:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build yeşilse:

```powershell
npm.cmd run dev
```

İlk sıra:

```text
/release-check
/design
/scan-studio
/scans
```

## Gerçek CAD parity için kalan ana kernel işleri

- curvature-assisted / magnetic margin detection
- draggable margin control points constrained to mesh
- true insertion-axis auto-detection
- true preparation segmentation
- intaglio / crown-bottom generation
- cement-gap offset surface
- insertion-axis blockout
- watertight shell boolean
- real wall-thickness computation
- adjacent + antagonist segmentation
- collision / adaptation
- anatomy library
- bridge connectors
- articulator / dynamic occlusion
- manufacturing QC
- CAM/nesting/postprocessor

Bu maddeler tamamlanmadan DentAYA Design `Exocad parity` veya manufacturing-grade CAD olarak tanımlanmamalıdır.
