# TÜSEB D kapsamı ve RC33 kanıt durumu

Tarih: 11.10.2026. Ürün sürümü: 1.0.0-rc.33. Bu belge yazılım kapsam eşleştirmesidir; destek uygunluğu veya klinik kullanıma ilişkin resmî karar değildir.

Dayanaklar: kullanıcı dosyalarındaki `Kapsam.pdf`, `Amac_ve_Hedefler.pdf`, `Yontem.pdf` (04.10.2026); `Is_Plani.pdf` güncel ikinci sürüm ve `Butce_Hazirlik.pdf` güncel sürüm (05.10.2026); `TITCK_Plani.pdf` güncel sürüm. C4 ve C6 bütçeleri, süreleri veya yeni CAD bileşenleri D'nin kesin bütçesi/çıktısı olarak bu sürüme aktarılmadı. D mevcut çekirdeğin doğrulama ve ürünleşme hattıdır; C6 ayrı proje olarak kalır.

Resmî 2026-D çağrısı başlangıçta en az THS 7'nin tamamlanmasını, bitimde en az THS 8'in tamamlanmasını ister. Yazılım derlemesi veya test puanı tek başına bu seviyeleri kanıtlamaz. Kaynak: https://files.tuseb.gov.tr/tuseb/files/tbys/2026-d.pdf (11.10.2026 tarihinde resmî indeks üzerinden kontrol edildi; tam PDF erişimi yanıt hatası verdi). Başvuru anındaki TBYS kaydı ve çağrı sürümü esas alınır; bu belgede bütçe/süre/başvuru takvimi sabitlenmez.

| D kapsamındaki hedef | RC33 karşılığı | Kanıtın sınırı |
| --- | --- | --- |
| Klinik-laboratuvar vaka zinciri | Vaka, kabul, CAD sürümleri, revizyon/onay, üretim, QC ve teslim akışı | SQL üzerinde uçtan uca senaryo test edilir; gerçek kurum pilotu ayrıca gerekir. |
| Dental veri ve kullanıcı kontrollü CAD | Mevcut tarama/CAD araçları; FDI, birim/eksen kontrolleri, görünürlük ve geri al/yinele | Gerçek WebGL ve tarama dosyasıyla yazılım regresyonu; restorasyon uygunluğu veya endüstriyel CAD denkliği iddia edilmez. |
| Gereksinim-test-sonuç bağı | Pilot Akış Merkezi'nde 12 ürün doğrulama alanı; protokol ve sürüm bağlantılı sonuç/kanıt kayıtları | Bu 12 alan resmî çağrının zorunlu madde listesi veya onaylı araştırma protokolü değildir; proje protokolüyle ayrıntılandırılır. |
| Erişim ve izlenebilirlik | Kurum ayrımı, rol kontrollü kayıt ekleme, oturumdan yazar kimliği, değiştirilemeyen kayıt ve düzeltme zinciri | RLS ve RPC testleri yerel PostgreSQL uyumlu test veritabanında; canlı Supabase ortamı ayrıca doğrulanır. |
| Kullanıcı/pilot ölçümü | Beklenen-gözlenen sonuç, süre, bulgu önem derecesi ve yeniden test planı | Kullanıcı beyanı ile gerçek kanıt ayrı kalır. Sayaç resmî THS veya klinik kabul kararı üretmez. |
| Çok dil ve okunabilirlik | 31 dil; 24 AB dili; ortak başlık/alt metin yerleşimi, klavye ve mobil kontroller | Sabit arayüz kapsaması ve tarayıcı kontrolleri; tüm dillerde ana dil editör onayı verilmedi. |
| Araştırma ve düzenleyici yol | Araştırma türleri ayrılır; gerçek veri çalışmalarında belge referansı gerekir | Amaçlanan kullanım, cihaz statüsü, sınıf, etik/TİTCK/kurum izinleri yetkili kişilerce değerlendirilir. Bir referans alanı doldurmak izin vermez. |
| Ürünleşme ve dağıtım | RC33 sürüm tutarlılığı, Windows derleme yardımcısı, SQL eki, kullanım ve test kayıtları | Linux üretim derlemesi çalıştırılır; NSIS kurucusu ve hedef Windows kurulumu bu ortamda yapılmadı. |

## Klinik–Laboratuvar Ar-Ge ve Doğrulama Merkezi

Mevcut Pilot Akış Merkezi bu merkezin yazılım kayıt yüzeyidir. Kurum kullanıcıları protokol, sürüm, vaka referansı, kabul ölçütü, ölçüm ve kanıtları izleyebilir; bulgular düzeltme kayıtlarına bağlanır. Merkezin fiziksel kuruluşu, ekipman, araştırmacı ataması, eğitim, kalibrasyon ve saha çalışmaları yazılımda gerçekleşmiş gibi işaretlenmez. Merkez/pilot giderleri C6 ile mükerrer gösterilmemelidir; kesin giderler D portalı ve resmî bütçe tablosuyla eşleştirilir.

## Başvuru kanıt dosyasına eklenecek gerçek kayıtlar

Başlangıç THS 7 kanıtları; dondurulmuş amaçlanan kullanım/protokol; gerçek klinik ve laboratuvar kullanıcı testleri; bağımsız teknik/klinik değerlendirme; uygulanabilir izin kararları; yedekten geri dönüş ve hedef Windows kurulum raporları; çözülen kritik bulguların yeniden testleri; THS 8 kapanış değerlendirmesi. Bu kayıtlar yoksa açık olarak kalır. RC33 bu kanıtları düzenler; onları uydurmaz ve otomatik onaylamaz.
