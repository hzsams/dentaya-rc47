> Tarihsel kayıt: İlk RC38 logo paketi için hazırlanmıştır. Güncel premium tipografi ve 24 aile kontrolleri kökteki RC38_KONTROL_RAPORU.md ve verification/RC38-premium altındadır.

# RC38 — Kontrol Raporu

Tarih: 12 Ekim 2026. Sürüm: **1.0.0-rc.38**. Temel: RC37'nin 46 dil içeren final kaynak paketi.

## Sonuç

Ana logo tam **DENTAYA** kelime işareti ve sade D amblemiyle yenilendi. Sekiz tasarım; açık/koyu tema, yalnız yazı, yalnız simge ve siyah/beyaz baskı sürümleriyle hazırlandı. Favicon, PWA ve Windows ICO dosyaları birlikte güncellendi. Ana tipografi vektör çizimidir; bilgisayarın fontuna veya çevrimiçi font hizmetine bağlı değildir. Klasik serif seçeneğinin çizimleri ve font kaynak bildirimi de pakettedir.

| Kontrol | Sonuç | Kanıt |
| --- | --- | --- |
| Üretim derlemesi | Geçti; Next.js 16.3.5, 36 statik sayfa | `verification/RC38/build.log` |
| TypeScript | Geçti | `verification/RC38/typecheck.log` |
| Lint | Geçti; sıfır uyarı sınırı | `verification/RC38/lint.log` |
| Sürüm ve kurucu hedefi | Paket, kilit dosyası, istemci, RC etiketi ve tek CMD aynı sürümde | `verification/RC38/release.log` |
| SVG, PNG ve ICO | 8 aile, 48 yazılı SVG sürümü; 19 ICO'da 16–256 px; eski dosya yolları geçerli | `verification/RC38/asset-audit.json` |
| Gerçek tarayıcıda logo seçimi | 8 logo × 2 tema × 3 görünüm modu: 48 kombinasyon geçti | `verification/RC38/brand-browser.log` |
| Eski tercihler | 10 eski kimlik eşlendi; ilk açılış geçişi, eski/yeni görünüm dosyaları, yeniden açılış ve boyut korunması geçti | Aynı tarayıcı kaydı |
| Hatalı ayar dosyası ve cihaz kaydı | Geçersiz logo yolu reddedildi; cihaz kaydı engellenince kullanıcıya bilgi verildi | Aynı tarayıcı kaydı |
| 46 dil | Bütün dil paketleri, sistem mesajları ve görünür metin kapsamı geçti; 46 dilde marka adı DENTAYA kaldı | `build.log`, `translations.log`, `brand-browser.log` |
| Mobil görünüm | 390 px genişlikte logo ızgarası ve sayfa taşmadı; görsel olarak incelendi | `brand-browser.log` |
| Windows simge akışı | İzinli logo listesi, ICO kopyası, kısayol oluşturma/güncelleme ve başka kuruluma ait kısayol koruması geçti | `verification/RC38/desktop-icon.log` |
| RC37 CAD ve diş görünümü kaynağı | 44 ilgili dosya RC37 arşiviyle bayt düzeyinde aynı | `asset-audit.json` |

## Kapsam ve ortam

Tarayıcı kontrolü gerçek Chromium 145 ile mevcut Ayarlar/Görünüm ekranında yapıldı. Veri bağlantısı ve masaüstü IPC çağrısı test verileriyle karşılandı; gerçek hasta kayıtlarına veya üretim veritabanına bağlanılmadı. Windows kısayol kontrollerinde Windows shell taklidi kullanıldı. Tarayıcı ekran görüntüleri yalnızca yerel görsel inceleme için tutuldu; bu kaynak paketine eklenmedi.

46 dilin her birinde 4.746 sabit arayüz metni bulunur. Bu sürüm yeni kaynak metin eklemez; marka adının büyük harfli yazımını sabitler. Çeviri kapsamı kontrolü, her dil için ana dil editörü onayı anlamına gelmez.

Bu ZIP kaynak paketidir. Windows kurucusu bu Linux ortamında üretilmedi veya Windows'ta çalıştırılmadı. `DENTAYA_GUNCELLE_DERLE.cmd`, Windows'ta `DentAYA-Setup-1.0.0-rc.38.exe` dosyasını üretir. Kullanım adımları `RC38_KULLANIM.md` içindedir.
