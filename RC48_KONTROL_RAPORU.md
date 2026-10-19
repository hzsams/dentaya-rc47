# RC48 kontrol raporu

Sürüm: `1.0.0-rc.48`; AYA Core: `0.6.0`. Tarih: 19 Ekim 2026. Bu rapor güncel kaynak değişikliğinin kapsamını belirtir; önceki RC raporlarının sonuçları yeni sürümün doğrulaması sayılmaz.

## Kullanıcı talebinin uygulanışı

“AI based'liği kaldır” açıklaması, yapay biçimde üretilmiş görünen tasarım ve kullanım karmaşasını giderme isteği olarak uygulandı. AYA kaldırılmadı. Yerel model hazırsa normal konuşmalarda öncelikli kalır. Core çevrimdışı rehberdir; manuel CAD ve mevcut tipli CAD araçları deterministik kalır.

- AYA: sohbet ve mesaj alanı önce gelir. Motor, bellek/notlar, kütüphane, geçmiş ve tercihler tek isteğe bağlı paneldedir. Hedef/karar/açık sorular düzenlenebilir; desteklenmeyen serbest dil yeteneği Core'a atfedilmez. İptal ve hatada soru korunur; geç gelen sonuç önceki isteği veya belleği geri yazamaz.
- CAD: vaka değişimi önce başarılı kaydı bekler. Hedef vaka okunamazsa eski kayıt bağlamına dönülür; yükleme sırasında düzenleme engellenir. Antagonist olmadan temas haritası açılmaz. Kaydetme, kaydedilmemiş ve kaydedilmiş durumları ayrıdır.
- Ortak kabuk: modülün başlığı tekrarlanmaz, gerçek içerik kişisel kontrol listesinden önce gelir. Teknik kontrol menüsü gerektiğinde açılır. Hızlı navigasyonda tek sahip, yerel modal, ok tuşları, Enter, Escape ve rota değişimi denetimleri vardır. Eksik veya bozuk kurum bağlantısı yerel araçları çökertmez.
- Finans: eksik veri sıfır tutar gibi gösterilmez; güncel olmayan veri üzerinde kayıt kapatılır. Sürüm/yetki sonucu, kuruş, para birimi, ödeme durumu ve çift gönderim kontrolleri eklendi. Taslak başarısız yazmada korunur.
- Mesajlar: en yeni 100 kayıt ve önceki sayfalar gelir. Geç gelen başka sohbet verisi ekranı değiştiremez. Taslak ve tekrar kimliği alıcıya özeldir; sonuç doğrulanmadan taslak silinmez.
- Randevu/ekip/lojistik/operasyon: tarih/saat, geçersiz sonuç, işlem kilidi, eşzamanlı değişiklik ve eski ağ sonucu kontrolleri güçlendirildi. Masaüstünde davet koduyla katılım eklendi.
- Yükleme: ortak deneyimin toplam bütçesi 5 saniyedir; ardışık aşamalar süreyi sıfırlamaz. Gerçek istek uzuyorsa modülde küçük bekleme durumu kalır. Zaman aşımı veriyi veya kaydı başarılı saymaz.
- Marka: 18 özgün amblem; 126 SVG biçimi, PNG ve yedi boyutlu Windows ICO. Kabartma, yüzey/ışık ve DENTAYA harf konturları; açık/koyu/tek renk/yalnız simge/yazı biçimleri. Atelier görseli marka ayarlarına entegre edildi.
- Yeni metinlerde Türkçe ve açık İngilizce fallback kullanılır. Mevcut 45 dil paketi korunur; yeni metinlerin 46 dilde insan çevirisinin tamamlandığı iddia edilmez.

## Bilgi hedefi

Üründe 220 gerçek TR/EN kısa bilgi kartı ve 28 kaynak grubu vardır. Önceki 200 karta, sabit commit/lisans/pasaj/SHA-256 ile izlenen 20 kart eklendi. AYA'nın ayrı çevrimdışı soru kataloğu 1008 kayıttır; bunlar 30.000 bilgi kartı diye sayılmaz.

30.000 gerçek içerik hedefi tamamlanmadı: 29.780 kart eksik. İthal şeması, kaynak/lisans/tekrar kontrolü ve 30.000 sentetik kayıtlık kapasite testi hazırdır. Sentetik test verileri ürüne eklenmez. Aday açık veri kümelerinin içerik ve lisans incelemesi [DENTAL_BILGI_KATALOGU_RAPORU.md](DENTAL_BILGI_KATALOGU_RAPORU.md) içindedir.

## Doğrulama

`npm run verify` RC48 kodunda exit 0 ile tamamlandı. Zincir sıfır uyarılı ESLint, TypeScript, 38 sayfalık üretim derlemesi, deterministik CAD/şekillendirme/yerleşim/kütüphane kontrolleri, AYA güvenlik/bellek/katalog kontrolleri ve 27 gerçek migration üzerinde PGlite iş akışını içerir.

Ayrı tarayıcı kontrollerinde marka (18×2×3 görünüm ve 46 dil), AYA sohbeti, geniş arayüz (46 dil, kayıt tercihleri, notlar, iptal/dışa aktarma, oyunlar), ortak kabuk (odak/klavye/sahiplik devri/gerçek hasta ve randevu sayfaları), finans ve mesajlaşma geçti. Finans yenilemesi ve ilk sohbet yüklemesi sırasındaki yeni yarış durumu assertion'ları da geçti; mesaj yazma alanı 1366×768, 1440×1000 ve 390×844 ekranlarda denetlendi.

Ayrıntılı bileşen kanıtları `verification/professional/` altındadır. Tam CAD tarayıcı koşusu gerçek WebGL ile geçti: implant koleye yerleştirme, bağımsız ünite geometrisi, şekillendirme, gerçek undo/redo, iki vaka arasında kayıt bekleme, hedef okuma hatasında eski vakaya dönüş, yayınlama sonrası kayıt, kaydet/çık, zorlanmış kayıt hatası ve kalıcı yerel kurtarma denetlendi. Model ve backend köprüleri sentetik fixture kullanır.

Son görsel kontrolde CAD satırlarının 20px ikon seçicisinden etkilenmesi ve sol menü alt bağlantısının dil seçicinin altında kalması düzeltildi. CAD metin alanı iki çözünürlükte 287px olarak ve çakışmasız doğrulandı. Son kaynakta toplu `npm run verify` yeniden exit 0 ile geçti. Üretim standalone tarayıcısında 5000ms ortak süre, hızlı/yavaş/ardışık/gezinme senaryolarında doğrulandı. Gerçek duvar saati gözlemleri sırasıyla 5346 / 5475 / 5279 / 5369 ms; test, tarayıcı planlaması ve gözlem için 1200ms tolerans kullanır. Yeni modülün kendi route yüklemesi de aynı son süreyi paylaşır; eski isteğin tamamlanması ek pencere açmaz. İstek uzarken gerçek veri/kayıt engeli korunur.

Çalıştırılan komutlar ve sonuçlar `verification/RC48/results.json`; tam günlükler ve üretim AYA/CAD/mesaj ekranları aynı klasördedir. Paket dosyaları `PAKET_BUTUNLUK.json` ile denetlenir; `node scripts/verify-source-integrity.mjs` komutu kaynak ZIP çıkarıldıktan sonra da çalışır.

| Modül/kapsam | Bu sürümdeki doğrulama | Kalan kabul işi |
| --- | --- | --- |
| AYA / Core / çalışma belleği | Birimler, katalog, ana sohbet ve CAD köprüsü tarayıcı mock'ları | Gerçek kurulu model çıkarımı ve dil/hız değerlendirmesi |
| CAD / form kütüphanesi | Kernel, yerleşim, mesh roundtrip, şekillendirme, geri alma, kütüphane | Gerçek taramalar, üretim hassasiyeti ve Windows/donanım |
| Finans / mesajlar | Gerçek route bileşenleri, sentetik HTTP, PGlite ve yarış durumları | Canlı kurum ve çok kullanıcılı kabul |
| Randevu / ekip / davet / lojistik / operasyon | Yeni doğrulama birimleri, tür/lint, gerçek şema/rol/iş akışı kontrolleri; randevu kabuğu tarayıcı kontrolü | Canlı davet, eşzamanlı randevu, GPS/harita ve kurum akışı |
| Hasta / vaka / topluluk | Doğrulama/iş akışı/RLS kontrolleri; hasta sayfası kabuk tarayıcısı | Gerçek veri, erişim ve kullanıcı kabulü |
| Tarama / eğitim / dijital model / bildirim / diğer merkez ekranları | Mevcut kodun toplu kontrolleri, tür/lint/üretim derlemesi; ortak görünüm uygulanır | Her ekranın gerçek kurum verileriyle ayrıntılı manuel kabulü |
| Marka / görünüm / mini oyunlar | Gerçek tarayıcı, dil/tema/kalıcılık ve varlık testleri | Gerçek Windows masaüstü kısayolu |

Bütün modüllerin üretim/klinik kabulünün tamamlandığı iddia edilmez.

## Açık sınırlar

- Bu teslim kaynak güncellemesidir. Bu Linux ortamında gerçek Windows Setup oluşturma/kurma/çalıştırma yapılmadı. Paketleme ve Windows kabuğu birim testleri gerçek Windows denemesinin yerine geçmez.
- Yerel model köprüsü testlerde mock kullanır. Gerçek GGUF model çıkarımının dil kalitesi, hızı ve donanım uyumluluğu bu sürümde doğrulanmadı. Kurulum/model hazır olmadan Core'un bilinmeyen her yeni cümleyi anlayacağı iddia edilmez.
- Finans/mesaj tarayıcı testleri sentetik HTTP yanıtları kullanır. Veritabanı testleri PGlite ve gerçek migration dosyalarını kullanır; canlı kurum Supabase bağlantısı, e-posta, kurye GPS/harita ve çok kullanıcılı uçtan uca üretim doğrulaması değildir.
- Farklı istemcilerin aynı anda eklediği randevu çakışmalarını kesin engelleyen veritabanı kısıtı henüz yoktur. Mevcut istemci çakışma uyarısı bu garantiyi vermez.
- Finans ve mesaj taslakları oturum belleğinde korunur; CAD'deki gibi çökme sonrası kalıcı kurtarma değildir.
- Sentetik CAD sahne/mesh testleri klinik uygunluk, üretim hassasiyeti veya düzenleyici onay sayılmaz. Gerçek taramalar, donanım ve kurum akışlarıyla kabul doğrulaması hâlâ gerekir.

Üretim web sitesine dağıtım yapılmadı. Model ağırlıkları, `.env.local`, sırlar, `node_modules`, `.next` ve geçici tarayıcı sayfaları teslimata girmez.
