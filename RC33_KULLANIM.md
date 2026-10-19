# DentAYA RC33 kullanım ve güncelleme

Bu paket yeni kaynak sürümüdür. Kurulum dosyasını kendi Windows bilgisayarınızda oluşturur.

1. ZIP'i yeni bir klasöre çıkarın. `DentAYA_Production_RC33` klasörünü açın.
2. Çalışan eski projenizin `.env.local` dosyasını bu klasörde `package.json` yanına kopyalayın.
3. DentAYA'yı kapatın. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasına çift tıklayın. Yardımcı dosya `npm.cmd` kullanır; PowerShell betik politikası veya `&&` sorunu için ek ayar gerekmez. Eski `.env.local` içindeki sürüm etiketi RC33'e güncellenir; bağlantı anahtarları korunur.
4. Derleme bittikten sonra `dist-desktop\DentAYA-Setup-1.0.0-rc.33.exe` dosyasını açın.
5. Supabase SQL Editor'de `public/setup/DentAYA_RC33_Dogrulama.sql` dosyasının tamamını bir kez uygulayın. Bu ek güncelleme mevcut DentAYA tablolarını silmez veya yeniden kurmaz; mevcut temel şema gereklidir.

## Kalite ve pilot

Sol menüde **Kalite ve pilot → Doğrulama kayıtları** açılır. Aynı ekranda mevcut uçtan uca vaka akışı da bulunur.

- Önce test edilen ürün sürümünü, protokol kodunu/revizyonunu ve araştırma türünü seçin.
- Gereksinimi seçip önceden belirlediğiniz kabul ölçütünü, gözlenen sonucu ve rapor/dosya/kayıt referansını yazın. İsterseniz işlem süresini saniye olarak kaydedin.
- Başarısız veya engellenmiş sonuçta düzeltme ve yeniden test planı gerekir. Açık yüksek/kritik bulguyla başarılı sonuç yazılamaz.
- Teknik/sentetik veri dışındaki araştırma türlerinde izin ve veri kullanım belge referansı zorunludur. Bu referansın yazılması bir izin belgesinin doğrulandığı anlamına gelmez; ilgili belgeler proje dosyasında ayrıca incelenir.
- Sonuç ekleme: kurum sahibi, yönetici, hekim veya teknisyen. Aktif diğer üyeler kendi kurumlarının kayıtlarını okuyabilir.
- Hasta adı/kimliği yerine vaka ve belge kodları kullanın. Eski kanıt silinmez veya üzerine yazılmaz. Aynı bağlamda yeni sonuç önceki kayda bağlanır; eşzamanlı çelişen düzeltme reddedilir.
- Sayaç yalnız seçili sürüm + protokol + araştırma türündeki yüklenen son sonuçları gösterir. Eski sürümün başarısı yeni sürümü kapatmaz. Daha eski kayıtlar gerektiğinde yüklenir.
- JSON/CSV raporu aynı seçili bağlamın yüklenen kayıtlarını içerir. Raporlarda klinik/regülasyon doğrulamasının otomatik verilmediği açıkça belirtilir.

## Bağlantılar

Klinik-laboratuvar kayıtları Supabase bağlantısı gerektirir. Google Maps rota ve harita hizmetleri isteğe bağlı entegrasyonlardır; eksik olmaları CAD çekirdeğini ve temel sistem hazırlık puanını engellemez. Yerel AYA sohbeti bilgisayarınızdaki Ollama ve yerel modelle çalışır; CAD geometrisi kullanıcı kontrollü araçlarla düzenlenir.

## Sürümü deneme

Kurum hesabıyla kayıt → dental dosya → manuel CAD → sürüm kaydı → revizyon/onay → üretim/QC → teslim zincirini test edin. CAD'de ekle/çıkar, geri al/yinele, çene görünürlüğü ve kaydetme/yeniden açma kontrollerini yapın. Dil değiştirirken seçili dişler, geometri ve yazdığınız bilgiler korunmalıdır. Doğrulama ekranında başarısız sonuç, düzeltme, eski sürüm, yetkisiz yazma ve rapor indirmeyi deneyin.

`verification/RC33` yazılım kontrollerini içerir. Windows kurulum/güncelleme, gerçek cihaz performansı, gerçek klinik-laboratuvar pilotu ve resmî izinler hedef ortamda ayrıca belgelenir.
