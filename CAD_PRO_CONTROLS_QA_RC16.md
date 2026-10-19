# RC16 CAD Pro Controls QA

## Otomatik doğrulama

```bash
npm run verify:cad-interaction
```

Beklenen: **36/36 PASS**.

## Manuel kabul senaryosu
1. Design ekranında `Ekle` aracını seç.
2. Sol mouse basılı tutup sürükle; tek sürekli darbe oluşmalı.
3. Sağ mouse sürükle; araç değişmeden kamera dönmeli.
4. Orta mouse sürükle; görünüm pan yapmalı.
5. Mouse wheel ile brush radius, Shift + wheel ile güç değişmeli.
6. Ctrl/Cmd + wheel ile brush değişmeden kamera zoom yapmalı.
7. Detay / Standart / Hacim presetlerini sırayla seç; radius/strength/hardness/falloff değişmeli.
8. Simetriyi aç, X eksenini seç ve modelin bir tarafında sculpt yap; karşı tarafta aynalanmış darbe oluşmalı.
9. Y eksenine geç; mirror yönü değişmeli.
10. Simetri offsetini değiştir; ikinci brush HUD halkasının düzlemi kaymalı.
11. `H` ile kısayol panelini aç, bir araç tuşunu değiştir ve yeni tuşla aracı çağır.
12. Aynı tuşu ikinci araca vermeye çalış; sistem çakışmayı reddetmeli.
13. Sayfayı yenile; kullanıcıya özel shortcut eşlemesi korunmalı.
14. `Varsayılana dön` ile default eşlemeler geri gelmeli.

## Regresyon
- Ctrl/Cmd+Z ve Redo çalışmalı.
- Space geçici orbit davranışı korunmalı.
- Shift/Alt Add/Remove inversion korunmalı.
- Tek sculpt stroke tek Undo ile geri alınmalı.
- Form alanına yazarken CAD shortcutları tetiklenmemeli.
