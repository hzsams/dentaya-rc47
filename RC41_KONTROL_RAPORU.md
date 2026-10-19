# DentAYA RC41 — kontrol raporu

Sürüm: **1.0.0-rc.41** · Tarih: **15 Ekim 2026**.

## Değişiklikler

RC38/RC39'da eklenen 24 morfoloji ailesi kaldırıldı. Üretici, form seçici ve `public/tooth-forms` galerisi pakette bulunmaz. Diş görünümü tercihleri, atlas geometrisi ve görünüm ayarları bileşeni RC37 arşivinden birebir geri alındı. CAD başlangıç geometrisi RC37'nin özgün üç oluşturma fonksiyonundan alınır; yalnızca modül dışa aktarımları eklendi. SHA-256 karşılaştırma kaydı: `verification/RC41/rollback-provenance.json`.

CAD'de altı özgün form, görünüm ayarlarında dokuz özgün form ve 16 görünüm vardır. Kaldırılan 24 aileye ait seçimler doğal forma taşınır. Bu ünitenin başlangıç geometrisi açılışta/seçimde yeniden oluşturulur; o aile üzerindeki önceki şekillendirme sıfırlanır. Kole çizgileri, ünite tanımı ve ölçü ayarları korunur.

Yeni **Form kütüphanesi**, teknisyenin kendi STL/OBJ dosyasını içe almasını, birim/eksen/FDI seçmesini, gerçek geometriyi 3D önizlemede kontrol etmesini ve CAD ünitesinde kullanmasını sağlar. Kütüphane kullanıcı ve cihaz adına IndexedDB'de tutulur. Başka teknisyene veya cihaza aktarım JSON dışa/içe aktarımıyla yapılır; ortak bulut kataloğu değildir.

Seçilen kaynak formun bir kopyası proje ayarlarına eklenir. CAD'nin düzenlenmiş tam geometrisi mevcut RC40 kayıt mekanizmasıyla saklanır. Yerel kütüphaneden orijinalin silinmesi kaydedilmiş proje kopyasını bozmaz. Yeni veritabanı migration'ı gerekmez.

Otomatik kayıt sürerken sonraki adıma geçildiğinde, önceki adıma ait gecikmiş kayıt cevabının paneli geriye döndürmesi düzeltildi. Panel, güncel düzenleme durumundaki adımı izler. Kole yerleşimi, kayıt/çıkış, kurtarma ve AYA akışı RC40 üzerinden korunur.

## Doğrulama

| Kontrol | Sonuç ve kapsam |
|---|---|
| RC37'ye dönüş | Özgün üç görünüm dosyasının ve CAD oluşturma kodunun SHA-256 karşılaştırması geçti. İptal edilen üretici ve galeri bulunmuyor. |
| Eski CAD geometrisi | 144 geometri örneğinde kapalı ve tek gövde kontrolü geçti; altı seçenek doğrulandı. |
| Eski diş görünümü | 736 geometri örneği, dokuz form, 16 görünüm, kron/kök kontrolleri ve geçersiz tercih sınırları geçti. |
| STL/OBJ | ASCII ve ikili STL ile OBJ içe aktarımı, geometriyi kayıpsız yeniden açma, açık/kopuk/bozuk model reddi geçti. |
| Cihaz kütüphanesi | Tamamlanmış IndexedDB kaydı, kullanıcı ayrımı, silme ve JSON dışa/içe aktarımı geçti. |
| Gerçek CAD ekranı | STL ekleme, 3D önizleme, FDI'ye göre seçim, içe alınan topolojinin kullanılması, kayıt ve yeniden açılış geçti. |
| Proje kopyası | Yerel orijinal silinip proje yeniden açıldığında kaynak form ve şekillendirilmiş geometri korundu. |
| Kole yerleşimi | Sentetik implant dayanaklarında yerel kole boyutu, konum ve görünürlük kontrolü geçti. Aynı koleye yeniden yerleştirme şekli tekrar küçültmedi. |
| Kayıt ve çıkış | Sunucu onayını bekleme, kayıt sırasında düzenlemeyi engelleme, bağlantı hatasında CAD'de kalma ve açıkça seçilen yerel çıkış/kurtarma geçti. |
| Üniteler ve yayınlama | Ayrı kole ve şekillendirme, ünite geçişi, tam geometriyi yeniden açma, yayın öncesi kayıt ve eşzamanlı kayıt çakışmasını reddetme geçti. |
| Adım adım çalışma | Gerçek tarama üzerine kole çizimi ve sekiz görev akışı geçti. Önceki görevin kayıt cevabı bilerek geciktirildi; gerçek başarılı cevap geldikten sonra açık görev korundu. |
| Genel CAD | Sekiz manuel araç, şekillendirme, geri al/yinele, gizli hedef koruması, panel taşıma, klavye, tema/dil değişimi ve mobil panel sınırları geçti. |
| Dil ve görünüm | 46 dilde 4.831 kaynak anahtarı ve arayüz bağlantıları geçti. Tarayıcıda 46 dil paketi, kullanıcı metinlerinin korunması ve tercihlerin yeniden açılması kontrol edildi. |
| Statik ve çekirdek kontroller | Paket doğrulamalarının derleme öncesindeki 34 komutu geçti; lint sıfır uyarıyla, TypeScript kontrolü hatasız tamamlandı. |
| Üretim derlemesi | Next.js üretim derlemesi ve derleme içindeki TypeScript kontrolü geçti. `/cad-library` çıktıda bulunur; geçici test sayfaları bulunmaz. Sonuç: `verification/RC41/build.log`. Böylece ana doğrulama zincirindeki 35 komut tamamlandı. |

Tarayıcı kontrolleri gerçek uygulamayı ve yazılımsal WebGL'yi kullanır. Veri sunucusu yanıtları test tarafından karşılanır; canlı hasta kayıtları veya canlı sunucu üzerinde işlem yapılmadı. Kütüphane testindeki basit kapalı mesh yalnızca test girdisidir; hazır anatomik form olarak kullanıcı kütüphanesine eklenmez.

Komut çıktıları `verification/RC41/` klasöründedir. Yeni veya değiştirilmiş kaynakların paket özeti `source-manifest.json` içinde bulunur. ZIP oluşturulurken kaynak hash'leri, arşiv CRC'si, tek Windows CMD giriş dosyası ve iptal edilmiş varlıkların bulunmaması ayrıca kontrol edilir.

## Paket kapsamı

Paket kaynak kodudur. `node_modules`, `.next`, yerel bağlantı dosyaları, Windows derleme çıktıları ve tarayıcı QA görselleri dağıtıma alınmaz. Windows kurulum EXE'si bu ortamda oluşturulmadı veya çalıştırılmadı. Kullanıcının çalışan `.env.local` dosyasıyla `DENTAYA_GUNCELLE_DERLE.cmd` üzerinden derlenmesi gerekir. Kurulum adımları ve form aktarımı için [RC41_KULLANIM.md](RC41_KULLANIM.md) dosyasını kullanın.

Kütüphane verileri bu cihazdadır. Cihaz değiştirme veya uygulama verilerini temizleme öncesinde JSON dışa aktarımı alınmalıdır. Uzak sunucuya kaydedilmiş proje kopyaları yerel kütüphaneden bağımsızdır. Önceki sürüm raporları tarihsel referans olarak tutulur; güncel form sistemi bu RC41 raporundaki sistemdir.
