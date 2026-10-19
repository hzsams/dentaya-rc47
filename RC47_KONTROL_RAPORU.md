# DentAYA RC47 kontrol raporu

Tarih: 19 Ekim 2026. Kaynak sürümü: `1.0.0-rc.47`, AYA Core: `0.5.0`.

Bu rapor RC46 üzerindeki AYA/CAD geliştirmelerinin bu Linux ortamındaki yeni kontrollerini anlatır. Eski RCxx raporları bu sonucun kanıtı olarak kullanılmadı. Paket tam kaynak/güncelleme adayıdır; Windows Setup EXE'si değildir.

## Kaynak ve değişiklikler

Dört ayrı ZIP aynı `DentAYA_Codex_Devri` kökünde birleştirildi. ZIP CRC kontrolleri ve başlangıçtaki `node scripts/verify-source-integrity.mjs` geçti: 1261 dosyanın boyutu ve SHA-256 değeri devir manifestiyle eşleşti. AGENTS.md, CODEX_BASLANGIC_PROMPTU.md ve CODEX_DEVIR_NOTLARI.md tamamen okundu. Web sitesi deposu bu çalışmada değiştirilmedi.

- Normal sohbet hazır yerel modele öncelik verir. Çevrimdışı rehber ve güvenlik yanıtları korunur; motor etiketleri ayrıdır.
- Model planı bağımsız tip/uzunluk/izin listesi denetiminden geçer. Genel sohbette eylemler boş olmalıdır. Model kodu veya rastgele geometri parametresi çalıştırılmaz.
- Hedef, kararlar ve açık sorular çalışma belleğinde taşınır. Token bütçesi ilk hedefi, yakın konuşmayı ve güncel CAD kanıtlarını korur. Notlar/belgeler/bellek sistem mesajına gömülmez; ayrı veri mesajıdır.
- CAD önerileri güncel proje/kaynak/ünite ve durum tokenına bağlıdır. Uygula tıklaması sırasında tekrar denetlenir. Çift tıklama, eski öneri ve geciken model sonucu engellenir.
- Undo/redo gerçek sonuç döndürür. Model iptali soruyu yeniden göndermeden taslağa döndürür. Panel kapanıp yeniden açılırken tamamlanan kayıt sonucu doğru oturuma aktarılır. Kayıt sürerken yeni model isteği engellenir.
- Güncel deterministik analiz raporu kanıt olarak kullanılır. Antagonist yokken temas ölçümleri aktarılmaz; kaynak mesafesi ve kabuk offset tahmini gerçek duvar kalınlığı gibi sunulmaz.
- Uygulama sürümü, lockfile kök sürümleri, release.ts, Supabase istemci etiketi, CMD ve güncel kurulum belgeleri RC47 olarak eşlendi. Bağımlılık sürümleri/çözümlemeleri ve npm integrity değerleri korunur.

## Bu çalıştırmada doğrulama

Ortam: Linux x64, Node 24.19.0, npm 11.9.0, kurulu Chromium ve yazılım WebGL. `npm ci` 626 paketi kilit dosyasından kurdu; hash/TLS doğrulaması kapatılmadı.

| Kontrol | Sonuç ve kapsam |
| --- | --- |
| `npm run verify` | Geçti (exit 0): tüm zincir; güvenlik/dil/AYA/CAD/migration/PGlite kontrolleri, sıfır uyarıyla lint, TypeScript ve 38 sayfalı standalone Next üretim derlemesi. |
| `npm run verify:aya-conversation-browser` | Geçti: model önceliği, yeni ifadeler, takip/bellek, geçmiş tercihi, hata/bozuk plan/iptal, geç yanıt ve mobil arayüz. Model köprüsü mock. |
| `npm run verify:cad-daily-browser` | Geçti: gerçek editör/WebGL ve sentetik implant kaynakları; koleye yerleşim, şekillendirme, AYA undo/manual redo, ünite/mesh kalıcılığı, kayıt/çıkış, offline kurtarma, checkpoint ve çakışma reddi. Supabase HTTP ve AYA köprüsü test fixture'ıdır. |
| Üretim standalone HTTP kontrolü | Geçti: ana sayfa, AYA ve CAD için HTTP 200; 27 statik dosya başarıyla sunuldu. Gerçek backend/model çağrısı yapılmadı. |
| Yeni agent ve dispatcher testleri | Geçti: hatalı tipler/uzunluklar, yasak alan/araç, CAD olmayan bağlam, bellek/token sınırı, eski kapsam/geometri, çift tıklama, callback başarısızlığı ve yeniden deneme. |
| CAD daily geometri birimi | Geçti: 144 yerleşim, farklı konum/eğim/eksenler, kapalı gövde ve sıkıştırılmış sahne geri yükleme. |
| Gerçek b9380 grameri | 8/8 geçti; mock ve model çıkarımı değildir. Resmî Linux CPU kütüphaneleriyle şema derleme/kabul/red kontrolüdür. |
| Windows paketleme birimleri | 25/25 geçti; süreç/dosya durumları simüle edilir, Windows EXE üretilmedi. |
| Son kaynak paketi bütünlüğü | Manifest, ZIP CRC ve arşivdeki bütün kaynak dosyalarının boyut/SHA-256 değerleri denetlendi; temiz çıkarılmış pakette Node bütünlük kontrolü geçti. |

Gerçek b9380 grameri, `answer.maxLength:12000` kuralının motorun tekrar sınırını aştığını ortaya çıkardı. Taşıma şemasındaki bu kural çıkarıldı; uygulama ayrıştırıcısı 12000 karakter sınırını korur, üretim `max_tokens` ile sınırlıdır. Genel sohbette yalnız `actions:[]`, CAD'de izinli araçlar ve alan tipleri gerçek gramer tarafından da denetlendi.

## Tamamlanmayan ve dış erişim isteyen kontroller

- **Gerçek Qwen model çıkarımı ve anlamsal kalite doğrulanmadı.** Sabit 1.7B Q8_0 modelinin indirilmesi Hugging Face adresine proxy CONNECT 403 ile engellendi. Modelin çalıştığı, hedef/kararları doğru anladığı veya CAD yorum kalitesi kanıtlanmış sayılmaz. Mock testleri yalnız uygulama sözleşmesini/entegrasyonu kanıtlar.
- İndirme için `huggingface.co` ve `*.hf.co` alanları mevcut ağ önayarları korunarak ortam ayar taslağına eklendi. Taslak kaydı çalışma ortamına erişim uygulamaz. Bu kontrolü açmak için ortam ayarlarında taslağı gözden geçirip kaydedin ve ortamı yayımlayın; ardından model indirmesi ve native test yeniden çalıştırılmalıdır.
- **Windows üzerinde gerçek Setup üretimi, kurulum ve Windows native çıkarım yapılmadı.** Tek CMD ve RC45 Onarım 2 paketleme önlemleri korunur; mevcut Linux kaynak derlemesi Windows dağıtım doğrulaması sayılmaz.
- Gerçek Supabase projesi veya kullanıcı verileriyle uçtan uca kayıt yapılmadı. Şema/iş akışı testleri PGlite; tarayıcı kayıtları intercept edilen fixture kullanır. Yeni migration eklenmedi.
- Mevcut 46 dil paketi korunur ve kontrolleri çalışır; yeni asistan metinleri TR/EN ve diğer dillerde İngilizce fallback kullanır. 46 dilde yeni metinlerin editöryel doğrulaması iddia edilmez.
- Klinik doğrulama, üretim onayı, temel model eğitimi veya kendi kendine model ağırlığı güncelleme bu teslimatın sonucu değildir.

## Tekrar çalıştırma

`npm ci` ardından `npm run verify`. Tarayıcı testlerini ayrı ayrı ve sırayla çalıştırın: `npm run verify:aya-conversation-browser`, `npm run verify:cad-daily-browser`. Harici Playwright/Chromium yolu README'de açıklanır.

Gerçek model hazırsa: `npm run verify:aya-native -- --engine /harici/llama-server --model /harici/Qwen3-1.7B-Q8_0.gguf --report /harici/native-results.json`. Betik sabit model SHA-256 değerini ve motor sürümünü doğrular; dört gerçek yerel senaryo çalıştırır. Yanıtların anlamsal doğruluğu ayrıca incelenmelidir.

Gramer testi: `npm run verify:aya-native-grammar -- --engine-dir /harici/llama-b9380 --json-header /harici/json.hpp --report /harici/grammar-report.json`. Betik resmî b9380 kütüphanelerinin ve başlığın sabit hash değerlerini doğrular; model gerektirmez.

İlk toplu kontrol, eşzamanlı tarayıcı fixture route'u dil kontrolüne girdiği için kesildi. Fixture temizlendikten sonra toplu kontrol tek başına yeniden başlatıldı; assertion kapatılmadı. İlk CAD tarayıcı denemelerinde sıcak kaynak yenileme ve fixture zamanlama/kaynak yönü sorunları giderildi; son geçen koşuda mevcut kayıt/çıkış/kurtarma assertion'ları korundu.

Son tam verify koşusu exit 0 ile tamamlandı. Önceki kesilmelerde sürüm katalog dışa aktarımı RC47 dosyasına taşındı ve yeni testteki kullanılmayan import uyarısı giderildi; kontrol/assertion gevşetilmedi. Güncel test kanıtları `verification/RC47/` altındadır.

Pakete node_modules, .next, kişisel .env dosyaları, model ağırlıkları, geçici tarayıcı route’ları, tsbuildinfo ve eski çalışma logları dahil edilmedi. `public/training-scans` kaynak paketinin mevcut ürün varlıklarıdır; korundu.
