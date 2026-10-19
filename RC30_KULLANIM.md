# DentAYA RC30 · manuel CAD çalışma alanı

Bu paket `1.0.0-rc.30` kaynak kodudur. CAD, araç ve parametrelerin kullanıcı tarafından seçildiği bir çalışma alanı olarak yenilendi. CAD işlemleri model sohbeti veya API anahtarı gerektirmez.

## Yeni düzen

- Üstte vaka, iş tanımı, kayıt ve incelemeye gönderme; altında altı tasarım adımı.
- Solda nesne ağacı: üst çene, alt çene, restorasyon, taramalar, marjin/ölçüler ve bağlantılar. Görünürlük yüzdesi, tek nesneyi gösterme ve tümünü geri açma.
- Sağda kamera yönleri, doğal görünüm, tel kafes, kesit, kaynak mesafesi, temas ve giriş ekseni haritaları.
- Taşınabilir araç penceresinde yedi grup: Serbest, Anatomi, Marjin, İç yüzey, Bağlantı, Kontrol ve Çalışma. Başlığından sürükleyin; yön tuşlarıyla taşıyın, Shift ile büyük adım atın. Konum bu cihazda saklanır.
- Ekle / çıkar / yumuşat / düzleştir, üç fırça biçimi, sayısal değer ve sürgü, kişisel fırça kayıtları, simetri ve koruma seçenekleri.
- Kısa sağ tık araç menüsü; sağ tuşla sürükleme döndürür, orta tuş kaydırır. Gizlenen restorasyona fırça uygulanmaz.
- Nesne panelindeki FDI düğmeleri çalışma ünitesini seçer. Restorasyon tipi ve formu İş tanımında düzenlenir. Bu seçici, tek başına bütün köprünün üretime hazır birleşik geometri olduğu anlamına gelmez.

## Kontroller

| Tuş | İşlem |
| --- | --- |
| 1 / 2 / 3 / 4 | Ekle / çıkar / yumuşat / düzleştir |
| M / R / C / O | Marjin / ölçüm / bağlantı / döndür |
| Alt + 1 / 2 / 3 / 4 | Üst çene / alt çene / restorasyon / tarama grubu görünürlüğü |
| Ctrl + Z / Y | Geometriyi geri al / yinele |
| Ctrl + S | Projeyi kaydet |
| Num 1 / 2 / 3 / 4 / 6 / 8 / 9 | Ön / alt / arka / sol / sağ / üst / izometrik |
| Num 5 | Ekrana sığdır |
| Space basılı | Geçici döndürme |
| Fare tekerleği | Şekillendirmede fırça yarıçapı |
| Shift + tekerlek | Şekillendirmede fırça gücü |
| Ctrl + tekerlek | Şekillendirmede yakınlaştırma |
| H | Kısayollar ve kişisel tuş atamaları |
| Ctrl + , | Görünüm, ses ve dil ayarları |

## Windows güncellemesi

1. ZIP'i yeni bir klasöre çıkarın. Eski projedeki `.env.local` dosyasını, yeni `package.json` ile aynı klasöre kopyalayın.
2. Node.js 22+ / npm 11+ kurulu olmalı. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çift tıklayın.
3. Derleme tamamlandığında açık DentAYA pencerelerini kapatın ve `dist-desktop\DentAYA-Setup-1.0.0-rc.30.exe` dosyasını çalıştırın.

PowerShell alternatifi; komutlar ayrı satırlarda:

```powershell
npm.cmd ci
npm.cmd run desktop:dist
```

Bu ortamda Windows Setup çalıştırılmadı. Pakette Windows için derleme yardımcısı ve güncel kaynaklar bulunur.

## Kapsam

Bu sürüm CAD arayüzünü ve manuel kontrolleri düzenler; yeni bir Exocad geometri çekirdeği geliştirdiği veya restorasyonları klinik/üretim için doğruladığı iddiası taşımaz. Mesafe haritaları kaynak taramaya göre önizlemedir; gerçek duvar kalınlığı ve dinamik artikülasyon değildir. Mevcut shell/connector önizlemelerinin sınırları ilgili araçlarda açıklanır.

RC29'un AYA, dil ve ses çalışmaları korunur; AYA CAD işlem akışının parçası değildir. 31 dil seçeneği korunur. RC30 manifesti 4.513 kaynak metin içerir. Tam arayüz paketleri [RC29_KULLANIM.md](RC29_KULLANIM.md) içindeki yöntemle hazırlanır; yeni manifest eski pakete yeni metinler eklenmesini gerektirebilir.
