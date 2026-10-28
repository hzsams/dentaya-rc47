# DentAYA RC62 kontrol raporu

Sürüm `1.0.0-rc.62`, AYA Core `0.18.0`. Taban: RC61 `4b6a36047410eeae1ba5057b6a7a69604f662909`. Tarih: 28 Ekim 2026.

Bu belge RC62 geliştirmesi sırasında hazırlanır; sürüm etiketi ve nihai doğrulama tamamlanana kadar teslim edilmiş paket sayılmaz. Kaynak kontrolleri, sentetik tarayıcı, gerçek model çıkarımı, Windows kurucu ve canlı kurum kabulü ayrı kanıttır.

## Uygulananlar

- Model kabulü normal sohbet, çalışma belleği, not ve CAD yürütücüsünden yalıtıldı. Dokuz sentetik çağrı, ilerleme, iptal, ham yanıt inceleme ve JSON dışa aktarımı eklendi. Sınırlı sinyaller anlamsal kalite sertifikası veya puanı olarak sunulmaz.
- İptal sonrası hem eski yanıt hem native iptal sonucu bitene kadar motor sahipliği korunur. Kabul, normal gönderim, bellek düzenleme ve kurulum işlemleri çakışamaz.
- Aynı sekmede sohbet çalışma kopyası ve taslak korunur. Geçmiş kapalıysa kalıcı konuşma yazılmaz; açıkken sessionStorage yalnız kayıtlı oturumun taslak/kesinti bilgisini tutar. Silinmiş veya daha yeni kayıt eski çalışma kopyasıyla ezilmez.
- Yerel misafir Ayarlar, gerçek indirme ilerlemesi, klavye sekmeleri/odak dönüşü iyileştirildi. CAD'e ortak web başlığı eklenmedi.
- Bekleyen vaka ve randevu kayıtları, değiştirilmiş randevunun kapanma uyarısı, rota değişiminden sonra gelen eski sonuçlar ve IME Enter davranışı düzeltildi.
- Windows paketlemesi npm.cmd başlatma, PE mimarisi, .env dışlama ve byte koruyan Git checkout ile güçlendirildi. Gerçek NSIS içeriği, ASAR ve Next dosyaları ile çıkarılmış Electron ekranlarını doğrulayan CI eklendi.

## Gerçek model değerlendirmesi

Önceki ağ engeli Windows CI üzerinden aşıldı; resmî sabit hashli modelle gerçek çıkarım kayıtları alındı. İlk 1.7B ve kontrollü 4B denemelerinde kötü/ilgisiz yanıtlar ve hedefi temizleme hatası gözlendi. Bunlar başarılı model kabulü sayılmaz. Modelin önerdiği üretim ayarları ve alan bazlı bellek sözleşmesi ayrı kontrollü deneylerle incelenmektedir. Nihai kaynakta kullanılan model/ayar ve sonuçlar doğrulama bittikten sonra bu bölümde kaydedilir.

## Doğrulama durumu

Güncel çalışma kayıtları `/workspace/dentaya-rc62-validation` altında tutulmaktadır. Nihai kaynak kanıtları `verification/RC62` içine mühürlenecektir. Önceki RC61 raporları RC62'nin testi değildir. Tam verify, gerekli tarayıcılar, gerçek modelin ham çıktıları ve Windows derlemesinin gerçek receipt sonuçları tamamlanmadan bu alanlar geçti olarak işaretlenmez.

## Sınırlar

16 GB RAM bilgisi esas alınmıştır; kullanıcının bilgisayarındaki GPU/hız henüz ölçülmedi. Klinik/üretim onayı ve canlı kurum backend kabulü yapılmadı. Yerel çok pencere revizyon denetimi iyimserdir, atomik kilit değildir. Kayıtlı olmayan yeni sohbet taslağı sayfa yenilemesinde kurtarılmaz. İçerik sayıları 500 bilgi/60 kaynak, 1008 yardımcı kayıt, 120 hacim etkili SVG logo, beş oyun ve 72 görünümdür. Yeni temel model eğitilmedi; genel doğruluk veya hatasız ürün iddiası yoktur.
