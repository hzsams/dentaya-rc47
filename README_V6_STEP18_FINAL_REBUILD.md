# DentAYA MVP v6 — Step 18 Final Rebuild

Bu paket Step 17 üzerine kümülatiftir ve 30 Eylül MVP freeze öncesi büyük arayüz / AYA / CAD toparlamasıdır.

## 1. AYA sohbet arayüzü
- Tek çıktı kutusu yerine gerçek sohbet akışı
- Kullanıcı ve AYA için ayrı konuşma balonları
- Son AYA session kayıtları konuşmaya dahil edilir
- Loading / düşünme durumu konuşmada görünür
- Son yanıtı kopyalama ve sesli okuma korunur
- Sağ panel sadeleştirildi; tekrarlayan history paneli kaldırıldı

## 2. AYA platform kontrolü
AYA, vaka analizinin yanında şu gerçek işlemleri yapmaya devam eder ve genişletilir:
- Tema / font / motion / panel stili
- Bildirim tercihleri
- Modül navigasyonu
- Çalışma alanı yoğunluğu
- Modül simgelerini göster / gizle
- Lobi AYA kartını göster / gizle
- Operasyon özetini göster / gizle
- Kart stilini soft / outlined / minimal yapma

## 3. Global AYA dock
ConnectionStatus / WorkspaceLauncher kullanılan ekranlarda sabit AYA düğmesi vardır. Kullanıcı hangi sayfadaysa o sayfa yolu AYA'ya yardım sorusu olarak gönderilir.

## 4. Modül ikon sistemi
Yeni `DentayaIcon.tsx` ile bağımsız SVG ikon seti eklendi.
- Lobi modülleri
- Klinik modülleri
- Lab modülleri
- Hızlı Git
- Ayarlar navigasyonu

## 5. Kişiselleştirilebilir çalışma alanı
Yeni local workspace personalization katmanı:
- density
- card style
- header scale
- module icons
- lobby AYA visibility
- attention summary visibility
- centered content

Dosya: `src/lib/dentaya-workspace-personalization.ts`

## 6. Tipografi ve spacing düzeltmesi
Global theme runtime içinde:
- ortak font ailesi
- başlık line-height
- başlık + açıklama boşluğu
- paragraf line-height
- card density CSS değişkenleri
- heading scale CSS değişkeni
- module icon visibility kontrolü

## 7. DentAYA Design v2
CAD arayüzü tekrar düzenlendi:
- Yeni sol workflow tool rail
- Nesne / kaynak paneli ikinci kolon
- Geniş merkez viewport
- Context-sensitive inspector
- Odak Modu
- Canlı QC dock
- Wizard / Expert korunur
- mevcut margin / undercut / anatomy / sculpt / contact proxy / thickness proxy / section / measure / version / review fonksiyonları korunur

### Doğruluk sınırı
Bu değişiklik Exocad'in proprietary kernel'ini kopyalamaz ve Exocad parity iddiası değildir. DentAYA'nın bağımsız browser CAD workstation UX'idir. Gerçek üretim kernel'i için BVH/half-edge, segmentation, intaglio, cement-gap surface, blockout, watertight boolean, true wall-thickness, collision, anatomy library, articulator, implant/CAM gibi ileri çalışmalar gerekir.

## 8. AYA robot assetleri
Robot state PNG'leri alfa kanallı / şeffaf asset olarak kullanılır. Görselin kendi arka planı UI sahnesine gömülmez; DentAYA sahnesi CSS tarafında ayrı oluşturulur. Bu, kes-yapıştır / green-screen hissini azaltır.

## QA
TypeScript `transpileModule` tabanlı sözdizimi kontrolü:
- 53 TS/TSX dosyası
- 0 syntax error

Gerçek Next.js build bu overlay paketinde `node_modules` / proje package metadata olmadığı için kullanıcıdaki ana repo üzerinde çalıştırılmalıdır.
