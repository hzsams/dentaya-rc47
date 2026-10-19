# DentAYA RC39 — kullanım

## Windows güncellemesi

1. ZIP'i yeni bir klasöre açın. İçindeki `DentAYA_Production_RC39` klasörünü kullanın.
2. Çalışan DentAYA projenizdeki `.env.local` dosyasını buraya, `package.json` dosyasının yanına kopyalayın.
3. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çalıştırın. Node.js 22+ ve npm 11+ gerekir. Paket tek CMD girişine sahiptir.
4. Derleme sonunda açılan `dist-desktop` klasöründeki `DentAYA-Setup-1.0.0-rc.39.exe` dosyasını, açık DentAYA programını kapattıktan sonra çalıştırın.

## Form seçimi

CAD'de “İş tanımı” ekranında ünitenin “Anatomi / kron formu” dişini seçin. Büyük önizleme ve galeri o FDI dişinin anatomik başlangıç formunu gösterir. Bir üniteyi değiştirmek diğer ünitenin seçimini değiştirmez. Kapşon ve cutback redüksiyonu restorasyon seçimiyle uygulanır; galeri anatomik taç ailesini gösterir. Teleskopik restorasyonlarda mekanik form kullanılır.

“Form kütüphanesi” bölümünü açıp “Tüm formlar” seçildiğinde 24 aile birlikte kalır; bir karta tıklamak bu karşılaştırmayı kapatmaz. Ölçüleri sıfırlamak seçilen formu değiştirmez. Eski form kayıtları mevcut aile kimliklerine taşınır.

Diş görünümü ayarlarında tek bir FDI dişi seçilirse onun önizlemesi kullanılır; çoklu seçimde kesici ve azı örnekleri gösterilir. Bu paneldeki form ayarı genel diş görünümüne uygulanır.

## Paket içeriği

- CAD ve uygulama kaynak kodu, mevcut 46 dil paketi ve premium logo seçenekleri.
- 768 FDI önizlemesi ve 24 genel form kartı.
- RC39 form kataloğu, FDI karşılaştırma görseli ve doğrulama kayıtları.

ZIP hazır Windows kurucusu içermez. Windows kurucusu bu ortamda çalıştırılmadı. Önizlemeler CAD başlangıç taçlarının görselleridir; hasta özelinde üretim doğrulaması değildir.
