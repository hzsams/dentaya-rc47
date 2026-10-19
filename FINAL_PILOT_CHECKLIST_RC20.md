# DentAYA RC20 — Final Pilot Checklist

## Otomatik kapılar
- [ ] Node.js 22+
- [ ] npm 11+
- [ ] `npm ci`
- [ ] `npm run verify:env`
- [ ] `npm run verify:final`
- [ ] Production build PASS
- [ ] 23+ migration doğrulaması PASS
- [ ] CAD interaction/workflow/panel PASS
- [ ] Clinic → Lab → CAD → Review → Production → QC → Courier → Delivered E2E PASS

## Staging / altyapı
- [ ] Gerçek Supabase staging project bağlı
- [ ] Tüm migration'lar uygulanmış
- [ ] Auth redirect URL'leri doğru
- [ ] Google Maps Embed key domain restricted
- [ ] Geocoding ve Routes server key'leri server-only
- [ ] Google quota/billing uyarıları tanımlı
- [ ] Vercel environment değişkenleri staging ile eşleşiyor
- [ ] `/api/health` ready/degraded davranışı kontrol edildi
- [ ] `/pilot-check` kritik hata göstermiyor

## Gerçek rol smoke test
- [ ] Clinic owner/admin giriş
- [ ] Lab owner/admin giriş
- [ ] Technician giriş
- [ ] Courier/driver giriş
- [ ] Klinik gerçek test vakası oluşturdu
- [ ] Lab vakayı kabul etti
- [ ] CAD tasarım sürümü gönderildi
- [ ] Klinik revision + ikinci sürüm + approve akışı tamamlandı
- [ ] Production → QC → Ready tamamlandı
- [ ] Kurye shipment oluşturuldu ve driver atandı
- [ ] Canlı konum + rota/ETA görüldü
- [ ] Teslimat kanıtı ile Delivered tamamlandı
- [ ] Timeline/audit doğru
- [ ] Operasyon Merkezi metrikleri doğru
- [ ] AYA operasyon özeti doğru bağlama yönlendiriyor

## Release sign-off
- [ ] RLS negatif test: başka kurum verisi görünmüyor
- [ ] Backup / rollback yolu doğrulandı
- [ ] Kritik error/telemetry görünürlüğü doğrulandı
- [ ] Gerçek hasta verisi kullanılmadan sentetik pilot smoke test tamamlandı
- [ ] Pilot sorumluları ve destek kanalı belirlendi

Tüm maddeler tamamlandığında RC etiketi kapatılıp `DentAYA v1.0.0 Pilot` etiketi açılabilir.
