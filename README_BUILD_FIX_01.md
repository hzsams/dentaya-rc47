# DentAYA MVP UX v5 — Build Fix 01

Bu hotfix son build çıktısındaki 8 TypeScript hatasını hedefler.

## Düzeltilenler

### AI
Eksik yardımcılar eklendi:
- `caseStatusLabel`
- `priorityLabel`

### DentAYA Design
Türkçeleştirme sırasında yanlışlıkla kod identifier'larına dokunulmuştu.
Aşağıdaki teknik isimler tekrar gerçek API isimlerine döndürüldü:

- `CadÖlçment` → `CadMeasurement`
- `CadNokta` → `CadPoint`
- `marginNoktas` → `marginPoints`
- `setMarjinNoktas` → `setMarginPoints`
- `setÖlçümler` → `setMeasurements`
- `onMarjinNoktasChange` → `onMarginPointsChange`
- `onÖlçümlerChange` → `onMeasurementsChange`
- `setSürümler` → `setVersions`

Kullanıcıya görünen metinler Türkçe kalır; yalnız programlama identifier'ları İngilizce API isimlerini korur.

### Taramalar
Supabase kolon adı yanlışlıkla Türkçeleştirilmişti:
- `bütünlük_score` → `completeness_score`

### 3D Karşılaştırma
Three.js API yanlışlıkla Türkçeleştirilmişti:
- `computeNoktaNormals()` → `computeVertexNormals()`

## Kopyalama

Bu paket tam v5 paketidir. `DentAYA_MVP_UX_v5_BuildFix_01` klasörünün içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Sonra:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```
