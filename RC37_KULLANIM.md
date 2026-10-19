# DentAYA RC37 — Anatomik görünüm ve 46 dil

RC36'nın sekiz işlemli manuel CAD düzeni korunur. RC37, diş seçim ekranına formu ve yüzeyi birlikte değiştiren hazır görünümler ile ayrıntılı şekil, renk ve ışık ayarları ekler.

- 16 hazır diş görünümü ve 9 form.
- Kron genişliği, yüksekliği, derinliği, kusp belirginliği, kök uzunluğu ve aşınma ayarları.
- 12 renk seçeneği, özel diş ve arka plan rengi, 6 yüzey seçeneği, parlaklık ve ışık.
- Canlı önizleme, dört kamera açısı, kök görünürlüğü ve ayrı kök tonu.
- Cihazda otomatik kayıt ve eski görünüm tercihlerinin korunması.
- Şekil değişiminde aynı 3D sahne, diş seçimi ve bakış açısı korunur.
- 46 dilde tüm 4.746 sabit arayüz metni uygulamayla birlikte gelir. Büyük harfli kamera etiketindeki Türkçe kalıntısı giderildi.

Norveççe, İzlandaca, Sırpça, Boşnakça, Arnavutça, Makedonca, Azerbaycanca, Gürcüce, Ermenice, İbranice, Farsça, Hintçe, Bengalce, Endonezce ve Vietnamca bu sürümde eklendi. Arapça, İbranice ve Farsçada sağdan sola yerleşim uygulanır. Dil değişimi için çevrim içi çeviri hizmeti gerekmez.

## Windows'ta güncelleme

1. ZIP'i yeni bir klasöre çıkarın; `DentAYA_Production_RC37` klasörünü açın.
2. Çalışan projenizin `.env.local` dosyasını `package.json` yanına kopyalayın.
3. DentAYA'yı kapatıp **DENTAYA_GUNCELLE_DERLE.cmd** dosyasına çift tıklayın.
4. Derleme tamamlanınca `dist-desktop\DentAYA-Setup-1.0.0-rc.37.exe` dosyasını çalıştırın.

Pakette tek CMD vardır. Yeni SQL gerekmez. Görünüm tercihleri mevcut `dentaya:tooth-appearance:v1` anahtarında korunur. Ayarlar > Görünüm > Anatomik görünüm bölümünden yeni kontrolleri açabilirsiniz.

## Ayarların etkisi

Form ve ölçü kontrolleri seçim ekranındaki referans dişleri değiştirir. Hasta taraması ve üretim için tasarlanan restorasyon geometrisi değişmez. CAD'deki doğal görünüm, “diş tarzını izle” açıkken renk ve yüzey tercihlerini kullanır. Renk örnekleri temsili ekran renkleridir.

Bu ZIP kaynak güncellemesidir; Windows EXE'si içermez. Windows kurulum ve açılış testi bu ortamda yapılmaz. Güncel doğrulama sonuçları `verification/RC37` içindedir; önceki sürüm raporları tarihsel kayıttır. Çeviri kapsamı denetimi, bütün dillerde ana dili konuşan editör incelemesi yapıldığı anlamına gelmez.
