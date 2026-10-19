# RC45 Windows paketleme — Onarım 2

18 Ekim 2026 · Uygulama sürümü **1.0.0-rc.45**; paketleme onarımı revizyon 2.

İlk kullanıcı logunda Electron arşivi `win-unpacked.tmp/d3dcompiler_47.dll` açılırken `EPERM` ile durdu. İlk onarımda kurulu Electron dağıtımının hazır olduğu varsayıldı. İkinci log `node_modules/electron/dist/version` dosyasının bulunamadığını gösterdi; tek başına bütün dağıtımın mı, yalnızca sürüm dosyasının mı eksik olduğunu göstermez. Onarım 2 bu durumları ayrı ele alır.

## Kurulum ve doğrulama

- Next standalone sürümü, BUILD_ID ve dosyaları önce kontrol edilir. Hazır Next derlemesi tekrar yapılmaz.
- Kurulu npm paketinin adı ve sürümü kaynakta sabitlenmiş Electron bağımlılığıyla eşleşmelidir. Kilit dosyasındaki `electron@44.4.5`, `install-electron: install.js` girişini ve Node.js `>=22.12.0` şartını içerir. İki CMD, engines alanları ve doğrulama aynı alt sınıra eşitlendi.
- Paket API'siyle dönen çalıştırılabilir yolu ve geleneksel paket-yerel `dist` yolu desteklenir. Windows x64 EXE başlığı, DLL ve veri dosyaları doğrulanır.
- `version` dosyası varsa eşleşmesi gerekir. Yoksa geçerli dosyalar üzerinde `electron.exe --version` sonucu kullanılır; sahte sürüm dosyası yazılmaz.
- Dağıtım eksik/geçersizse yalnızca kurulu, aynı sürüm Electron paketinin `install-electron` girişi veya eski paketlerde `install.js` çalıştırılır. Kurucu ağdan indirme yapabilir. Genel npm kurulumu veya sürüm yükseltme yapılmaz.
- Yarım kalmış paket-yerel `dist` klasörü yedek adla korunur; eski kurucunun yalnızca EXE'ye bakarak kurulumu atlaması önlenir. Ortak dış önbellek dizini otomatik taşınmaz/silinmez.
- Kurucu alt işleminde Windows/x64 hedeflenir; indirmeyi atlayan veya sürümü değiştiren ortam değerleri yalnızca bu alt işlemde kaldırılır. Ana işlem, sistem ve npm ayarları değiştirilmez. Kurucunun mevcut checksum akışı kullanılır; TLS, güvenlik yazılımı ve imza denetimi kapatılmaz.
- Kurucu sıfırla çıksa bile bütün dosyalar ve sürüm yeniden doğrulanmadan paketlemeye geçilmez. Kurulum günlüğü `dist-desktop/electron-setup-…/electron-install.log` altındadır. Kurucu için 15 dakika, sürüm sorgusu için 20 saniye süre sınırı vardır.

## Paketleme

`npm run desktop:dist`, Next derlemesinden sonra `npm run desktop:package` çalıştırır. Doğrulanan `electronDist` klasörü paketleyiciye verilir. Mevcut `electron-builder.yml`, NSIS, ikon, afterPack ve imza ayarları korunur; otomatik yayınlama kapalıdır.

Her deneme yeni bir çıktı dizinindedir. Yalnızca DLL erişim/kilit hataları sınırlı beklemeyle en fazla üç kez denenir; diğer hatalar ilk denemede durur. Başarı için boş olmayan Windows Setup başlığı kontrol edilir. Çıktı `dist-desktop/package-…/attempt-…/DentAYA-Setup-1.0.0-rc.45.exe` altındadır; kesin yol `latest-build.json` dosyasına yazılır ve Gezginde gösterilir. Eski başarısız çıktı silinmez veya tekrar kullanılmaz.

Küçük `DentAYA_RC45_Onarim.zip` içindeki **DENTAYA_RC45_ONAR.cmd**, hata mesajındaki `rc45-25232-10483` klasörünü otomatik hedef alır. Pencerede **ONARIM 2** yazar. Yardımcı kendi kodunu dışarıdan çalıştırır; hasta/proje verilerine ve `.env.local` dosyasına dokunmaz. Gerekli Electron dağıtımı ve yeni paketleme çıktıları yazılır.

## Test kapsamı ve sınırlar

**25/25 regresyon testi geçti.** Önceki paketleme testlerine ek olarak tamamen eksik `dist`, eksik sürüm dosyası, on-demand kurucu girişi, farklı dağıtım yolu, yarım eski dağıtımın korunması, kurucu hatası ve günlüğü, hiçbir dosya üretmeden veya yalnızca sürüm dosyası yazarak sıfır dönen kurucu, yanlış sürüm, paket sürümü uyuşmazlığı, kurucu yolu sınırı, alt işlem ortamı ve Node.js 22.12 eşiği kontrol edildi. Sürüm/lockfile/CMD eşleşmesi ve ortam etiketi doğrulamaları geçti.

Testler Linux/Node üzerinde, test kurucusu ve paketleyicisiyle çalıştırıldı. Gerçek Electron indirmesi, Windows/NSIS paketlemesi ve kurulum sonucu burada denenmedi. Otomatik testlerin geçmesi, kullanıcının cihazındaki sonucun doğrulandığı anlamına gelmez. CAD ve AYA uygulama davranışı bu onarımda değişmedi.

Resmî kaynaklar: [Electron kurulum ve on-demand indirme](https://www.electronjs.org/docs/latest/tutorial/installation), [npm paketinin kurucu girişi](https://github.com/electron/electron/blob/main/npm/package.json), [Electron Builder dağıtım klasörü desteği](https://github.com/electron-userland/electron-builder/blob/master/packages/app-builder-lib/src/electron/ElectronFramework.ts). Çalıştırılacak dosya bu bağlantılardan alınmaz; kurulu ve sürümü kontrol edilmiş npm paketinden seçilir.
