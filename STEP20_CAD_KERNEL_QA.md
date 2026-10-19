# Step 20 — CAD Kernel MVP QA

## Build
- [ ] `npm.cmd run build` TypeScript kontrolü geçiyor
- [ ] `/design` açılıyor
- [ ] `/ai` açılıyor

## BuildFix
- [ ] `src/app/ai/page.tsx` unknown error hatası artık oluşmuyor
- [ ] AYA ayar aksiyonu hata yakalayıcıları normal çalışıyor

## Margin Engine v2
- [ ] En az 3 margin noktası ekle
- [ ] Yüzeye projekte et
- [ ] Smooth çalıştır
- [ ] +0.05 mm ve -0.05 mm offsetleri çalıştır
- [ ] Undo/redo sonrası tasarım sahnesi bozulmuyor

## Internal Fit
- [ ] Gap parametrelerini değiştir
- [ ] Internal fit relief uygula
- [ ] Geometri değişiyor
- [ ] Undo ile geri alınabiliyor
- [ ] Thickness görünümü açılıyor

## Undercut
- [ ] View'dan insertion axis al
- [ ] Undercut map aç
- [ ] Block-out preview aç/kapat
- [ ] Preview kaynak mesh'in yerine geçmiyor

## Contact
- [ ] Contact map aç
- [ ] signed-distance renkleri görüntüleniyor
- [ ] Kernel QC collision sample sayısı üretiyor

## Connector
- [ ] `C` ile Connector tool aç
- [ ] Tasarım üzerinde iki nokta seç
- [ ] Connector görüntüleniyor
- [ ] Round / Oval değişiyor
- [ ] Çap değişiyor
- [ ] Min. area/width/height QC çalışıyor
- [ ] Connector temizle çalışıyor

## Mesh QC
- [ ] `Ctrl/Cmd + Shift + Q` rapor çalıştırıyor
- [ ] triangle count var
- [ ] boundary edge var
- [ ] non-manifold var
- [ ] watertight bilgisi var
- [ ] surface area hesaplanıyor

## Export gate
- [ ] Geçerli mesh STL üretebiliyor
- [ ] QC fail durumda review gönderimi duruyor
- [ ] Connector QC fail durumda review gönderimi duruyor
- [ ] QC raporu version parameters içinde saklanıyor

## Truthfulness
- [ ] UI tam crown-bottom / manufacturing validation iddiası taşımıyor
- [ ] Internal Fit açıkça MVP olarak adlandırılıyor
- [ ] Blockout açıkça preview olarak adlandırılıyor
- [ ] Connector mekanik sertifikasyon olarak sunulmuyor
