# DentAYA RC16 — CAD Pro Controls

## Amaç
RC16, DentAYA Design içinde sculpt işlemini profesyonel CAD/3D çalışma alışkanlıklarına yaklaştırır. Hasta modülü veya Faz 2 kapsamı açılmadan yalnızca Faz 1 CAD çekirdeği ve kullanıcı etkileşimi geliştirilmiştir.

## Eklenenler
- Sculpt dışındaki araç değişimine gerek kalmadan **sağ mouse ile orbit**.
- Her araçta **orta mouse ile pan**.
- Sculpt sırasında `Ctrl/Cmd + mouse wheel` ile hızlı zoom.
- Detay / Standart / Hacim fırça presetleri.
- `brush_hardness` ve `brush_falloff` ile daha kontrollü yüzey etkisi.
- X veya Y ekseninde gerçek sculpt symmetry/mirror.
- Simetri düzlemi için ±5 mm offset.
- Ana fırça halkasına ek olarak aynalanmış ikinci HUD halkası.
- Simetri düzlemine çok yakın darbelerde çift güç uygulanmasını engelleyen merkez toleransı.
- Kullanıcıya özel Ekle, Çıkar, Yumuşat, Düzleştir, Marjin, Ölçüm, Connector, Orbit ve Simetri kısayolları.
- Kısayol çakışma kontrolü ve tek tuşla varsayılana dönüş.
- Kişisel shortcut eşlemeleri kullanıcı kimliği bazında localStorage üzerinde saklanır.

## Korunan RC14/RC15 davranışları
- Basılı tut + sürükle sürekli sculpt.
- Hareket etmeden basılı tutmada kontrollü tekrar.
- Tek stroke = tek Undo snapshot.
- Kalem pressure desteği.
- Mouse wheel radius, Shift + wheel strength.
- Shift/Alt ile geçici Add ↔ Remove ters yön.
- Surface-aware brush cursor.

## Sürüm
`1.0.0-rc.16`

## Doğrulama
`npm run verify:cad-interaction` RC16 paketinde 36/36 etkileşim kontrolü yapar.
