# DentAYA RC29 · kontrol raporu

4 Ekim 2026 · sürüm `1.0.0-rc.29` · kaynak paketi.

## Sonuç

Son kaynaklarla üretim web derlemesi, TypeScript kontrolü ve sıfır uyarı eşiğiyle ESLint geçti. Tarayıcıda form, diş, ref, menü dili, AYA iptal / geçmiş ve ses davranışları doğrulandı. Windows Setup dosyası bu Linux ortamında üretilmedi; gerçek yerel modelden çıkarım yapılmadı.

31 dil seçeneği ve AB'nin 24 resmî dili bulunur. Arayüz çevirisi başlıklarla sınırlı değildir: 74 ekran bileşeni, bağlantılar, açıklamalar, form alanları, dinamik araç ipuçları ve erişilebilirlik etiketleri aynı sisteme bağlıdır. Bu sürümün tam paket kaynağı 4.550 metindir.

**Çeviri kapsamı:** 220 mevcut ortak metnin 19 dilde çevirileri ile yeni dillerin başlangıç etiketleri paketlidir. 31 dilde tamamlanmış bütün kataloglar bu ZIP içinde bulunmaz. Tam arayüz paketi cihazdaki yerel modelle hazırlanır veya çevirmen paketi içe aktarılır. “Hazır” göstergesi yalnız bütün kaynak anahtarlar dolduğunda açılır. Makine çevirisi kalitesi bu testlerde ölçülmedi.

## Yapılan kontroller

| Kontrol | Sonuç ve kapsam |
| --- | --- |
| `verify:runtime` ve `verify:release` | Node / npm sınırı; package, lockfile, istemci sürümü ve Setup adının RC29 ile eşleşmesi. |
| `verify:security` | 21 mevcut statik kontrol geçti; sunucu istek bütçeleri ve özel anahtar ayrımı. |
| `verify:localization` | 31 benzersiz dil, 24 AB dili; ortak çeviriler; tarih / sayı biçimleri; bütün ekranların bağlanması; manifest eşleşmesi; kullanıcı metni ve `$&` değerinin korunması. |
| `verify:aya` | Gövde boyutu, bozuk JSON, izin verilen dil ve bulut tanılama akışı. Sağlayıcı / kimlik doğrulama testte simüle edildi. |
| `verify:local-aya` | Sabit yerel adres, anahtarsız istek, uzak model reddi, sınırlı geçmiş, boş yanıt, sahipli iptal, indirme durumu ve eşzamanlı iş sınırı. Model yanıtı simüle edildi. |
| `verify:aya-core` | Doğrulanan tercihler, alakalı / alakasız belge arama, Unicode / CJK sözcükleme, çevrilmiş belgede arama, açık not izni ve ayrı rehber etiketi. |
| `verify:language-packs` | Simüle edilmiş çıkarımla 4.550 anahtarın tam doldurulması; durdurma / devam / tekrar yükleme; yanlış dil / sürüm / kaynak reddi; sayılar, FDI ve yer tutucular; düzeltme ve atomik kayıt. |
| `verify:desktop-language` | Ana / CAD pencere sahipliği, ana çerçeve ve köken; iptal sahibi; menü rolleri, kısayollar ve tercih kaydı; geç dil yanıtı ve meşguliyet yarışı. Electron pencereleri simüle edildi. |
| `verify:experience` | 8 doku, 7 olay, düzey / ton sınırları, geceyi aşan ve tam gün sessiz saat sınırları; kameranın model içinden geçmeden son konuma ulaşması. |
| `verify:cad-display` | Katman görünürlüğü, opaklık / derinlik, geometriyi değiştirmeme, ortak çene koordinatları ve sağ tuş eşiği. |
| `verify:performance` / `verify:pilot` | Mevcut performans / dosya sözleşmeleri, 8 ve 19 statik kontrol. Biçimlendirmeye duyarlı eski kontroller boşluk / sayısal ayırıcı farkına dayanıklı hale getirildi; eşikler korunuyor. |
| `verify:cad` | Örnek ağ su geçirmez; taç kabuğu, BVH ve kayıt denemesi geçti. Bu yapay test tek başına klinik veya üretim uygunluğu belgesi değildir. |
| CAD etkileşim / akış / panel | 36 + 18 + 12 mevcut sözleşme kontrolü geçti. |
| Veritabanı / uçtan uca / operasyon | PGlite test ortamında 26 migration, 42 tablo ve RLS kontrolleri; klinik → lab → tasarım → teslimat akışı ve geçersiz durum geçişleri; operasyon ölçümleri geçti. Canlı Supabase projesine yazılmadı. |
| `lint -- --max-warnings=0` / `typecheck` | Son kaynaklarla geçti. |
| `build` | Son kaynaklarla Next üretim derlemesi geçti; standalone çıktısı üretildi; geçici test rotası üretim rotalarına dahil değil. |

## Gerçek tarayıcı kontrolü

`verify:ui-browser`, Chromium / Playwright ile geçici bir test ekranı oluşturur. Gerçek React bileşenleri ve 3D diş görünümü çalıştırıldı; yerel motor / IPC yanıtları simüle edildi.

- 31 dil seçeneği; geç yüklenen paketin paragraf, buton, yer tutucu, başlık ve erişilebilirlik etiketlerine uygulanması.
- Önceki dile dönünce menünün aynı dile dönmesi; düzeltilmiş paket içeriğinin yenilenmesi.
- Kullanıcının `Kaydet` gibi ortak çeviri anahtarıyla aynı adı yazması, iç içe kullanıcı metni ve `$&` içeren ismin korunması.
- Dinamik FDI / rol ve köprü araç ipuçları; numaralar sabit, UI rolü ve açıklaması çevrilir. Kullanıcıya ait başlık değerleri çevrilmez.
- Kontrollü giriş, seçili 47 / 46 dişleri, yerleşmiş 3D koordinatlar, aynı canvas, DOM ref ve bağlantı hedefi korunur.
- “Durdur” ikinci bir gönderim yapmaz; iptal edilen soru girişe döner. Kaydedilmiş rehber yanıtı model yanıtı olarak yeniden etiketlenmez; saklamayı kapatma geçmişi temizler.
- OfflineAudioContext ile 8 doku × 7 olay = **56 ayrı, sıfır olmayan dalga biçimi**. En yüksek mutlak örnek düzeyi **0,285746**; ±1 sınırının altında. İşiterek ASMR kalitesi değerlendirilmedi.
- 390 px ve 1.360 px ekran kontrolleri; sohbet yazma alanı dil seçicinin arkasında kalmıyor. React anahtar / hydration / güncelleme döngüsü hatası görülmedi.

## Paket ve sınırlamalar

Kaynak ZIP, node_modules / derleme önbelleği / özel `.env.local` / geçici test rotasını içermez. CRC ve bütün dosyaların diskteki kaynakla eşleşmesi kontrol edilir. Eğitim taramaları ve diş anatomisi dosyaları geri yüklenen RC29 referans paketine bayt düzeyinde eşittir.

Windows kurulum sihirbazı, Windows masaüstü simge önbelleği, gerçek Ollama modeli, gerçek çeviri kalitesi, gerçek kullanıcı hesabı ve canlı veri bağlantısı bu ortamda denenmedi. AYA Core kendi yazılım katmanıdır; yeni bir temel model eğitildiği iddiası yoktur. Kullanım adımları `RC29_KULLANIM.md` içinde bulunur.
