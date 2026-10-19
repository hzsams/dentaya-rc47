# Step 22 — Half-Edge + BVH QA

## Static / contract

- [x] Yeni TypeScript dosyaları Node 24 type-strip parser kontrolünü geçiyor
- [x] `src/app/ai/page.tsx` AYA catch değeri açıkça `Error | { message: string }` tipine normalize ediliyor
- [x] `dentayaError(error: unknown)` merkezi normalizasyon sözleşmesi korunuyor
- [x] Mevcut `CadSpatialIndex` çağrı yüzeyi korundu
- [x] Margin, contact ve internal-fit motorları yeni BVH sorgusunu mevcut importlarla kullanıyor
- [x] QC raporunun önceki alanları korundu
- [ ] Tam Next.js production build — kaynak pakette `package.json`, lockfile ve bazı temel proje dosyaları bulunmadığı için bu artefakt üzerinde çalıştırılamadı

## Indexed mesh-of-record

- [x] Non-indexed STL yüzleri canonical vertexlere weld ediliyor
- [x] Komşu quantization hücreleri kontrol ediliyor
- [x] Source → canonical eşleme korunuyor
- [x] Canonical → ilk source vertex eşlemesi korunuyor
- [x] Dejenere triangle temizliği çalışıyor
- [x] World transform mesh kaydına uygulanıyor

## Half-edge topology

- [x] Next / previous / twin kayıtları üretiliyor
- [x] Face ve vertex başlangıç indeksleri üretiliyor
- [x] Vertex outgoing CSR adjacency üretiliyor
- [x] Vertex one-ring sorgusu çalışıyor
- [x] Face-neighbor sorgusu çalışıyor
- [x] Boundary / non-manifold / winding ayrımı çalışıyor
- [x] Boundary loop / open chain çıkarılıyor
- [x] Connected components ve Euler characteristic hesaplanıyor

## BVH

- [x] Triangle AABB node ağacı kuruluyor
- [x] Median centroid split çalışıyor
- [x] Closest-point triangle yüzeyine düşüyor
- [x] Barycentric coordinate ve interpolated normal dönüyor
- [x] Signed distance dönüyor
- [x] AABB candidate query çalışıyor
- [x] Query telemetry dönüyor

## Smoke test

- [x] Kapalı tetrahedron: V=4, E=6, F=4, Euler=2
- [x] Kapalı tetrahedron: boundary=0, non-manifold=0, component=1
- [x] Açık triangle: boundary=3, boundary loop=1, watertight=false
- [x] Exact nearest: `(0.2,0.2,-1)` → `(0.2,0.2,0)`, distance=1
- [x] Demo STL: 6.912 input / 6.768 valid triangle
- [x] Demo STL: boundary=0 / non-manifold=0 / component=1

## Truthfulness

- [x] BVH gerçek closest-point sağlar; içeride/ dışarıda sınıflaması watertight parity testi değildir
- [x] Signed distance interpolated surface normal yönüne göredir
- [x] Bu adım robust boolean veya self-intersection repair iddiası taşımaz
- [x] Benchmark klinik/üretim validasyonu olarak sunulmaz
