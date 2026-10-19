# DentAYA MVP v6 — Step 4A Security Matrix

## Klinik

| Kaynak | Yetki |
|---|---|
| Kendi hastaları | Okur / oluşturur / günceller |
| Başka kliniğin hastaları | Erişemez |
| Kendi vakası | Okur |
| Klinik iş emri alanları | Klinik rolleri |
| `lab_notes` | Değiştiremez |
| Lab maliyeti | Görür |
| Hasta fiyatı | Görür / klinik tarafında yazar |
| CAD projesi | Görür, düzenleyemez |
| CAD klinik onayı | Owner / Admin / Dentist |
| Lab-origin scan | Görür; lab adına oluşturamaz |
| Başka vaka UUID | RLS engeller |

## Laboratuvar

| Kaynak | Yetki |
|---|---|
| Patient tablosu | Doğrudan göremez |
| Atanmış vaka | Okur |
| Başka labın vakası | Erişemez |
| Klinik iş emri | Değiştiremez |
| `lab_notes` | Owner / Admin / Technician |
| Lab fiyatı | Yazar; klinik görür |
| Hasta fiyatı | Göremez |
| CAD | Owner / Admin / Technician |
| Klinik scan | Yalnız vaka-linked olanı okur |
| Lab scan | Yalnız kendi vakasına ekler |
| Klinik adına scan | Oluşturamaz |

## Kurye

| Kaynak | Yetki |
|---|---|
| Hasta tablosu | Göremez |
| CAD | Göremez |
| Klinik fiyatı | Göremez |
| Lab fiyatı | Göremez |
| Shipment | Atandığı courier org üzerinden |
| Canlı konum | Courier role |
| Shipment route | Courier değiştiremez |
| Shipment status | İzinli sırayla ilerler |

## Duplicate / Idempotency

Kritik create yolları iki katmanla korunur:

1. `useRef` submit mutex
2. DB `client_request_id` unique index

Korunan:
- Hasta
- Vaka
- Randevu
- Kurum mesajı
- Vaka mesajı
- Tarama

`create_case_from_patient(..., p_request_id)` aynı isteği ikinci kez yeni vaka olarak oluşturmaz.

## Immutable server boundaries

İstemci değiştiremez:
- Patient owning organization
- Case patient / clinic / lab identity
- CAD project ownership
- CAD version identity
- Design review submission identity
- Conversation clinic/lab pair
- Notification payload
- Shipment case/from/to identity
