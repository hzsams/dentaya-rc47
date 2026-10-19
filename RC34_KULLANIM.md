# DentAYA RC34 — Tek renk paleti

Renk ayarları **Ayarlar → Görünüm → Renkler ve görünüm → Renk paletleri** alanında birleştirildi. Ekran üstündeki **Görünüm** düğmesi de aynı paleti ve kayıtları kullanır.

- Tema, Retro/Old Money gibi tarzlar ve hazır renkler tek seçim listesindedir. Ayrı tema kartları, vurgu renk panelleri ve renk ızgaraları kaldırıldı.
- **Kendi rengini seç** açıldığında arka plan, panel ve vurgu renkleri aynı paletin içinde düzenlenir. **Tema rengine dön**, son seçilen paletin renklerini geri getirir.
- Seçim anında uygulanır ve bu cihazda saklanır. CAD sahnesi aynı paleti izler; fare hızları ve model geometrisi değiştirilmez.
- Görünüm dışa aktarma dosyası paleti ve temel temayı birlikte içerir. Önceki sürümün görünüm dosyaları da içe aktarılabilir.
- Renk alanı, görünüm sekmesinin başına taşındı. Logo, ses ve okuma ayarları renk seçiminden ayrı kalır.

## Windows güncelleme

1. ZIP'i yeni bir klasöre çıkarın; `DentAYA_Production_RC34` klasörünü açın.
2. Çalışan projenizin `.env.local` dosyasını `package.json` yanına kopyalayın.
3. DentAYA'yı kapatıp `DENTAYA_GUNCELLE_DERLE.cmd` dosyasına çift tıklayın.
4. Derleme sonunda `dist-desktop\DentAYA-Setup-1.0.0-rc.34.exe` dosyasını çalıştırın.

Bu güncelleme yeni SQL işlemi gerektirmez. RC33 doğrulama ekranını ilk kez kuracak olanlar mevcut `public/setup/DentAYA_RC33_Dogrulama.sql` güncellemesini kullanır.

`verification/RC34` bu sürümün yazılım kontrollerini içerir. Hedef Windows kurulum testi bu geliştirme ortamında çalıştırılmadı.
