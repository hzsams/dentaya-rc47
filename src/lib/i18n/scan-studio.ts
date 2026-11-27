const tr = {
    tooLarge: 'Tarama dosyası 50 MB sınırını aşıyor.', emptyFile: 'Seçilen tarama dosyası boş.',
    stages: 'Tarama aşamaları', navigation: 'Tarama geçişleri', tools: 'Tarama araçları',
    fileSource: 'Dosyadan aktarım', formats: 'STL / PLY', fileSpec: 'STL / PLY · 50 MB',
    open: 'Dosya aç', replace: 'Dosyayı değiştir', record: 'Kayıt bilgileri', quality: 'Geometri kontrolü',
    remove: 'Dosyayı kaldır', preview: '3B tarama önizlemesi', saved: 'Tarama kaydedildi', empty: 'Tarama dosyası aç',
    parsing: 'Geometri yükleniyor…', fit: 'Modeli sığdır', rejected: 'Geometri kayda uygun değil',
    confirmed: 'Ölçü birimi doğrulandı', confirm: 'Kayıt bilgilerinde mm birimini doğrula', waiting: 'Tarama dosyası bekleniyor',
    dimensions: 'Boyutlar (mm)', openEdge: 'Açık kenar', unitPlausible: 'Boyut makul', checkScale: 'Ölçeği kontrol et',
    optional: 'Ek bilgiler', webglFailed: '3B önizleme için WebGL başlatılamadı.',
    parseFailed: 'Tarama dosyası okunamadı. Geçerli bir STL veya PLY dosyası seç.',
};
const en: typeof tr = {
    tooLarge: 'The scan file exceeds 50 MB.', emptyFile: 'The selected scan file is empty.',
    stages: 'Scan stages', navigation: 'Scan navigation', tools: 'Scan tools',
    fileSource: 'File import', formats: 'STL / PLY', fileSpec: 'STL / PLY · 50 MB',
    open: 'Open file', replace: 'Replace file', record: 'Record details', quality: 'Geometry check',
    remove: 'Remove file', preview: '3D scan preview', saved: 'Scan saved', empty: 'Open a scan file',
    parsing: 'Loading geometry…', fit: 'Fit model', rejected: 'Geometry cannot be saved',
    confirmed: 'Units confirmed', confirm: 'Confirm millimetres in Record details', waiting: 'Waiting for a scan file',
    dimensions: 'Dimensions (mm)', openEdge: 'Open edges', unitPlausible: 'Plausible size', checkScale: 'Check the scale',
    optional: 'Additional details', webglFailed: 'WebGL could not start the 3D preview.',
    parseFailed: 'Could not read the scan. Choose a valid STL or PLY file.',
};
export function scanStudioText(locale: string) { return locale === 'tr' ? tr : en; }
