# DentAYA RC38 — Premium tipografi ve morfoloji kütüphanesi

Sürüm: **1.0.0-rc.38**. RC38 kaynak paketinin güncellenmiş hali.

Ana logoda **DENTAYA** yazısı, özel çizilmiş kontrastlı serif harfler ve sade D amblemi bulunur. Optik harf aralıkları vektör kaynakta tanımlıdır; cihazdaki fonta bağlı değildir. Sekiz logo, açık/koyu tema, yalnız yazı, yalnız simge ve tek renk baskı sürümleriyle gelir. Ayarlar → Görünüm bölümünde logo seçimi, %80–125 logo boyutu ve Windows masaüstü simgesi işlemi bulunur.

## 24 form, altı morfoloji sınıfı

| Sınıf | Aileler |
| --- | --- |
| Dengeli anatomi | Natura, Lobata, Mamelon, Incisa |
| İnsizal ve lingual karakter | Faseta, Palata, Cingula, Carina |
| Tüberkül karakteri | Cuspid, Bicuspa, Triada, Domus |
| Sırt düzeni | Crista, Obliqua, Gemina, Limbus |
| Oluk düzeni | Crux, Ypsilon, H-Linea, Reticula |
| Yüzey karakteri | Fossa, Puncta, Lamina, Planum |

Formlar kesici kenar, yüzey lobları, lingual yapı, tüberkül düzeni, sırtlar ve oluklar bakımından farklıdır. Her aile kesici, kanin, premolar ve molar FDI grubuna göre geometri üretir. Katalogda her sütun aynı ölçü ve kamerayla çizilmiştir; boyut farkları aile olarak sayılmaz.

Ayarlar → Diş görünümü bölümünde **Diş formu** seçimi altı sınıfa göre gruplanır. **Form kütüphanesi** açılarak gerçek geometriden üretilmiş görseller ve açıklamalar incelenebilir. **Gelişmiş ölçü ayarları** genişlik, kron yüksekliği, derinlik, anatomik belirginlik, kök uzunluğu ve aşınmayı ayrı düzenler. **Ölçüleri sıfırla** seçilen formu korur. 16 görünüm stili renk, yüzey ve formu birlikte uygulayabilir.

CAD → **İş tanımı** içinde aynı kütüphane her ünite için seçilebilir. Aile seçimi aktif ünitenin yeni başlangıç anatomisini değiştirir; kron, coping, cutback ve diğer redüksiyonlar ayrı uygulanır. Birincil/ikincil teleskopta mekanik şekil kullanıldığı için anatomik aile seçicisi gösterilmez. Seçimler proje ayarlarıyla kaydedilir.

Ekle, çıkar, yumuşat ve düzleştir araçları yeni başlangıç formlarında çalışır. Dar sırtlarda tam hareket yüzeyi ters çevirecekse fırça daha küçük bir hareket dener; güvenli hareket bulunamazsa değişiklik uygulanmaz. Açık kenar, ayrık gövde ve ters yüzey kontrolleri korunur. Form galerisi iş tanımı penceresinde kaydırılarak açılır; ünite kartları üst üste sıkışmaz.

Diş görünümü ayarındaki genel form, referans diş şemasına uygulanır. CAD başlangıç formu, CAD iş tanımında üniteye seçilir. Kaydedilmiş STL dosyaları ve hasta taramaları yeniden yazılmaz. Bu prosedürel kütüphane düzenlenebilir başlangıç anatomisidir; üretim veya klinik uygunluk doğrulaması olarak değerlendirilmemelidir.

## Eski kayıtlar ve diller

Eski form kimlikleri otomatik eşlenir: `broad → crux`, `slender → palata`, `compact/worn → planum`, `square → faseta`, `oval → lobata`, `triangular → carina`, `youthful → mamelon`. `natural` geçerlidir. Kayıtların ölçüleri, ünite kimlikleri ve diğer proje bilgileri korunur. Yeni SQL göçü gerekmez.

46 dil bulunur. Aile adları sabit koleksiyon adlarıdır; sınıflar ve açıklamalar çevrilir. Yeni açıklamalar yerel sözlükten kısa morfoloji terimleriyle hazırlanmıştır. Paket kapsam kontrolü ana dil editörü veya klinik terminoloji onayı anlamına gelmez.

## Windows'ta kurulum

1. ZIP'i yeni bir klasöre çıkarıp `DentAYA_Production_RC38` klasörünü açın.
2. Çalışan projenizdeki `.env.local` dosyasını `package.json` yanına kopyalayın.
3. Tek giriş dosyası `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını açın.
4. Derleme tamamlanınca `dist-desktop\DentAYA-Setup-1.0.0-rc.38.exe` dosyasını çalıştırın.

ZIP kaynak kodu ve hazır görsel varlıkları içerir. Windows EXE'si bu Linux ortamında üretilmedi veya Windows'ta çalıştırılmadı; kurucuyu CMD üretir.

## Kaynaklar ve tekrar üretim

Logolar `public/logos`, logo sunumu `public/brand`, morfoloji görselleri `public/tooth-forms` altındadır. `_light` açık zeminde, temel SVG koyu zeminde, `_word` yalnız yazıda, `_mono` ve `_mono_white` tek renk baskıda kullanılır. Windows ICO dosyaları 16–256 px boyutlarını içerir.

- Logo harfleri: `scripts/brand-source/letterforms.json`. Üretim: `python3 scripts/build-brand-assets.py`, `node scripts/render-brand-assets.mjs` (sharp), `python3 scripts/brand-source/build-icons.py` (Pillow).
- Form tanımları: `src/lib/tooth-form-library.ts`; geometri: `src/lib/tooth-morphology.ts`; CAD başlangıcı: `src/lib/cad-restoration-shape.ts`.
- Form görselleri: `node --import tsx scripts/export-morphology-catalog.ts`, ardından `python3 scripts/render-morphology-catalog.py` (numpy, matplotlib, Pillow).
- Yeni dil metinleri: `scripts/morphology-english.json`, `scripts/morphology-glossary.tsv`. Yerel güncelleme: `python3 scripts/build-morphology-language-packs.py`.
- Geometri kontrolü: `npm run verify:tooth-forms`. Ekran kontrolü: `npm run verify:tooth-form-browser` (Playwright/Chromium). Güncel kanıt: `verification/RC38-premium`.
- Yeni formlarda şekillendirme: `npm run verify:morphology-sculpt` (24 aile × 4 diş grubu × 4 araç, 3.072 darbe). Yüzey koruma regresyonları: `npm run verify:sculpt-integrity`. CAD seçim ve kayıt akışı: `npm run verify:cad-browser` (Playwright/Chromium).

Normal uygulama derlemesi görsel üretim araçlarını çalıştırmaz; paketteki hazır dosyaları kullanır.
