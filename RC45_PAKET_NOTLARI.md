# DentAYA RC45 paket notları

Sürüm: **1.0.0-rc.45** · Tarih: **18 Ekim 2026**.

RC45, indirilemeyen RC44 paketi yerine hazırlanan tam kaynak paketidir. RC44'teki 200 diş bilgisi, üç mini oyun, AYA Core 0.3, CAD renk grupları, önceki formlar ve teknisyen kütüphanesi korunur. Bu sürüm paketleme ve sürüm etiketlerini yeniler; yeni uygulama özelliği veya yeni model eklemez. RC42, RC43 veya RC44'ü ayrıca indirmeniz gerekmez.

## Paket değişiklikleri

- Proje, kilit dosyası, uygulama etiketi, istemci kimliği ve Windows kurulum dosyası adı RC45'e eşitlendi.
- Tek Windows giriş noktası `DENTAYA_GUNCELLE_DERLE.cmd` olarak kaldı. OneDrive'daki kilitli derleme çıktıları yerine her çalıştırmada yeni yerel klasörde derleme yöntemi korunur.
- Güncel kurulum talimatları RC45'e uyarlandı. AYA kurulum rehberinin mevcut testleri geçerli sürümü okuyacak şekilde güncellendi.
- Standart Deflate sıkıştırmalı tek ZIP yeniden üretildi. `PAKET_BUTUNLUK.json`, dosyaların boyutlarını ve SHA-256 özetlerini içerir; kendi özetini içermez.

## RC45'te yapılan kontroller

Paket/lockfile/uygulama/istemci/kurulum sürümü eşleşmesi ve tek CMD kontrolü geçti. Eski ortam etiketinin RC45'e taşınması, diğer bağlantı ayarlarının korunması, LF/CRLF ve yeniden çalıştırma kontrolleri geçti. 46 dilin mevcut paket bütünlüğü kontrolü geçti. AYA belge rehberinde güncel kurulum sürümü, kole/implant yardımı ve kayıt durumu kontrolleri geçti.

Paketleme sırasında RC44'ün bütün dosyalarının korunması ve yalnızca belirtilen sürüm, belge ve test dosyalarının değişmesi karşılaştırılır. Üretilen ZIP ayrıca CRC ve dosya özetleriyle kontrol edilir.

RC44 uygulama kontrollerinin geçmiş kaydı `RC44_KONTROL_RAPORU.md` içindedir. RC45'te tam uygulama derlemesi veya tarayıcı testleri tekrar çalıştırılmadı; Windows kurulum/çalıştırma testi bu ortamda yapılmadı. Bu ZIP **tam kaynak paketidir**, hazır Windows EXE'si içermez. Kurulum için `KURULUM.txt` dosyasını izleyin.

## 18 Ekim Windows paketleme düzeltmesi

`EPERM` DLL hatası için kurulu Electron dağıtımı, ayrı çıktı klasörleri ve sınırlı yeniden deneme eklendi. Paketleme yardımcılarının 12 regresyon testi geçti. Güncel kurulum çıktı yolu ve gerçek Windows testi sınırları [onarım raporunda](RC45_WINDOWS_PAKETLEME_ONARIMI.md). Önceki bölüm paket yenilemesinin kaydıdır; bu revizyon ayrıca paketleme kodunu değiştirir.

## Onarım 2 — Electron dağıtımı eksik olduğunda

Önceki yardımcı, `electron/dist/version` dosyasının hazır olduğunu varsayıyordu. Yeni akış eksik dağıtımı Electron paketinin kendi kurucusuyla tamamlar; yalnızca sürüm dosyası yoksa geçerli EXE üzerinde `--version` çalıştırır. Kurulum sonrası tüm dosya ve sürüm kontrolleri tekrar yapılır. Node.js alt sınırı kilit dosyasındaki Electron şartıyla aynı, 22.12.0 oldu. 25 regresyon testi geçti; ayrıntılar güncel Windows onarım raporundadır.
