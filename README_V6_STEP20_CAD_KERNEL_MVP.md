# DentAYA MVP v6 — Step 20 CAD Kernel MVP + BuildFix

Bu paket Step 19 üzerine kümülatif olarak hazırlanmıştır.

## 1. BuildFix
`src/app/ai/page.tsx` içindeki `catch (error)` değişkeninin `unknown` tipinden `dentayaError(...)` fonksiyonuna gönderilmesi nedeniyle oluşan TypeScript hatası giderildi.

Ayrıca `src/lib/dentaya-errors.ts` daha güvenli hale getirildi ve `dentayaError(error: unknown)` artık `Error`, Supabase-benzeri hata nesneleri, string ve bilinmeyen değerleri merkezi olarak normalize eder.

## 2. CAD Kernel MVP

### Margin Engine v2
- yüzeye projeksiyon
- closed margin smoothing
- yüzey normali boyunca + / - offset
- margin kalite raporu
- projected ratio / segment / perimeter ölçümleri

### Internal Fit MVP
- margin zone gap
- cement gap
- axial gap
- radial gap
- transition band
- milling compensation
- gerçek vertex displacement ile cervical relief

Not: bu henüz tam intaglio / watertight crown-bottom shell değildir.

### Undercut Engine
- insertion axis tabanlı undercut oranı
- severity analizi
- block-out preview geometrisi

### Signed Contact Engine
- kaynak mesh normallerine göre yaklaşık signed-distance
- collision sample tespiti
- contact / clearance ayrımı
- yeni contact renk haritası

### Connector Engine
- restorasyon üzerinde iki docking noktası seçme
- round / oval connector
- çap ayarı
- minimum alan / genişlik / yükseklik QC
- STL export sırasında connector shell'lerini dahil etme

Not: connectorlar henüz robust boolean union ile tek watertight shell'e kaynaştırılmaz.

### Freeform v2
- önceki Add / Reduce / Flatten korunur
- Smooth motoru local-neighborhood Laplacian/tangential smoothing'e yükseltildi
- preserve-shape, cusp/equator lock ve occlusal-only kısıtları korunur

### Mesh QC
- vertex / unique vertex
- triangle count
- degenerate triangle
- boundary edge
- non-manifold edge
- welded topology bazlı watertight kontrol
- bounding dimensions
- surface area

### Export gate
Kliniğe review için STL göndermeden önce CAD Kernel QC çalışır.
- non-watertight / non-manifold geometri bloklanır
- connector minimum QC eşiğini geçmeyen tasarım bloklanır
- QC özeti design version parameters içine eklenir

## 3. CAD UI
- Margin paneline Project / Smooth / +0.05 / -0.05 eklendi
- Internal Fit MVP ayar paneli eklendi
- Block-out preview eklendi
- Contacts paneline Connector aracı ve QC eşikleri eklendi
- Thickness/Control paneline CAD Kernel QC raporu eklendi
- `C` = Connector tool
- `Ctrl/Cmd + Shift + Q` = Kernel QC
- `Ctrl/Cmd + Shift + T` = Full Tool Suite

## Ürün doğruluğu sınırı
Bu sürüm browser tabanlı gerçek geometri işlemleri yapar; ancak Exocad sınıfı üretim kernel eşdeğerliği iddiası yoktur. Robust boolean, tam crown-bottom/intaglio shell, true wall-thickness, segmentation, articulator, implant interface ve CAM doğrulaması sonraki kernel katmanlarıdır.
