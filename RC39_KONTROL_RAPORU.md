# DentAYA RC39 — kontrol raporu

Tarih: 14 Ekim 2026 (Türkiye). Sürüm: `1.0.0-rc.39`.

Taban: RC38 premium logo paketinin son form revizyonu. RC39; FDI'ye göre form önizlemesi, seçilen formun büyük önizlemesi, galeri karşılaştırmasının korunması ve güncel görsellerin yüklenmesi üzerine hazırlanmıştır. Temel geometri ailesi ve eski kayıtların aile eşleştirmesi korunur.

## Sonuçlar

| Kontrol | Sonuç | Kapsam |
| --- | --- | --- |
| FDI önizlemeleri | Geçti | 32 FDI × 24 aile = 768 görsel; her FDI için 24 farklı görüntü. 24 genel kartla toplam 792 önizleme. |
| Önizleme kaynağı | Geçti | `createRestorationGeometry` ile CAD çözünürlüğünde tam anatomik, dengeli karakterdeki taçlar; ortak kamera, ışık ve ölçek. |
| Form geometrisi | Geçti | 768 taç; kapalı kenarlar, tek bağlı gövde, pozitif hacim, aynı sınırlayıcı ölçüler; 24 aile ölçüler eşitken farklı. |
| Restorasyon geometrisi | Geçti | 1.440 restorasyon; 768 diş görünümü geometrisi; referans kök ve kaynak atlas korunuyor. |
| Şekillendirme | Geçti | 384 gövde, 3.072 ekleme/azaltma/yumuşatma/düzleştirme işlemi; her fırça geometriyi değiştiriyor, sıfır bozuk üçgen. |
| Görünüm geometrisi | Geçti | 1.216 geometri; sonlu değerler, eski tercih uyumluluğu ve bağımsız ölçü ayarları. |
| CAD tarayıcı akışı | Geçti | Gerçek WebGL, iki kamuya açık test taraması; ünite başına 24 aile, FDI önizleme değişimi, karşılaştırmanın açık kalması, teleskop geçişi, kaydetme ve yeniden açılış. |
| CAD araçları | Geçti | Gerçek restorasyonda fırça, geri al/yinele, gizli nesne koruması, sağ tık, aktif ünite, klavye ve mobil panel sınırları. |
| CAD dil ve tema | Geçti | Türkçe/İngilizce/Almanca/Arapça geçişleri ve tema değişiminde canvas, aktif ünite ve düzenleme geçmişi korunuyor. |
| Diş seçimi tarayıcısı | Geçti | 24 farklı gerçek WebGL formu; tek FDI'de o dişin kartı, çoklu seçimde genel örnek; galeri, kayıt/yeniden açılış ve formu koruyan ölçü sıfırlama. |
| Dil ve mobil arayüz | Geçti | 46 dilde seçim ve canvas korunması, 390 px görünüm; 45 çeviri paketinde görünür metin kapsamı ve masaüstü paketleri. |
| CAD iş tanımı ve akış | Geçti | İş tanımı, CAD çekirdeği, 6 aşama/8 görev, araç ve panel kontrolleri. |
| Sürüm ve kurulum hedefi | Geçti | Paket, lockfile, uygulama, istemci ve kurulum hedefi RC39; tek CMD girişi. |
| Lint / TypeScript / build | Geçti | Sıfır lint uyarısı, TypeScript kontrolü ve Next.js üretim derlemesi. |

## Kanıt ve sınırlar

Güncel komut çıktıları `verification/RC39` altındadır. Önceki sürüm raporları tarihsel kayıttır. Katalog ve FDI görselleri gerçek geometri renderlarından oluşturuldu; görüntü üretimiyle tahmin edilmiş taçlar kullanılmadı.

Tarayıcı CAD kontrollerinde kimlik ve API istekleri test verileriyle karşılandı; canlı klinik/laboratuvar verisi veya üretim Supabase kaydı kullanılmadı. Masaüstü simgesi kontrolü Windows shell taklidiyle çalışır. Windows kurucusu bu Linux ortamında oluşturulmadı veya çalıştırılmadı; kaynak paketteki CMD Windows'ta `DentAYA-Setup-1.0.0-rc.39.exe` üretir.

Galeri tam anatomik ve dengeli başlangıç ailesini gösterir. Coping/cutback redüksiyonu ve morfoloji karakteri ayrıca CAD geometrisinde uygulanır. Önizlemeler hasta özelinde marjin, iç yüzey, temas veya klinik üretim doğrulaması değildir. Yeni ana dil editör incelemesi yapılmadı.
