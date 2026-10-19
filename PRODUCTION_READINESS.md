# DentAYA RC20 Production Readiness

RC20 is the final Phase 1 pilot candidate. RC18 feature freeze remains active. The code package now contains Windows setup automation, Node/npm runtime validation, strict environment validation, final pilot-candidate structural gates, and a `verify:final` command.

## RC20 target workstation gates
- `powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`
- fill `.env.local` with staging/production Supabase + Maps values
- `npm run verify:env`
- `npm run verify:final`
- `/pilot-check` has no critical blocker
- `/release-check` automatic + manual gates complete
- real clinic/lab/technician/courier smoke test complete

RC20 becomes `DentAYA v1.0.0 Pilot` only after those live-environment gates pass.

# DentAYA RC19 Production Readiness

RC18 feature freeze remains active. RC19 closes security/performance/release-consistency gaps before final setup. The next release gate is RC20 Final Pilot Candidate.

## RC19 automated evidence
- Release consistency 9/9 PASS
- Security 21/21 PASS
- Performance 8/8 PASS
- CAD interaction 36/36 PASS
- CAD workflow 18/18 PASS
- CAD panel 12/12 PASS
- Modified TS/TSX/config syntax 10/10 PASS

## Still required on the target workstation in RC20
- npm 11.x + Node 22.x install/confirmation
- dependency install and complete `npm run verify`
- real Supabase environment + migration verification
- Google Maps Geocoding/Routes/Embed production keys
- Vercel staging/production environment variables
- clinic/lab/courier real role smoke test
- final rollback/backup check and pilot sign-off

# DentAYA Production RC18 — Feature Freeze / Yayına Hazırlık

## Otomatik kapılar

Son paket oluşturulmadan önce aşağıdaki tek komut başarılı olmalıdır:

```bash
npm run verify
```

Doğrulanan alanlar:

- ESLint: sıfır hata, sıfır uyarı
- TypeScript: strict type-check
- Next.js: optimize üretim build'i ve tüm rota üretimi
- CAD: indexed mesh, half-edge, BVH, nearest-surface, mesh repair, crown shell ve rigid registration
- CAD etkileşimi: basılı tut-sürükle sculpt, yüzeye oturan fırça HUD, sağ mouse orbit, orta mouse pan, hızlı zoom, hardness/falloff, X/Y symmetry, kullanıcı kısayolları ve Shift/Alt ters yön doğrulanır
- CAD paneli: geniş dikdörtgen sol panel, SVG araç sembolleri, workflow/adım rozetleri, kısayol etiketleri ve aktif-araç footer'ı `npm run verify:cad-panel` ile doğrulanır
- Veritabanı: 23 migrasyonun sıfırdan uygulanması, tüm public tablolarda RLS, güvenli `SECURITY DEFINER` search path ve özel Storage bucket
- Operasyonel bildirimler: Kurye ETA’sı 15 dakika eşiğine girdiğinde hedef kuruma tekilleştirilmiş yaklaşma uyarısı
- Sağlık kontrolü: `/api/health` zorunlu Supabase + Maps server ayarlarını secretsız doğrular; `/pilot-check` pilot öncesi görünür tanılama sağlar
- AYA operasyon özeti: aktif/geciken teslimatlar ve termini geçmiş vakalar kurum bazında önceliklendirilir
- Operasyon Merkezi: termin, revizyon, onay, üretim/QC, kurye gecikmesi ve günlük kapasite tek ekranda doğrulanır
- Lab kapasitesi: kurum bazlı günlük kapasite ve uyarı eşiği RLS ile owner/admin tarafından yönetilir
- Operasyon mantığı: `npm run verify:operations` ile metrik ve öncelik sıralaması doğrulanır
- Otomatik E2E: Klinik → Lab → CAD revizyon/onay → üretim → QC → gerçek rota/ETA → canlı kurye → teslimat kanıtı → teslim akışının gömülü PostgreSQL üzerinde gerçek durum geçişleriyle doğrulanması

## Canlı ortamda manuel onay

- [ ] Gerçek production alan adı, TLS ve Supabase Auth redirect adresleri
- [ ] SMTP teslimatı, e-posta doğrulama ve parola sıfırlama
- [ ] Klinik/laboratuvar/kurye rolleriyle uçtan uca kabul testi
- [ ] Google Maps Embed, Geocoding ve Routes API anahtar kısıtları / kota-uyarıları
- [ ] Kurye cihazında konum izni, arka plan davranışı ve pil tüketimi saha testi
- [ ] Teslimat kanıtı fotoğrafı ve saklama süresi politikası
- [ ] RLS negatif testleri: başka kurumun hasta, vaka, mesaj, finans ve dosya verisine erişememe
- [ ] Yedekleme, point-in-time recovery ve geri yükleme tatbikatı
- [ ] Log/uyarı/uptime izleme ve olay müdahale sorumluları
- [ ] KVKK/GDPR metinleri, saklama-imha politikası ve veri işleme sözleşmeleri
- [ ] Bağımsız güvenlik testi ve bağımlılık taraması
- [ ] CAD çıktılarında cihaz/malzeme bazlı üretim ve klinik doğrulama

Bu liste tamamlanmadan sistem gerçek hasta verisiyle genel kullanıma açılmamalıdır.


## RC17 CAD dayanıklılık notu
- IndexedDB yerel CAD recovery aktif.
- Sculpt geometri değişiklikleri recovery snapshot tetikler.
- Sürekli marjin çizimi ve bağlamsal Delete/Backspace davranışı aktif.
- Yüksek yoğunluklu scan için adaptif render/kernel geometri yolu mevcut.
- `npm run verify:cad-workflow` release doğrulamasına eklendi.


## RC18 Feature Freeze
- Faz 1 kapsamı bu sürümle donduruldu: Klinik + Lab + CAD + Kurye + AYA + Operasyon Merkezi.
- RC19 ve RC20'de yeni ana özellik eklenmeyecek; QA, güvenlik, performans, build/deploy ve pilot düzeltmeleri yapılacak.
- Hasta modülü sonraki fazda kalır.
