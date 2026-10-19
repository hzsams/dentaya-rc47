# DentAYA RC29 · kurulum ve yeni ayarlar

Bu paket **1.0.0-rc.29 kaynak kodudur**. Windows Setup dosyası bu ortamda üretilmedi.

1. ZIP dosyasını yeni bir klasöre çıkarın. `package.json` ve `DENTAYA_GUNCELLE_DERLE.cmd` aynı klasörde olmalı.
2. Çalışan DentAYA projenizdeki `.env.local` dosyasını bu klasöre kopyalayın. Anahtarları sohbet veya forumda paylaşmayın.
3. Node.js 22 veya üstü ve npm 11 veya üstü gerekir. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çift tıklayın. Bağımlılıklar yoksa kendisi kurar; ardından uygulamayı paketler.
4. İşlem tamamlandığında açılan klasörde **`dist-desktop\DentAYA-Setup-1.0.0-rc.29.exe`** dosyasını çalıştırın. Açık DentAYA pencerelerini önce kapatın.

PowerShell kullanmak isterseniz komutları ayrı satırlarda çalıştırın:

```powershell
npm.cmd ci
npm.cmd run desktop:dist
```

`npm.cmd`, PowerShell'in `npm.ps1` yürütme ilkesi hatasına takılmaz. Eski PowerShell sürümleri için `&&` gerekmez.

## Dil ve bölge

31 dil seçeneği bulunur: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Hollandaca, Lehçe, Romence, Rusça, Ukraynaca, Arapça, Çince, Japonca, İsveççe, Danca, Yunanca, Çekçe, Korece, Bulgarca, Hırvatça, Estonca, Fince, Macarca, İrlandaca, Letonca, Litvanca, Maltaca, Slovakça, Slovence. AB'nin 24 resmî dili bu listeye dahildir.

Ortak etiket çevirileri paketlidir. **Bu ZIP, 31 dilde tamamlanmış ve dil uzmanı tarafından kontrol edilmiş bütün arayüz çevirilerini içermez.** Tam kapsam için yerel dil paketi hazırlanır veya çevirmenin hazırladığı paket içe aktarılır.

1. Önce AYA ekranından yerel modeli kurun; aşağıdaki adımlara bakın.
2. **Ayarlar → Dil ve bölge** bölümünde hedef dili seçin.
3. **Tam arayüz çevirisi** bölümünden kurulu modeli seçip **Tam dil paketini hazırla / devam et** düğmesine basın.
4. Hazır metin sayısını izleyin. Bu sürümde 4.550 sabit kaynak metin bulunur. Hazırlama uzun sürebilir; hız ve çeviri kalitesi yerel modele bağlıdır. Süre tahmini verilmez.
5. Durdurursanız tamamlanan metinler saklanır. Aynı dili yeniden başlattığınızda eksik metinlerden devam eder. Tamamlanınca yeniden model çalıştırmadan çevrimdışı kullanılabilir.
6. Paket dışa aktarılıp düzeltilebilir; aynı dil ve kaynak sürümüne ait JSON dosyası içe aktarılır. Sayılar ve `{0}` gibi yer tutucular korunmalıdır. Yeni kaynak sürümü geldiğinde eksik yeni metinlerin hazırlanması gerekebilir.

Ekran başlıkları, butonlar, form etiketleri, açıklamalar, yer tutucular, erişilebilirlik etiketleri ve CAD araç ipuçları aynı sistemi kullanır. Masaüstü menüsü seçilen paketi kullanır. Hasta adları, kullanıcı içerikleri, diş numaraları, kontrollü form değerleri ve CAD koordinatları korunur. Hazırlama yalnız sabit kaynak metinlerini yerel motora verir; hasta kaydını, sohbeti veya forum içeriğini çeviri motoruna göndermez.

## Yerel AYA Core

AYA → **Bu bilgisayarda · API anahtarsız** sekmesi varsayılan çalışma yeridir.

1. AYA ekranındaki bağlantıdan Windows için Ollama'yı kurup çalıştırın.
2. **Motoru ve modelleri yenile** düğmesine basın.
3. Kurulu bir yerel metin modelini seçin veya ekrandaki Qwen3 4B indirme düğmesini kullanın. İlk model indirmesi internet ve disk alanı ister.
4. **Yerel yanıtı test et** düğmesini kullanın. Gerçek modelden yanıt gelince durum göstergesi değişir. Yanıtı **Durdur** ile kesebilirsiniz; soru girişe geri gelir.

Sohbet için API anahtarı, ücretli bulut bağlantısı veya DentAYA hesabı gerekmez. Yerel model motoru ve ağırlıkları gerekir. Bu sürümün AYA Core'u DentAYA'ya ait yazılım, belge araması ve tercih katmanıdır; temel dil modeli sıfırdan eğitilmiş yeni bir DentAYA modeli değildir.

**Uygulama rehberi · motorsuz belge araması** kurulum olmadan paketli kullanım belgelerini arar; üretken model sohbeti olarak etiketlenmez. Tam dil paketi hazırsa çevrilmiş belgelerde de arama yapılır.

Yanıt biçimi, çalışma rolü, çeşitlilik, yanıt uzunluğu, belge bağlamı, çalışma notu ve Enter davranışı ayarlanabilir. Not yalnız “Çalışma notunu yanıta dahil et” açıkken modele verilir. Geçmiş varsayılan olarak kapalıdır; açılırsa bu cihazda saklanır. Saklamayı kapatmak arşivi siler. Kaydedilmiş sohbetler şifreli kasa değildir.

Dil paketi hazırlanırken aynı yerel motor sohbet veya model indirmesi için kullanılmaz. Buluta otomatik geçiş yapılmaz. İsteğe bağlı bulut sekmesi ayrıca yapılandırılır.

## Ses ve hareket

**Ayarlar → Ses ve hareket** veya **Ctrl+, → Geçiş ve ses**:

- Seramik, ahşap, ipek, cam, kâğıt, keçe, su ve stüdyo: 8 ses dokusu.
- Seçim, araç değişimi, görünüm, fırça, kaydetme, hata ve AYA yanıtı: 7 ayrı ses düzeyi ve önizleme.
- Ana düzey, ton, doğal farklılıklar, CAD / tüm uygulama kapsamı ve fırça sesi.
- Geceyi aşabilen sessiz saatler; aynı başlangıç ve bitiş tüm günü sessize alır. Önizleme sessiz saatleri atlar.
- 5 hazır profil; ağır, dengeli, hızlı veya kapalı tempo; ayrı sayfa, panel ve diş / kamera geçişi anahtarları.

Sistem hareketi azalt tercihi önceliklidir. CAD araç girişine bekleme eklenmez. Arka plandaki veya odağı olmayan uygulama ses çalmaz.

## Doğrulama sınırı

Üretim web derlemesi, tür kontrolü, lint, CAD ve veritabanı akış testleri; yerel AYA / dil paketi ve tarayıcı etkileşim testleri için ayrıntılar `RC29_KONTROL_RAPORU.md` dosyasındadır. Bu ortamda gerçek Ollama modeli, Windows kurulum sihirbazı ve kullanıcının canlı veritabanı denenmedi. Yerel motor testleri simüle edilmiş yanıtlarla yapıldı; bu testler çeviri kalitesi veya modelin cevap doğruluğunu ölçmez.
