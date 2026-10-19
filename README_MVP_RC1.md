# DentAYA MVP RC1

Bu paket önceki CAD Professional + UI Polish + Theme Sync paketlerinin üstüne hazırlanmış **kümülatif MVP release-candidate** paketidir. Amaç yeni modül eklemekten çok mevcut ana akışları sadeleştirmek, rol ayrımını netleştirmek ve ürünü pilot/MVP kullanımına daha yakın hale getirmektir.

## 1. Genel arayüz sistemi

- Normal gövde yazısı yaklaşık **15 px**.
- Yardımcı etiketler kritik ekranlarda **12 px altına düşmez**.
- Klinik, lab, mesaj, hasta, lojistik, scan ve CAD ekranlarının kontrastı tema değişimine bağlandı.
- Glass / Soft / Solid panel sistemi devam eder.
- Full / Reduced / Off motion seçenekleri devam eder.
- Compact görünüm ve font ölçeği korunur.

## 2. Renk / tema sistemi

Hazır tema sayısı 18'e çıkarıldı:

- Midnight
- Ocean
- Emerald
- Violet
- Graphite
- Light
- Cobalt
- Aurora
- Rose
- Amber
- Frost
- Obsidian
- Teal
- Navy
- Sand
- Pearl
- Plum
- Slate

Ek olarak **Custom Accent** renk seçici vardır. Kullanıcı hazır paleti koruyup yalnızca DentAYA vurgu rengini istediği renge çevirebilir.

Tema artık ana sayfa, CAD chrome, Scan Studio ve 3D viewer arka planlarına canlı uygulanır.

## 3. Klinik paneli

Klinik tarafının sorumlulukları net tutulur:

- Hastalar
- Dental Twin
- Scan Studio
- Tarama Merkezi
- Klinik Vakaları
- Laboratuvar dizini
- Doktor ↔ teknisyen mesajlaşması
- Randevular
- Lojistik / teslimat takibi
- DentAYA AI operasyon desteği

CAD düzenleme laboratuvar tarafında kalır.

## 4. Laboratuvar paneli

Laboratuvar tarafı:

- Gelen vaka kuyruğu
- Lab Scan Studio
- DentAYA Design
- Klinik onayı / revizyon
- Üretim / QC akışı
- Mesajlar
- Teslimat / lojistik
- DentAYA AI
- Laboratuvar profili

Hasta kayıt yönetimi laboratuvara taşınmaz; lab yalnızca kendisine yönlendirilmiş vaka referanslarıyla çalışır.

## 5. Hasta kaydı

`/patients`

Hasta oluşturma akışı sadeleştirildi.

**Hızlı kayıt için yalnızca Ad + Soyad zorunlu.**

İsteğe bağlı alanlar "Ek bilgileri göster" altında:

- telefon
- e-posta
- doğum tarihi
- cinsiyet
- kan grubu
- alerji
- medikal not
- dental not

Kayıt sonunda tek tıkla:

- Kaydet
- Kaydet + Tarama Aç
- Kaydet + Vaka Aç

seçenekleri vardır.

Gerçek/pilot klinik kaydında consent durumu otomatik `pending` başlar; demo klinikte `demo` kalır.

## 6. Doktor ↔ teknisyen mesajlaşması

`/messages`

- Kurum bazlı konuşma listesi
- okunmamış konuşma özeti
- gerçek zamanlı mesaj
- gönderen adı
- gönderen rolü (Diş Hekimi / Teknisyen / Yönetici vb.)
- mesajı vaka ile ilişkilendirme
- vaka chip'i üzerinden vaka ekranına geçiş
- hazır teknik mesaj şablonları
- sohbet arama
- Enter ile gönderim / Shift+Enter yeni satır

Mesaj tablosuna `sender_role` ve `context_case_id` eklenmiştir.

## 7. Tarama sistemi

### Scan Studio `/scan-studio`

**Klinik:**
- intraoral
- pre-op
- bite
- imported scan

**Laboratuvar:**
- master model
- antagonist
- bite
- die / prep
- wax-up
- pre-op
- imported scan

Yakalama yöntemi metadata'sı:
- intraoral scanner
- desktop scanner
- lab scanner
- photogrammetry
- import
- other

STL / PLY yükleme, lokal 3D preview, mesh point, triangle ve bounding ölçüleri devam eder.

### Tarama Merkezi `/scans`

Artık klinik ve laboratuvar için rol farkındalıklıdır.

Klinik gerçek hasta seçer. Laboratuvar ise RLS gereği gerçek hasta kartını değil kendisine bağlı **vaka / hasta referansı** bağlamını görür.

Filtreler:
- bölge / ark
- Clinic scan / Lab scan
- tüm kaynaklar

Lab tarafında case-bound scan doğrudan **CAD ile Aç** aksiyonuna sahiptir.

3D viewer ve longitudinal compare tema ile senkronize edilmiştir.

## 8. DentAYA Design `/design`

Bu sürümde tasarım alanı web tabanlı dental CAD MVP çekirdeği olarak tutulur:

- Wizard / Expert
- Object tree
- Clinic/Lab scan source tree
- Scan → Margin → Anatomy → Contacts → Thickness → Finalize
- 3D measurement
- Margin points
- Add / Reduce / Smooth
- anatomy preset
- morphology width
- cusp height
- X/Y/Z position
- rotation
- proximal contact offset
- occlusal offset
- contact preview
- thickness preview
- undo / redo
- standard camera views
- autosave
- STL export
- design versioning
- clinic approval handoff
- manufacturing handoff özeti

**Önemli ürün sınırı:** Bu MVP gerçek Exocad/DentalCAD seviyesinde endüstriyel geometri kernel'i, otomatik doğrulanmış margin detection, robust mesh boolean, gerçek antagonist collision engine, CAM nesting veya milling postprocessor varmış gibi davranmaz. Bu işlevler sonraki mühendislik katmanıdır.

## 9. Kurye / lojistik `/logistics`

- rol bazlı çalışma alanı
- aktif / yolda / pickup / teslim KPI
- vaka bağlantılı gönderi listesi
- pickup ve delivery noktaları
- canlı konum / hız / doğruluk bilgisi
- durum progress çizgisi
- kurye hesabında sürücü atama
- Pickup Talebi
- Teslim Aldım
- Yola Çıktım
- Teslim Edildi
- vaka ve kurum isimleri aynı teslimat kaydında

## 10. Randevular `/appointments`

- bugün / yaklaşan / tümü
- hızlı randevu oluşturma
- hasta bağlantısı
- süre / randevu tipi / not
- tamamlandı / iptal
- hastanın Dental Twin / scan geçmişine geçiş

## 11. DentAYA AI `/ai`

MVP'de düşük riskli operasyon desteğine odaklanır:

- vaka özeti
- eksik alan kontrolü
- termin riski
- handoff brief
- son AI kayıtları

AI çıktısı **tanı veya otonom klinik karar değildir**.

## 12. Kurulum

ZIP içindeki `DentAYA_MVP_RC1` klasörünün **içeriğini** proje köküne kopyala:

```text
C:\Users\ahmet\dentaya
```

Aynı isimli dosyalarda **Replace / Değiştir**.

Canlı Supabase projesinde gerekli RC1 migration'ları bu çalışma sırasında zaten uygulandı. `supabase/migrations` klasöründeki SQL dosyaları source-control kaydı içindir; canlı projede tekrar çalıştırman gerekmez.

Ardından:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build temizse:

```powershell
npm.cmd run dev
```

## 13. MVP smoke test sırası

### Klinik hesabı

```text
/ -> /clinic
/clinic -> /patients
Yeni hasta -> Kaydet + Tarama Aç
/scan-studio -> STL/PLY yükle
/scans -> 3D Aç
/cases -> vaka oluştur / aç
/messages -> lab ile vaka bağlamlı mesaj
/appointments -> randevu ekle
/logistics -> vaka gönderisini gör
/settings -> tema / custom accent değiştir
```

### Laboratuvar hesabı

```text
/ -> /lab
/lab -> /scan-studio
Master model / antagonist yükle
/design -> case scan kaynağını aç
Margin / Anatomy / Contact / Thickness
Send for Approval
/messages -> klinik ile vaka bağlamlı mesaj
/logistics -> teslimat
/settings -> lab profili / tema
```

## 14. Bu release sonrasında

Yeni büyük ekran eklemek yerine öncelik:

1. gerçek proje build sonucu,
2. uçtan uca vaka testi,
3. RLS / Storage yetki testi,
4. mobil ve tablet responsive kontrol,
5. boş-state / error-state testi,
6. Vercel staging deploy,
7. pilot kullanıcı testi.
