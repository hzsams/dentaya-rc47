# DentAYA RC62 kontrol raporu

Sürüm `1.0.0-rc.62`, AYA Core `0.18.0`. Taban: RC61 `4b6a36047410eeae1ba5057b6a7a69604f662909`. Tarih: 28 Ekim 2026.

Bu belge RC62 geliştirmesi sırasında hazırlanır; sürüm etiketi ve nihai doğrulama tamamlanana kadar teslim edilmiş paket sayılmaz. Kaynak kontrolleri, sentetik tarayıcı, gerçek model çıkarımı, Windows kurucu ve canlı kurum kabulü ayrı kanıttır.

## Uygulananlar

- Model kabulü normal sohbet, çalışma belleği, not ve CAD yürütücüsünden yalıtıldı. Dokuz sentetik çağrı, ilerleme, iptal, ham yanıt inceleme ve JSON dışa aktarımı eklendi. Sınırlı sinyaller anlamsal kalite sertifikası veya puanı olarak sunulmaz.
- İptal sonrası hem eski yanıt hem native iptal sonucu bitene kadar motor sahipliği korunur. Kabul, normal gönderim, bellek düzenleme ve kurulum işlemleri çakışamaz.
- Aynı sekmede sohbet çalışma kopyası ve taslak korunur. Geçmiş kapalıysa kalıcı konuşma yazılmaz; açıkken sessionStorage yalnız kayıtlı oturumun taslak/kesinti bilgisini tutar. Silinmiş veya daha yeni kayıt eski çalışma kopyasıyla ezilmez.
- Yerel misafir Ayarlar, gerçek indirme ilerlemesi, klavye sekmeleri/odak dönüşü iyileştirildi. CAD'e ortak web başlığı eklenmedi.
- Bekleyen vaka ve randevu kayıtları, değiştirilmiş randevunun kapanma uyarısı, rota değişiminden sonra gelen eski sonuçlar ve IME Enter davranışı düzeltildi.
- Windows paketlemesi npm.cmd başlatma, PE mimarisi, .env dışlama ve byte koruyan Git checkout ile güçlendirildi. Gerçek NSIS içeriği, ASAR ve Next dosyaları ile çıkarılmış Electron ekranlarını doğrulayan CI eklendi. Windows runner üzerinde görülen kısa TEMP yolu, file URL ve çeviri tarama yolu farkları düzeltildi; ilgili doğrulamalar korunarak gerçek Windows ön kontrolü geçti.

## Gerçek model değerlendirmesi

Önceki ağ engeli Windows CI üzerinden aşıldı; resmî sabit hashli modelle gerçek çıkarım kayıtları alındı. İlk 1.7B ve kontrollü 4B denemelerinde kötü/ilgisiz yanıtlar ve hedefi temizleme hatası gözlendi. Bunlar başarılı model kabulü sayılmaz. Modelin önerdiği üretim ayarları ve alan bazlı bellek sözleşmesi ayrı kontrollü deneylerle incelenmektedir. Eski Qwen3 4B ve Instruct-2507 adayları da reddedildi: bazıları negatif Türkçe isteği ters yorumladı, hedef/üniteyi kaydetmedi veya kayıt/ölçüm kanıtını göz ardı etti. En sade doğrudan model çağrılarında aynı dil hatasının görülmesi AYA şablonu ile model yeteneğini ayırdı. Yeni model ve değeri işlemin yanında taşıyan bellek sözleşmesi ayrıca sınanıyor. Nihai kaynakta kullanılan model/ayar ve sonuçlar doğrulama bittikten sonra bu bölümde kaydedilir.

## Tamamlanan Windows ön kontrolü

[Gerçek Windows çalışması 40673513656](https://github.com/hzsams/dentaya-rc47/actions/runs/40673513656), `61ee56824704c8937fbace10e77947e30d96653a` tanı kaynağını sınadı; ürün tabanı `4588013` ve Windows taşınabilirlik düzeltmeleridir. Tam verify, üretim derlemesi, NSIS paketlemesi, kurucudan gerçek yükü çıkarma/kaynak hash karşılaştırması ve çıkarılan Electron ile üç misafir ekranı/IPC kontrolü geçti. Renderer hatası: 0. Kurucu: 279.376.003 bayt, SHA-256 `22b9986ee83304da0843602185a7c5c8dd0f8a1973a6f1cfa152d4011ed81e78`.

Bu tanı kurucusu yayımlanmadı ve native model işi bu dalda çalıştırılmadı. Sonraki CAD/model değişiklikleri için son etiketin yeniden derlenmesi gerekir. Bu sonuç son RC62 kurucusunun veya modelinin kabulü değildir. Kanıt: [Windows receipt](verification/RC62/installer-preflight/windows-build-receipt.json), [gerçek Electron smoke](verification/RC62/installer-preflight/desktop-smoke-report.json), [kapsam](verification/RC62/installer-preflight/SCOPE.md).

## Devir anındaki güncel kaynak doğrulaması

`a8e34b4e3eb5614e7120b03051fb14bd005ae467` çalışma kodunda yeni CAD kayıt-hata/canlı host bilgisi düzeltmesi dahil tam `npm run verify` **117,688 saniyede geçti** (28 Ekim 2026). Bu zincir lint, TypeScript, Node/CAD/kernel/backend fixture ve Next üretim derlemesini kapsar. Güncel state ve gerçek WebGL CAD daily tarayıcıları da geçti; gerçek sıradan kayıt hatası → aynı sahipte başarılı ACK ve kayıt/çıkış/kurtarma doğrulandı. Sunucu/model taşıması sentetiktir. Kanıtlar `verification/RC62/current-source` altındadır.

Qwen3.5 4B deneyi gerçek dokuz sözleşmeyi geçse de insan incelemesinde reddedildi; kodu ana ürüne alınmadı. `devir/2026-10-28/NATIVE_HANDOFF.md` ve `DEVIR_DURUMU.json` son kompakt aday ile bekleyen koşunun farkını kaydeder. **Bu devir son RC62 yayını değildir.** Kaynak manifesti development-handoff statüsünde mühürlenir; son Windows kurucusu, model semantik ve canlı kurum/klinik kabulü açık kalır.

## Önceki çalışma kayıtları

Güncel çalışma kayıtları `/workspace/dentaya-rc62-validation` altında tutulmaktadır. Nihai kaynak kanıtları `verification/RC62` içine mühürlenecektir. Önceki RC61 raporları RC62'nin testi değildir. Tam verify, gerekli tarayıcılar, gerçek modelin ham çıktıları ve Windows derlemesinin gerçek receipt sonuçları tamamlanmadan bu alanlar geçti olarak işaretlenmez.

## Sınırlar

16 GB RAM bilgisi esas alınmıştır; kullanıcının bilgisayarındaki GPU/hız henüz ölçülmedi. Klinik/üretim onayı ve canlı kurum backend kabulü yapılmadı. Yerel çok pencere revizyon denetimi iyimserdir, atomik kilit değildir. Kayıtlı olmayan yeni sohbet taslağı sayfa yenilemesinde kurtarılmaz. İçerik sayıları 500 bilgi/60 kaynak, 1008 yardımcı kayıt, 120 hacim etkili SVG logo, beş oyun ve 72 görünümdür. Yeni temel model eğitilmedi; genel doğruluk veya hatasız ürün iddiası yoktur.

Son model tanısı: 40730934136 / 9dc9956 tamamlandı; dokuz gerçek isteğin sekizi parser tarafından kabul edildi. CAD planlayıcısının kendi gözlemlerini kullanıcı karar belleğine eklemesi 5+2 taşmasına yol açtı; sıkı kapasite kapısı doğru reddetti. Bellek/plan ayrımı sonraki ana iştir; limit artırma/eski karar atma çözüm değildir. 2760095 kompakt kodu henüz native doğrulanmadı. Ayrıntılar tam devir ve NATIVE_HANDOFF.md içindedir.
