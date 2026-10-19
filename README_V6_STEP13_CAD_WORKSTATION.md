# DentAYA MVP v6 — Step 13 CAD Workstation Rebuild

Bu paket Step 12 üzerine CAD ekranının yerleşimini baştan düzenler.

## Yeni workstation düzeni

### Üst bar
- Daha ince ve profesyonel workstation header
- Vaka seçici
- FDI / materyal / shade / proje statüsü mini fact alanı
- Wizard / Expert switch
- AYA hızlı erişim
- Kaydet / Review'a Gönder aksiyonları

### Workflow rail
- Scan
- Margin
- Anatomy
- Contacts
- Check
- Final

İlerleme yüzdesi ayrı kompakt workflow barında görünür.

### Sol panel
Sadece kaynak / sahne yönetimi:
- Objects
- Scan mesh görünürlüğü
- Restorasyon görünürlüğü
- Margin / measurement durumu
- Scan/file sources
- Versions

Vaka bilgi kartı sol panelden kaldırıldı; viewport alanı büyütüldü.

### Orta viewport
CAD ekranının ana alanı artık 3D viewport.
- aktif workflow adımına göre contextual tools
- Wizard modunda gereksiz tool'lar gizlenir
- Expert modunda tüm tool'lar açılır
- active analysis modes workflow'a göre filtrelenir
- Undo / redo / fit ayrı tutulur
- orientation HUD korunur
- viewport görsel olarak çerçevelendi ve workstation hissi güçlendirildi

### Sağ inspector
Yalnız aktif adımın ayarları önde kalır.
Expert mode tüm ayarlara erişir.

AYA CAD Copilot mini paneli inspector içine eklendi:
- scan source eksikliği
- margin eksikliği
- contacts kontrolü
- thickness / section kontrolü
- review readiness

gibi operasyonel sinyallere göre kısa yönlendirme yapar.

## AYA deep link fix

`/ai?case=<id>&prompt=<text>` artık prompt'u AYA composer'a gerçekten aktarır.

## Davranış düzenlemesi

Workflow değişince mevcut tool/view yeni adımda geçerli değilse otomatik olarak güvenli varsayılana döner:

```text
Tool → orbit
View → natural
```

Bu sayede gizli bir tool aktif kalıp kullanıcıyı şaşırtmaz.

## CAD truth boundary

Bu UX rebuild'tir ve mevcut Step 9 geometri motorunu kullanır.

- margin spline mevcut
- insertion axis mevcut
- undercut orientation mevcut
- contact nearest-distance preview mevcut
- clearance/thickness proxy mevcut
- section / wireframe mevcut

Ancak hâlâ manufacturing-grade Exocad parity değildir.

## Kurulum

ZIP içindeki klasörü mevcut DentAYA projesinin üzerine birleştir:

```powershell
cd C:\Users\ahmet\dentaya
npm.cmd run build
```

Build yeşilse:

```powershell
npm.cmd run dev
```

Kontrol:

```text
/design
/design?case=<case-id>
```

## Statik syntax kontrolü

Step 13 paketinin `src` altındaki TS/TSX dosyaları TypeScript parser üzerinden kontrol edildi:

```text
FILES=49
SYNTAX_ERRORS=0
```

Bu, gerçek Next.js build yerine geçmez; dependency-aware type check için yerel `npm.cmd run build` sonucu esas alınmalıdır.
