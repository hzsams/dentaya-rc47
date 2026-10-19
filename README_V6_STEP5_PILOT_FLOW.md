# DentAYA MVP v6 — Step 5: Pilot Flow Center

Bu paket Step 4C Pilot Ready üzerine gerçek veriyi okuyan uçtan uca pilot akış merkezi ekler.

## Yeni route

```text
/pilot-flow
```

## Amaç

Bir vaka için aşağıdaki zinciri tek ekranda doğrulamak:

```text
Vaka
→ Tarama
→ Hekim ↔ Teknisyen mesajı
→ CAD
→ Klinik tasarım kararı
→ Lab fiyatı
→ Klinik hasta fiyatı (yalnız klinik)
→ Kurye
→ Teslim
```

## Gerçek veri

Pilot ilerlemesi statik checklist değildir.

Aşağıdaki tablolar okunur:

```text
cases
scan_sessions
case_messages
design_projects
case_design_reviews
lab_case_quotes
clinic_case_finance (yalnız clinic role)
shipments
case_events
```

## Privacy boundary

Laboratuvar rolünde:

```text
clinic_case_finance
```

hiç sorgulanmaz.

Bu ekran hasta fiyatını laboratuvar tarafına taşımamak için rol sınırını korur.

## Tutarlılık denetimi

Pilot ekranı bazı süreç çelişkilerini otomatik yakalar:

- production/QC/ready/delivered ama approved review yok
- case status approval ama pending review yok
- shipment delivered ama case status delivered değil
- sent quote <= 0
- clinic tahsilatı net fiyatı aşmış

## Sıradaki doğru adım

İlk eksik adım otomatik bulunur ve doğrudan ilgili route'a link verir.

Örnek:

```text
CAD eksik
→ /design?case=<id>
```

```text
Mesaj eksik
→ /cases/<id>?tab=messages
```

```text
Kurye eksik
→ /cases/<id>?tab=delivery
```

## Pilot raporu

`Pilot Raporunu Kopyala` butonu:

- kurum
- rol
- vaka
- durum
- ilerleme
- tarama
- mesaj
- CAD
- review
- fiyat
- shipment
- tutarlılık

özetini panoya kopyalar.

Bug raporu gönderirken bu metin doğrudan kullanılabilir.

## Kurulum

`DentAYA_MVP_v6_Step5_PilotFlow` klasörünün içeriğini:

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

Test sırası:

```text
/pilot-check
→ /pilot-flow
→ bir vaka seç
→ ilk eksik adıma git
→ işlemi yap
→ /pilot-flow'a dön
```

Bu aşamadan sonra yeni büyük modül açmak yerine pilot sırasında çıkan gerçek buglar kapatılmalıdır.
