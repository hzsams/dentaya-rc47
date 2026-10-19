# DentAYA MVP v6 — Adım 3: Onboarding + Boş Durumlar

Bu paket Adım 2 Akıllı Bildirim Merkezi üzerine ilk kullanım rehberi ve profesyonel boş durumlar ekler.

## Yeni route

```text
/start
```

Rol bazlı başlangıç rehberi.

### Klinik
1. İlk hastanı oluştur
2. Hastaya tarama bağla
3. Laboratuvara vaka gönder
4. Hasta fiyatını lab maliyetinden ayrı kaydet

### Laboratuvar
1. Gelen işi aç
2. Lab taramasını vakaya bağla
3. DentAYA Design'da çalış
4. Kliniğe lab fiyatını ver

### Kurye
1. Gönderi kuyruğunu aç
2. Ürünü teslim al
3. Teslimatı tamamla

## Progress

Rehber yalnız statik metin değildir.

Klinik için:
- `patients`
- `scan_sessions`
- `cases`
- `clinic_case_finance`

Laboratuvar için:
- `cases`
- `scan_sessions`
- `design_projects`
- `lab_case_quotes`

Kurye için:
- `shipments`

verileri okunur ve tamamlanan adımlar otomatik işaretlenir.

## Persist edilen onboarding durumu

Yeni tablo:

```text
user_onboarding
```

Alanlar:
- user_id
- organization_id
- role_snapshot
- completed
- dismissed
- current_step
- completed_at
- dismissed_at

RLS:
Kullanıcı yalnız kendi onboarding kaydını, üyesi olduğu kurum için okuyabilir/güncelleyebilir.

## Compact guide

Aşağıdaki çalışma alanlarında başlangıç kartı görünür:
- Ana Sayfa
- Klinik
- Laboratuvar
- Kurye

Kullanıcı:
- sıradaki adıma gidebilir
- tüm adımları açabilir
- daha sonra diyebilir
- tamamlandığında rehberi kapatabilir

`/start` her zaman tekrar açılabilir.

## Yeni EmptyStateCard

Yeni ortak bileşen:

```text
src/app/EmptyStateCard.tsx
```

Boş ekranlar artık sadece:

```text
Veri yok.
```

demez.

Kullanıcıya:
- burada ne olması gerektiği
- ilk adımın ne olduğu
- hangi butona basması gerektiği

gösterilir.

Güncellenen alanlar:
- Hastalar
- Vakalar
- Fiyatlandırma
- Randevular
- Taramalar
- Mesajlar
- Kurye

## Ana UX prensibi

DentAYA artık ilk kullanımda kullanıcıya bütün modülleri anlatmaya çalışmaz.

Sadece rolünün ilk 3-4 temel adımını gösterir.

Klinik:
```text
Hasta → Tarama → Vaka → Fiyat / Onay
```

Lab:
```text
Gelen Vaka → Lab Tarama → CAD → Lab Fiyatı
```

Kurye:
```text
Gönderi → Alım → Yolda → Teslim
```

## Kurulum

`DentAYA_MVP_v6_Step3_Onboarding` klasörünün içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Ardından:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build temizse:

```powershell
npm.cmd run dev
```

## Test

Yeni kullanıcı deneyimi:

```text
/
→ Başlangıç kartı
→ /start
→ rol bazlı rehber
```

Klinik:
```text
/patients
→ veri yoksa "İlk hastanı ekle"
```

Vaka:
```text
/cases
→ veri yoksa ilk vaka CTA
```

Tarama:
```text
/scans
→ veri yoksa Yeni Tarama CTA
```

Fiyat:
```text
/finance
→ vaka yoksa Vakalara Git
```

## Sonraki adım

Adım 4:
**MVP Hardening / Güvenlik ve hata dayanıklılığı**

- rol/RLS test matrisi
- dosya erişimi
- duplicate submit koruması
- realtime kopması
- loading / retry
- form validation
- 404 / yanlış URL
- tablet / mobil smoke test
- Vercel staging
