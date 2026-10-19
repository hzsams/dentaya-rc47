# DentAYA RC36 — Tek işlem pencereli CAD

RC36, RC35'in birleşik RC33/RC34 içeriğini koruyarak CAD çalışma alanını yeniler. Varsayılan **Adım adım** modunda geniş aşama çubuğu veya araç sekmeleri bulunmaz. Tek hareketli işlem penceresi, mevcut işin araçlarını ve parametrelerini gösterir. Yardımcı kamera, analiz ve uygulama ayarları kapalı menülerden açılır; nesne yöneticisi küçük bir simgeyle başlar.

## Çalışma sırası

| Adım | İşlem penceresi | Manuel araçlar |
| --- | --- | --- |
| 1 | Tarama verisi | Döndürme; ana kaynak seçimi |
| 2 | Preparasyon marjini | Döndürme ve marjin çizimi |
| 3 | İç yüzey | Döndürme, ölçüm ve mevcut uyum araçları |
| 4 | Anatomi | Döndürme; anatomi ve konum ayarları |
| 5 | Serbest şekillendirme | Ekle, çıkar, yumuşat, düzleştir ve döndür |
| 6 | Temas ve karşıt çene | Temas düzeltme, ölçüm; çok üyeli işte bağlantı |
| 7 | Kalınlık ve kontrol | Döndürme, ölçüm ve mevcut geometri kontrolü |
| 8 | Son kontrol | Döndürme; tek STL/onaya gönderme düğmesi |

**Geri / Sonraki** düğmeleri pencerenin altındadır. `Ctrl + Space` sonraki, `Ctrl + Backspace` önceki işi açar. Üstteki mevcut adım menüsü geçmiş işlemlere dönmeyi sağlar; ilerideki işlemler kilitlidir. İş tanımı ve yüklü çalışma taraması olmadan ilerleme, en az üç marjin noktası olmadan iç yüzeye geçiş engellenir. Sağ tık ve klavye araçları da mevcut işlemin kurallarına uyar.

Anatomi seçimi sırasında şekillendirme araçları görünmez. Bağlantı parametreleri yalnız çok üyeli işte **Bağlantı** seçildiğinde; temas düzeltme fırçasının değerleri ilgili araç seçilince açılır. Ayrıntılı fırça ve marjin parametreleri **Ayrıntılar** içindedir. İç yüzey ve anatomi ayar gruplarında aynı anda yalnız bir grup açık kalır.

3D alan korunur; adım değişimi tarama veya sahneyi yeniden kurmaz. **Kaydet**, mevcut alt adımı da proje ayarlarına kaydeder; yeniden açınca o işlemden devam edilir. Eski RC35 projeleri mevcut aşamalarının ilk alt işleminde açılır. Yerel kurtarma kayıtları alt adımı da korur. Son kontrolü açmak tasarımı gönderilmiş saymaz; onay durumu ancak STL gönderimi başarılı olursa değişir.

## Yardımcı kontroller

- Sol üstteki katman simgesi: üst/alt çene, restorasyon, taramalar, görünürlük yüzdeleri ve çalışma ünitesi.
- Alt ortadaki küçük çubuk: ekrana sığdırma, kamera açıları ve aşamaya uygun analiz görünümleri. Bir menü açılınca diğeri kapanır; `Esc` veya dışarı tıklamak menüyü kapatır.
- Üstteki **Ayarlar**: görünüm/ses, arayüz dili, kısayollar, araç kataloğu, panel konumu ve çalışma modu.
- **Uzman** modu yalnız Ayarlar menüsünden açıkça seçilir. Tüm araç gruplarını açar. **Adım adım** moda dönüş kaydedilen alt işlemin araçlarını geri getirir.

Renk paleti, 56 görünüm seçeneği ve 31 dil korunur. CAD için arayüz dili artık Ayarlar menüsündedir; sahnenin üzerinde ayrı bir dil kutusu bulunmaz. Tasarım işlemleri manuel ve deterministiktir; AYA ayrı yardımcı olarak kalır.

## Windows güncelleme

1. ZIP'i yeni klasöre çıkarın; `DentAYA_Production_RC36` klasörünü açın.
2. Çalışan projenizin `.env.local` dosyasını `package.json` yanına kopyalayın.
3. DentAYA'yı kapatıp `DENTAYA_GUNCELLE_DERLE.cmd` dosyasına çift tıklayın.
4. Derleme tamamlanınca `dist-desktop\DentAYA-Setup-1.0.0-rc.36.exe` dosyasını çalıştırın.

Yeni SQL gerekmez. Alt adım, mevcut `design_projects.settings.guided_task` alanına yazılır; yeni tablo veya kolon oluşturulmaz. Hasta/vaka verileri bu kaynak paketiyle taşınmaz veya sıfırlanmaz.

## Kontroller ve kapsam

`npm run verify` üretim derlemesini ve çekirdek kontrolleri kapsar. `verify:cad-guided-browser` gerçek WebGL sahnesinde sekiz işlemi, marjin çizimini, kilitli ileri geçişi, alt adım kaydını/yeniden açmayı ve kapalı yardımcı menüleri kontrol eder. `verify:cad-browser` mevcut şekillendirme, geri al/yinele, görünürlük, panel taşıma, dil/palet ve mobil kontrolleridir. `verify:appearance-browser` tek paleti ve görünüm aktarımını kontrol eder. Güncel raporlar `verification/RC36` içindedir; önceki sürüm raporları tarihsel kayıttır.

Bu güncelleme CAD arayüzü ve manuel iş akışını değiştirir. Yeni geometri motoru veya Exocad ile teknik eşdeğerlik iddiası içermez. Tarayıcı testlerinde veritabanı test verileriyle karşılanır. Hedef Windows kurucusu bu Linux ortamında üretilmedi veya çalıştırılmadı. RC33 başvuru/kanıt kapsamı `TUSEB_D_KAPSAM_VE_DOGRULAMA.md` dosyasındadır.
