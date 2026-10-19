# DentAYA MVP v6 — Step 19: CAD Full Tool Suite

Bu adım, DentAYA Design'ı tek bir kron aracı ekranı olmaktan çıkarıp kapsamlı bir dental CAD çalışma ortamının ürün iskeletine dönüştürür.

## Ana değişiklikler

- **361 araç / işlev** bağımsız DentAYA CAD Tool Matrix içine alındı.
- Araçlar `AKTİF`, `MVP ÖNİZLEME`, `GEOMETRİ ÇEKİRDEĞİ`, `YOL HARİTASI` olarak açıkça ayrıldı.
- Design ekranına arama ve kategori filtreli **Tüm Araçlar** paneli eklendi.
- Kısayol: `Ctrl/Cmd + Shift + T` Tool Suite'i açar, `Esc` kapatır.
- Aktif araçlar doğrudan mevcut viewport işlevlerine bağlanır.
- Üretim sınıfı geometri gerektiren araçlar görünür ve şartnamelidir, fakat varmış gibi sahte sonuç üretmez.

## Bu turda gerçekten işlevsel hale gelen yeni sculpt araçları

- Flatten / Düzleştir
- Round / Pointed / Flat brush falloff
- Shape-preserving smoothing
- Hold Cusp Tips
- Hold Equator
- Occlusal Movement Only

Bunlar `CadSettings` içinde proje JSON'una kaydedilebilir ve browser Three.js viewport üzerinde çalışır.

## Tool Suite kategorileri

Restorasyon, Marjin, Internal Fit, Anatomi, Sculpt, Adaptasyon, Analiz, Yapısal, Mesh, İmplant, Bar, Splint, Provisional, Parsiyel, Tam Protez, Model, Hareket, DICOM, Smile, İleri Restorasyon, AI, Üretim, Dosya.

## Önemli doğruluk sınırı

DentAYA Design halen browser tabanlı bağımsız bir MVP CAD engine'dir. Half-edge/BVH tabanlı production kernel, robust booleans, true intaglio/crown-bottom, watertight shell, manufacturing-grade wall thickness, implant library matching, articulator solving ve benzeri araçlar tamamlanmadan "Exocad parity" veya manufacturing validation iddiası yapılmamalıdır.

## Ana dosyalar

- `src/lib/dentaya-cad-tool-matrix.ts`
- `src/app/design/DesignStudioClient.tsx`
- `src/app/design/DesignViewport.tsx`
