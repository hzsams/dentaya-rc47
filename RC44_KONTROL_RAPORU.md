# RC44 kontrol raporu

Sürüm: **1.0.0-rc.44**. Kontrol tarihi: **15 Ekim 2026**. Bu paket RC43 tam kaynak arşivinin üzerine uygulanmıştır; RC42 ve RC43 özelliklerini birlikte içerir.

## Doğrulananlar

| Alan | Sonuç ve kapsam |
| --- | --- |
| Genel kontrol | `npm run verify`: 39 aşama başarılı; lint, TypeScript, üretim derlemesi ve mevcut CAD/veritabanı kontrolleri dahil. Son küçük değişiklikler ayrıca yeniden kontrol edildi. |
| 200 bilgi | 200 farklı Türkçe ve 200 farklı İngilizce cümle; 25 resmî kaynak grubu. Cümle uzunluğu, tek cümle yapısı, kaynak eşleşmesi ve üç tam turda tekrar/bitiş-başlangıç kontrolü geçti. |
| Oyun mekanikleri | 768 Kusp Kilidi bulmacası; 1.024 eşleştirme destesi ve 1.024 çözülebilir Oluk Rotası düzeni kontrol edildi. Ters hamleler, ipucu çözümü ve değişmez oyun durumu geçti. |
| Oyun tarayıcı kontrolü | Gerçek kart açma/eşleştirme, üçüncü kartın bekleme sırasında engellenmesi, altı çiftin tamamlanması, rota çözümü, çevrimdışı oynama, rekorun yeniden yüklenmesi, sekme ve klavye kontrolleri geçti. |
| Okuma ekranı | Üretim standalone sunucusunda aynı cümle, toplam 10 saniyede kapanış, erken geçiş, odak geri dönüşü, uzun yüklemeye ek bekleme eklenmemesi ve oyunun açık kalması geçti. Mobil 390×844 sınırları kontrol edildi. |
| AYA Core 0.3 | Aritmetik, yüzde, metre/cm/mm/mikron dönüşümleri; hatalı girişin reddi, kaynaklı not araması ve takip soruları, teslim şablonu, CAD durum listesi ve kayıt sürerken işlem engeli geçti. |
| AYA ekranı | Ölçü/yüzde yanıtı, pano kopyalama, sohbet JSON dışa aktarma, geçmiş kapalıyken yeniden açılışta sohbetin saklanmaması ve bilgi defteri kalıcılığı geçti. Yerel motor kurulum/akış/iptal testleri taklit edilmiş motorla çalıştırıldı. |
| CAD renkleri | Gerçek WebGL sahnesinde altı grup; özel çalışma çenesi ve restorasyon rengi, kayıt yükü ve yeniden açılışta aynı renkler doğrulandı. Teknik varsayılan, görünürlük yüzdesi, tümünü gizle/göster ve kayıtlı kapanış geçti. |
| CAD iş akışı | Gerçek eğitim taramasında kole çizimi, koleye yerleşme, sekiz yönlendirilmiş görev, ön koşullar, şekillendirme paneli, geciken otomatik kayıt yanıtı ve kayıttan sonra aynı göreve dönüş geçti. AYA canlı kontrol listesi ve ölçü çevirme editörde doğrulandı. |
| Eski formlar ve kütüphane | RC37 görünümü ve CAD oluşturucusu ile birebir karşılaştırma; 144 mesh kontrolü, tek/kapalı gövde, STL/OBJ içe aktarma, geometri dönüşü, yerel kalıcılık ve kütüphane silinse de projedeki kopyanın korunması geçti. İptal edilen 24 aile geri getirilmedi. |
| Dil ve görünüm | Mevcut 46 dilin paket ve ekran kontrolleri geçti. Yeni bilgi/oyun/araç metinleri TR/EN; diğer dillerde bu alanlar İngilizce. |

Arayüz görünüm testinde **68 seçenek**, dört koleksiyon kartı, kaydetme, yeniden açılış, özel renk/sıfırlama, eski/yeni görünüm dosyası içe aktarma ve 46 dilde mobil sınırlar geçti.
İmplant senaryosunda gerçek editör/WebGL üzerinden yerel koleye yerleşme, gizli/sıfır opaklıklı dişin görünmesi, şekillendirilmiş tam geometrinin iki ünite arasında korunması ve yeniden açılması geçti. **Kaydet ve çık**, sunucu kayıt onayını bekledi; kayıt sırasında arka plan düzenlemesi engellendi. Bağlantı hatasında yerel kurtarma, yayınlama sonrası yeniden kayıt ve eşzamanlı kayıt çakışmasının reddi de geçti.
Son düzenlemelerden sonra lint (0 uyarı), TypeScript, sistem çevirileri, sürüm eşleşmesi, 200 bilgi/oyun/AYA araç kontrolleri, yerel motor ve CAD günlük kullanım çekirdek testleri yeniden geçti. **Next.js 16.3.8 üretim derlemesi başarılı.**

Tarayıcı kontrolleri Playwright ve Chromium ile, WebGL yazılım çizicisi kullanılarak yapıldı. CAD kayıt API'leri test verileriyle karşılandı; gerçek hasta veya üretim hesabı kullanılmadı. Ana çalışma ortamı Node.js 24.19.0 ve npm 11.9.0 idi.

## Bağımlılıklar ve paket

Next.js **16.3.8**, fflate **0.8.3**, sharp **0.35.5**, source-map-js **1.2.2**, eslint-config-next **16.3.8**, electron-builder **26.15.3** ve kilit dosyasındaki tar **7.5.22** kullanılır. Güncelleme sonrası `npm audit --omit=dev` sonucu **0 açık**; tüm geliştirme bağımlılıkları dahil sonuç **13 bulgu: 5 yüksek, 8 orta, 0 kritik**. Bunlar geliştirme araç zincirinde kalmıştır. Zorlayıcı toplu düzeltme veya Next sürümünü düşüren otomatik öneri uygulanmadı. Bu sayı bir güvenlik sertifikası değildir ve yeni bildirimlerle değişebilir.

Windows yardımcısı kaynakları her çalıştırmada `%LOCALAPPDATA%\DentAYA\Builds\rc44-…` altında yeni bir klasöre kopyalar; OneDrive içindeki `.next` ve `node_modules` taşınmaz. Paket, kilit dosyası, sürüm etiketi, istemci tanımı ve beklenen EXE adı eşleşir. Tek CMD giriş noktası vardır. Yeni veritabanı migration'ı gerekmez.

## Bu kontrolün sınırları

Bu arşiv **tam kaynak paketidir**; hazır Windows EXE'si içermez. Windows üzerinde kurulum, yükseltme ve kaldırma bu ortamda çalıştırılmadı. Setup dosyası kullanıcı bilgisayarında CMD ile üretilir.

AYA Core 0.3 bize ait çalışma katmanıdır; sıfırdan eğitilmiş bir temel model değildir. llama.cpp / Qwen3 yerel model akışı korunmuştur; RC44'te doğal dil modelinin doğruluğu veya klinik yanıt kalitesi yeniden ölçülmedi. CAD kontrol listesi sahne/kayıt metadatasını kullanır; geometriyi kendiliğinden değiştirmez, klinik uygunluk veya üretim onayı vermez. Kayıtlı çene kapanışı tam dinamik artikülatör doğrulaması değildir.
