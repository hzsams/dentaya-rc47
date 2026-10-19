# DentAYA CAD Engine Feature Matrix

## Durum sözlüğü

- **AKTİF:** Kullanıcı bugün arayüzden çalıştırabilir.
- **MVP ÖNİZLEME:** Gerçek veri/geometriyi analiz eder fakat klinik/üretim doğrulaması değildir.
- **GEOMETRİ ÇEKİRDEĞİ:** UI/şartname mevcut; üretim düzeyi geometri algoritması gerektirir.
- **YOL HARİTASI:** Daha sonraki ürün katmanı / servis / üretim entegrasyonu.

## Step 19 sayısal kapsam

- Toplam kayıt: **361**
- Aktif: **33**
- MVP önizleme: **11**
- Geometri çekirdeği gerektiren: **216**
- Yol haritası: **101**

## MVP'de aktif çekirdek

- STL / PLY intake
- Orbit ve standart kamera yönleri
- Manuel margin point akışı + spline görünümü
- Giriş eksenini mevcut görünümden alma
- Undercut orientation map
- Prosedürel tooth/restoration başlangıç geometrisi
- Move / rotate / morphology scale / cusp scale
- Add / Remove / Smooth / Flatten sculpt
- Round / Pointed / Flat brush
- Shape-preserving smoothing
- Hold cusp / hold equator / occlusal-only constraint
- Contact / nearest-distance preview
- Clearance/thickness proxy
- Section ve wireframe
- Measurement
- Undo / Redo / Fit
- Version / review / STL export akışı

## Bir sonraki CAD kernel önceliği

1. Indexed/welded mesh + half-edge adjacency + BVH
2. Curvature-assisted magnetic margin
3. Preparation segmentation
4. True crown bottom / intaglio + cement gap zones
5. Blockout + insertion-axis constraints
6. Watertight shell / robust booleans
7. True wall thickness + self-intersection / collision
8. Adjacent/antagonist segmentation and adaptation
9. Tooth anatomy library + bridge connector geometry
10. Implant / bar / splint / model / partial/denture geometry kernels
11. Virtual articulator and patient motion
12. Manufacturing validation and CAM handoff

---

## STEP 20 — CANLI KERNEL DURUM GÜNCELLEMESİ

| Alan | Step 20 durumu | Not |
|---|---|---|
| Margin surface projection | AKTİF | Mevcut kontrol noktalarını kaynak mesh'e projekte eder |
| Margin smoothing | AKTİF | Closed curve smoothing + reprojection |
| Margin global offset | AKTİF | Surface normal boyunca +/- offset |
| Margin automatic detection | GEOMETRİ ÇEKİRDEĞİ | Henüz otomatik tespit yok |
| Cement gap / zone controls | MVP ÖNİZLEME + GEOMETRİ | Cervical relief üzerinde uygulanır |
| Axial / radial gap | MVP ÖNİZLEME + GEOMETRİ | Tam intaglio shell değildir |
| Milling compensation | MVP ÖNİZLEME | Internal fit relief içinde konservatif telafi |
| Undercut analysis | AKTİF | Insertion axis + source normals |
| Block-out | MVP ÖNİZLEME | Preview geometry, manufacturing geometry değil |
| Signed contact / collision | AKTİF | Nearest surface normal bazlı signed-distance yaklaşımı |
| Connector docking | AKTİF | İki nokta ile connector oluşturma |
| Connector section QC | AKTİF | Area / width / height eşikleri |
| Connector boolean union | GEOMETRİ ÇEKİRDEĞİ | Robust watertight union henüz yok |
| Freeform smoothing v2 | AKTİF | Local neighborhood + shape-preserving tangent smoothing |
| Mesh topology QC | AKTİF | Boundary / non-manifold / degenerate / watertight |
| Export QC gate | AKTİF | Kritik mesh/connector hatasında review gönderimi durur |
| True crown-bottom shell | GEOMETRİ ÇEKİRDEĞİ | Sonraki faz |
| True wall thickness | GEOMETRİ ÇEKİRDEĞİ | Inner/outer shell gerekli |
| Boolean engine | GEOMETRİ ÇEKİRDEĞİ | Sonraki faz |

---

## STEP 21 — CROWN SHELL + MESH CORE GÜNCELLEMESİ

Tool Suite kaynak kodundaki güncel sınıflama:

- Toplam kayıt: **367**
- AKTİF: **49**
- MVP ÖNİZLEME: **14**
- GEOMETRİ ÇEKİRDEĞİ: **205**
- YOL HARİTASI: **99**

| Alan | Step 21 durumu | Teknik sınır |
|---|---|---|
| Crown Shell MVP | AKTİF | Outer + inner offset + cervical stitch |
| Shell wall thickness | AKTİF | Corresponding outer/inner vertex tahmini |
| Cervical stitch | AKTİF | Boundary edge stitching |
| Preparation fit | MVP ÖNİZLEME | Nearest-surface fitting; klinik intaglio değil |
| Cement / axial / radial zones | AKTİF / MVP | Shell fit ve internal-fit parametrelerinde kullanılır |
| Mesh weld / cleanup | AKTİF | Tolerance weld + degenerate cleanup |
| Winding normalization | AKTİF | Global signed-volume yön kontrolü |
| Watertight QC | AKTİF | Boundary / non-manifold edge analizi |
| Robust boolean union | GEOMETRİ ÇEKİRDEĞİ | Connector/crown birleşimi için gerekli |
| Arbitrary hole filling | GEOMETRİ ÇEKİRDEĞİ | Mesh repair şu an hole filling yapmaz |
| Self-intersection repair | GEOMETRİ ÇEKİRDEĞİ | Henüz yok |
| Clinically validated intaglio | GEOMETRİ ÇEKİRDEĞİ | Pilot/Ar-Ge dışı doğrulama gerektirir |

---

## STEP 22 — HALF-EDGE MESH CORE + BVH GÜNCELLEMESİ

| Alan | Step 22 durumu | Teknik sınır |
|---|---|---|
| Reusable indexed mesh-of-record | AKTİF | Ortak world-space geometri kaydı |
| Source/canonical vertex mapping | AKTİF | İlk source vertex ters eşlemesi korunur |
| Half-edge next/prev/twin | AKTİF | Triangle mesh topology |
| Vertex one-ring adjacency | AKTİF | CSR outgoing half-edge indeksi |
| Face adjacency | AKTİF | Twin üzerinden komşu yüz |
| Boundary loop / open chain | AKTİF | Non-manifold dallarda repair yapmaz |
| Connected components / Euler | AKTİF | Topoloji analizi |
| Triangle BVH / AABB | AKTİF | Median centroid split |
| Exact triangle closest-point | AKTİF | Barycentric point + interpolated normal |
| Signed surface distance | AKTİF | Normal yönlü işaret; volumetric inside/outside değildir |
| AABB triangle candidates | AKTİF | Sonraki collision/segmentation altyapısı |
| Margin/contact/internal-fit BVH geçişi | AKTİF | Mevcut API üzerinden otomatik |
| Robust boolean / self-intersection | GEOMETRİ ÇEKİRDEĞİ | Step 22 kapsamı dışında |

### Sıradaki çekirdek önceliği

1. Half-edge one-ring curvature hesabı
2. Curvature-assisted / magnetic margin
3. Preparation segmentation
4. Surface-following shortest path
5. Self-intersection detection
6. Robust boolean / connector union
7. True wall-thickness ray analysis
8. Adjacent / antagonist segmentation
9. Manufacturing-ready export validation
