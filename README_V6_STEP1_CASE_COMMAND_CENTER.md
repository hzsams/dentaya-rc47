# DentAYA MVP v6 — Adım 1: Vaka Komuta Merkezi

Bu paket, yeşil build alınan `DentAYA_MVP_UX_v5_BuildFix_01` sürümünün üzerine ilk MVP hardening adımını ekler.

## Yeni route

```text
/cases/[id]
```

Vakalar listesinde zaten kullanılan detay linki artık gerçek bir **Vaka Komuta Merkezi** açar.

## Tek ekranda ne var?

Üst bölüm:
- vaka numarası
- hasta referansı
- vaka türü
- FDI diş kodları
- durum
- öncelik
- termin
- klinik
- laboratuvar
- materyal
- renk
- rol bazlı tek ana aksiyon

Sekmeler:
- Genel Bakış
- Taramalar
- Mesajlar
- CAD & Onay
- Fiyat
- Kurye
- Geçmiş

## Rol bazlı ana aksiyon

### Klinik
- Onay aşamasında: `Tasarımı İncele`
- Hazır/yolda: `Teslimatı Aç`
- Diğer aşamalarda: laboratuvar iletişimi

### Laboratuvar
- Yeni: `Vakayı Kabul Et`
- Kabul: `Tarama / CAD Başlat`
- Tasarım: `DentAYA Design'ı Aç`
- Onay: klinik onayı bekleme durumu
- Üretim: `Kalite Kontrole Gönder`
- Kalite Kontrol: `Teslimata Hazır`
- Hazır/Yolda: kurye süreci

## Klinik tasarım kararı

Klinik, bekleyen `case_design_reviews` kaydında:
- Tasarımı Onayla
- Revizyon İste

aksiyonlarını kullanabilir.

Onay:
```text
review -> approved
case -> production
```

Revizyon:
```text
review -> revision_requested
case -> design
```

Her iki işlem de `case_events` geçmişine yazılır.

Not: `design_projects` ve `design_versions` klinik tarafından doğrudan güncellenmez; mevcut RLS sınırı korunur.

## Vaka mesajları

`case_messages` bu ekranın içinde kullanılır.
Mesaj:
- kullanıcı
- kurum
- rol
- zaman
- vaka

bağlamında tutulur.

Realtime `case_messages` ve `case_events` aboneliği vardır.

## Taramalar

Vaka-linked `scan_sessions` listelenir:
- Klinik / Lab kaynağı
- tarama amacı
- ark
- tarayıcı
- bütünlük
- tarih

Yeni tarama:
```text
/scan-studio?case=<caseId>
```

Lab için:
```text
/design?case=<caseId>
```

## Fiyat

Klinik:
- Lab maliyeti
- Hastaya net fiyat
- Tahsil edilen

Laboratuvar:
- yalnızca kliniğe verdiği lab fiyatı

Mevcut RLS ayrımı korunur. Lab, klinik hasta fiyatını göremez.

## Kurye

Vakayla ilişkili `shipments` burada özetlenir.
Detay ve canlı takip `/logistics` üzerinden devam eder.

## Geçmiş

`case_events` ile:
- durum değişiklikleri
- tasarım onayı
- revizyon
- diğer vaka olayları

tek zaman çizgisinde gösterilir.

## Kurulum

`DentAYA_MVP_v6_Step1_CaseCommandCenter` klasörünün içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Sonra:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build temizse:

```powershell
npm.cmd run dev
```

Test:

```text
/cases
→ herhangi bir vakayı Aç
→ /cases/<id>
```

## Sonraki adım

Adım 2:
**Akıllı Bildirim Merkezi**

Plan:
- Yeni vaka
- tasarım onayı
- revizyon
- lab fiyatı
- üretim/QC
- kurye
- ödeme

bildirimlerini ilgili vaka route'una bağlamak.
