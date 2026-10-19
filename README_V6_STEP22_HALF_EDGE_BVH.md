# DentAYA MVP v6 — Step 22 Half-Edge Mesh Core + BVH

Bu paket Step 21 Crown Shell + Mesh Core üzerine kümülatif olarak hazırlanmıştır.

## 1. Indexed mesh-of-record

`src/lib/cad-mesh-record.ts` artık STL/PLY kaynak geometrisini tek bir tekrar kullanılabilir kayda dönüştürür:

- tolerans bazlı ve komşu hücreleri de kontrol eden vertex welding
- source vertex → canonical vertex eşlemesi
- indexed triangle buffer
- dejenere yüz ayıklama
- area-weighted vertex normals
- world-space bounds
- kaynak vertex kimliğini koruyan ters eşleme

Bu kayıt margin, contact, internal-fit, QC ve sonraki segmentation araçlarının ortak geometri omurgasıdır.

## 2. Half-edge adjacency

Her üçgen için yönlü half-edge kayıtları oluşturulur:

- origin vertex
- owning face
- next / previous
- twin
- undirected edge id
- vertex → outgoing half-edge CSR indeksi
- face → first half-edge

Topoloji raporu ayrıca şunları üretir:

- boundary edge / loop / açık chain
- non-manifold edge
- inconsistent winding edge
- connected component
- isolated vertex
- Euler characteristic
- O(valence) vertex one-ring ve O(1 yüz derecesi) face-neighbor sorguları

## 3. Triangle BVH / AABB

`src/lib/cad-mesh-bvh.ts` median-split AABB ağacı kurar.

Aktif sorgular:

- gerçek triangle closest-point
- barycentric coordinate
- interpolated surface normal
- signed distance
- triangle / canonical vertex / source vertex kimliği
- AABB içindeki aday triangle sorgusu
- ziyaret edilen node ve test edilen triangle telemetrisi

## 4. Mevcut araçlara entegrasyon

`buildMeshSpatialIndex(...)` dış sözleşmesi korunmuştur. İçeride artık:

1. indexed mesh-of-record kurulur,
2. half-edge topology çıkarılır,
3. BVH oluşturulur,
4. `nearestCadSample(...)` gerçek üçgen yüzeyine sorgu yapar.

Böylece mevcut margin projection, margin smoothing, internal fit ve contact engine çağrıları UI değişikliği gerektirmeden vertex-proxy yaklaşımından triangle-surface yaklaşımına yükselmiştir. Eski spatial buckets yalnızca üçgensiz/bozuk geometri için güvenli fallback olarak tutulur.

## 5. Mesh QC yükseltmesi

`cad-mesh-qc.ts` ayrı bir welding/edge sayım sistemi kurmak yerine ortak mesh-of-record topolojisini kullanır. QC raporuna boundary loop, open chain, component, winding, isolated vertex ve Euler bilgileri eklenmiştir.

## 6. Doğrulanan sonuçlar

Sentetik kapalı tetrahedron:

- 4 welded vertex
- 4 triangle
- 6 undirected edge
- 0 boundary
- 0 non-manifold
- 1 connected component
- Euler characteristic = 2
- `(0.2, 0.2, -1)` sorgusu için closest point = `(0.2, 0.2, 0)` ve distance = `1`

DentAYA demo STL:

- 6.912 giriş triangle
- 144 dejenere triangle ayıklandı
- 6.768 geçerli triangle
- 3.386 canonical vertex
- 10.152 undirected edge
- 0 boundary
- 0 non-manifold
- 1 connected component
- 2.047 BVH node

Bu ölçümler geliştirme ortamındaki smoke test çıktısıdır; klinik veya üretim sertifikasyonu değildir.

## 7. Sonraki çekirdek adımı

Step 23 için hazır temel:

- curvature-assisted magnetic margin
- half-edge one-ring curvature hesabı
- BVH triangle projection
- surface-following margin path
- hazırlık sınırı aday skoru

Robust boolean, self-intersection repair, true wall-thickness ve klinik olarak doğrulanmış intaglio hâlâ sonraki Ar-Ge katmanlarıdır.
