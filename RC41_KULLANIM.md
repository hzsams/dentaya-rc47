# DentAYA RC41 — kullanım

## Windows güncellemesi

1. ZIP'i yeni bir klasöre açın; `DentAYA_Production_RC41` klasörünü kullanın.
2. Çalışan projenizin `.env.local` dosyasını `package.json` ile aynı klasöre kopyalayın.
3. `DENTAYA_GUNCELLE_DERLE.cmd` dosyasını çalıştırın. Node.js 22+ ve npm 11+ gerekir.
4. Derleme bittiğinde açık DentAYA programını kapatıp `dist-desktop\DentAYA-Setup-1.0.0-rc.41.exe` dosyasını çalıştırın.

Bu ZIP kaynak paketidir; hazır Windows kurulum EXE'si içermez. Yeni veritabanı migration'ı gerekmez. Önceki kaynak paketi ve kayıtlarınızı koruyun.

## Eski formlara dönüş

24 yeni morfoloji ailesi, bunları üreten kod ve önizleme galerisi kaldırıldı. Diş görünümü ve atlas RC37 dosyalarına, CAD başlangıç geometrisi de RC37'nin özgün oluşturma koduna döndü. CAD iş tanımındaki altı özgün form seçeneği kullanılabilir.

Önceki 24 aileden kalan seçimler doğal forma taşınır. Bu ünitenin başlangıç geometrisi açılışta/seçimde yeniden oluşturulur; eski aile üzerindeki şekillendirme yeni başlangıç biçimine aktarılmaz. Ünitenin kole çizgisi, iş tanımı ve ölçü ayarları korunur. Yeni bir form seçmek yalnızca seçilen ünitenin başlangıç geometrisini değiştirir.

## Kendi formunuzu ekleme

Laboratuvar ana ekranından veya CAD başlığından **Form kütüphanesi** açın. Kütüphane başlangıçta boştur; hazır yeni form ailesi eklenmemiştir.

1. **Yeni form** ile STL veya OBJ seçin. Dosya en fazla 20 MiB olabilir.
2. Form adını ve ait olduğu FDI diş numarasını girin. Dosyanın birimini mm, cm veya µm olarak seçin.
3. **Oklüzal** ekseni ve gerekirse **+90°** dönüşünü ayarlayın. Fareyle gerçek 3D önizlemeyi döndürüp yakınlaştırın.
4. **Kaydet** ile formu bu cihazdaki kullanıcı kütüphanenize ekleyin.

İçe alınan formun tek, kapalı gövde olması gerekir. Açık yüzeyler, kopuk çoklu gövdeler veya bozuk dosyalar kaydedilmez. Bir form en fazla 100.000 köşe ve 200.000 üçgen içerebilir; daha yoğun modeli kendi yazılımınızda sadeleştirip yeniden ekleyin.

## CAD ünitesinde kullanma

**İş tanımı** ekranında ilgili ünitenin **Form kütüphanesi** düğmesini açın. Liste o ünitenin anatomi numarasına göre süzülür. Formu seçip **CAD’de kullan** düğmesine basın, ardından iş tanımını onaylayın. Formun gerçek içe alınmış yüzeyi başlangıç geometrisi olur.

Ünitenin FDI/anatomi numarasını değiştirmek kütüphane seçimini sıfırlar. Eski forma dönmek için iş tanımındaki kütüphane seçimini sıfırlayıp özgün form seçeneklerinden birini seçin. Mekanik teleskop formları kendi mevcut oluşturucusunu kullanır.

CAD'de **Kaydet** veya **Kaydet ve çık** kullanıldığında seçilen formun kaynağı ve düzenlenmiş geometri proje kaydının içine eklenir. Yerel kütüphanedeki orijinali silmek bu proje kopyasını silmez. Projeyi başka cihazda açan teknisyen de kaydedilmiş formu kullanabilir.

## Teknisyenler arasında aktarım

Kütüphanede **Dışa aktar**, `DentAYA_Form_Kutuphanesi.json` dosyası oluşturur. Diğer teknisyen bu dosyayı kendi kütüphanesinde **İçe aktar** ile ekleyebilir. Tek aktarım en fazla 100 form ve 50 MiB olabilir.

Kütüphane bu cihazda, oturum açan kullanıcı adına tutulur. Otomatik laboratuvar ortak kataloğu veya cihazlar arası eşitleme yoktur. Cihaz değiştirirken kütüphaneyi dışa aktarın; uygulama/tarayıcı verilerini temizlemek yerel listeyi siler. Uzak sunucuya kaydedilmiş proje kopyaları bundan etkilenmez.

## Kole, kayıt ve AYA

Aktif ünitenin kolesini preparasyon veya implant dayanağı çevresinde çizip **Sonraki** ile ilerleyin. Diş yerel koleye yerleşir ve kamera ona odaklanır. **Koleye yerleştir** aynı kolede şekillendirmeyi silmeden tekrar uygulanabilir. Her ünitenin kole, yerleşim ve şekillendirmesi ayrı kaydedilir.

**Kaydet ve çık** uzak kaydın tamamlanmasını bekler. Bağlantı hatasında çalışma açık kalır; güvenli yerel kopya hazırlanmışsa **Yerel kaydet ve çık** kullanılabilir. Yeniden açılışta **Kurtarma kaydı bulundu → Geri yükle** ile devam edip bağlantı gelince uzak kaydı tamamlayın. Yerel kurtarma aynı cihazdadır.

Adım adım çalışırken otomatik kaydın bitmesini beklemeden sonraki adıma geçebilirsiniz. Önceki adıma ait kayıt cevabı geç geldiğinde açık paneli geriye döndürmez.

Başlıktaki **AYA** paneli aktif ünite, kole ve kayıt durumuna göre yardım verir. Belge rehberi model kurulumu gerektirmez; serbest model sohbeti mevcut Ollama bağlantısını kullanır. RC40'ın ayrıntılı günlük CAD kullanım açıklamaları [RC40_KULLANIM.md](RC40_KULLANIM.md) içinde tarihsel referans olarak tutulmuştur; RC41'de form sistemi yukarıdaki eski seçenekler ve kullanıcı kütüphanesidir.
