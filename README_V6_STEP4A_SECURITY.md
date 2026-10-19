# DentAYA MVP v6 — Adım 4A: Güvenlik + Yetki + Duplicate

Bu paket `Step3_Onboarding` üzerine ilk gerçek MVP hardening turunu ekler.

## 1. RLS / rol sınırları sıkılaştı

- Lab klinik iş emri alanlarını değiştiremez.
- Klinik `lab_notes` değiştiremez.
- Lab `scan_origin=clinic`, klinik `scan_origin=laboratory` taklit edemez.
- Klinik hasta fiyatı laboratuvara açılmaz.
- CAD klinik onayı yalnız `owner/admin/dentist`.
- CAD üretim yazma rolleri `owner/admin/technician`.
- `case_events` append-only.
- Notification içerikleri client tarafından değiştirilemez.
- Shipment vaka / from / to kimliği immutable.
- Courier shipment geçişleri server tarafında doğrulanır.

## 2. Demo kayıtları read-only

Eski geniş demo write politikaları kaldırıldı. Sentetik demo kayıtları okunabilir kalabilir ama client keyfi UPDATE/DELETE yapamaz.

## 3. Dosya güvenliği

`dentaya-files`
- participant read/upload
- update/delete yalnız uploader

`dentaya-demo-files`
- client write kapalı

## 4. SECURITY DEFINER yüzeyi küçültüldü

Supabase security advisor taramasında internal trigger/helper fonksiyonlarının API üzerinden çağrılabildiği görüldü.

Bu fonksiyonların client EXECUTE yetkileri kaldırıldı.

Ayrıca:
- eski non-idempotent case RPC overload kaldırıldı
- kullanılmayan `get_lab_directory` client RPC erişimi kaldırıldı
- yeni idempotent case RPC, sıkı RLS sonrasında `SECURITY INVOKER` yapıldı

Kalan advisor uyarıları bilinçli olarak:
- `create_my_organization` (signed-in onboarding RPC)
- `is_case_participant`
- `is_patient_owner`

Son iki fonksiyon RLS / Storage policy helper'larıdır.

## 5. Duplicate submit koruması

Yeni DB alanı:
```text
client_request_id
```

Kritik işlemler:
```text
UI mutex + request UUID + DB unique index
```

Hasta, vaka, randevu, mesaj ve scan çift tıklamayla çoğalmaz.

## 6. Vaka RPC idempotent

```text
create_case_from_patient(..., p_request_id)
```

Aynı request tekrar gelirse mevcut vaka ID'si döner.

## 7. Scan retry-safe

Scan storage path request UUID içerir:

```text
cases/<case>/scans/<request-id>-file.stl
```

Retry aynı kullanıcı ve aynı istek için aynı storage nesnesi / DB idempotency anahtarı üzerinden çalışır.

## 8. Vaka Komuta Merkezi yetkili aksiyon

Klinik CAD kararı:
```text
owner / admin / dentist
```

Lab operasyon:
```text
owner / admin / technician
```

Viewer gibi read-only roller aksiyon butonu görmez.

## Canlı Supabase migrationları

Uygulandı:

```text
dentaya_mvp_v6_step4a_security_idempotency
dentaya_mvp_v6_step4a_function_execute_hardening
dentaya_mvp_v6_step4a_message_role_hardening
dentaya_mvp_v6_step4a_reduce_rpc_surface
dentaya_mvp_v6_step4a_case_rpc_invoker
```

## Security advisor sonucu

Internal / anon SECURITY DEFINER uyarıları temizlendi.

Kalan:
- 3 bilinçli authenticated SECURITY DEFINER helper/RPC uyarısı
- Supabase Auth `Leaked Password Protection` kapalı uyarısı

Leaked-password ayarı kod migrationı değil, Supabase Auth dashboard ayarıdır.

## Kurulum

ZIP içindeki:

```text
DentAYA_MVP_v6_Step4A_Security
```

klasörünün içeriğini:

```text
C:\Users\ahmet\dentaya
```

ile birleştir.

Sonra:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

## Smoke test

### Duplicate
- Hasta Ekle butonuna hızlı iki kez bas → 1 kayıt
- Yeni Vaka iki kez → 1 vaka
- Randevu iki kez → 1 randevu
- Mesaj Enter + hızlı tık → 1 mesaj
- Scan Kaydet iki kez → 1 scan

### Klinik / Lab sınırı
- Lab başka lab vaka UUID'sini açamamalı
- Lab `clinic_case_finance` görememeli
- Klinik lab-origin scan oluşturamamalı
- Lab clinical-order alanını değiştirememeli

### Courier
İzinli akış:

```text
created
→ pickup_requested
→ picked_up
→ in_transit
→ delivered
```

## Sonraki adım

**4B — Error / Retry + Form Validation + Realtime dayanıklılığı**

- DB hata kodlarını anlaşılır Türkçe mesaja çevirme
- ağ kesilince retry
- realtime reconnect göstergesi
- upload/form validation
- optimistic rollback
