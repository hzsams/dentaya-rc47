# DentAYA MVP v6 — Step 15 / RC2 Pilot Freeze

Bu paket Step 14 üzerine kümülatiftir ve 30 Eylül MVP freeze hazırlığına odaklanır.

## Değişiklikler

- Release metadata `0.1.0-rc.2` olarak güncellendi; 30 Eylül freeze hedefi merkezi hale getirildi.
- Global tipografi runtime'a taşındı. Body ve tüm form kontrolleri aynı DentAYA font zincirini miras alır.
- Öğrenim Rehberi interaktif hale getirildi. Rol bazlı adımlar cihazda işaretlenebilir ve ilerleme yüzdesi gösterilir.
- Release Check RC2 olarak yeniden düzenlendi. Otomatik teknik gates + kullanıcı tarafından gerçekten test edilmesi gereken manuel kabul kapıları ayrı gösterilir.
- Ana Supabase veri yüzeyleri için güvenli read-access kontrolleri eklendi.
- Kullanım Kılavuzu kapsamlı şekilde genişletildi.
- Ayrı `MVP_LEARNING_PATH.md` ve `MVP_FINAL_ACCEPTANCE.md` eklendi.

## Truthfulness

- AYA Core deterministik operasyon karar desteğidir; bulut model opsiyoneldir.
- DentAYA Design üretim/kernel parity iddiası taşımaz.
- Scan kalite metrikleri klinik validasyon değildir.
- Release Check'teki manuel işaretler CI/CD veya klinik onay yerine geçmez.

## Doğrulama

Bu dağıtım bağımsız tam Next.js repo değil; mevcut DentAYA projesi üzerine kümülatif overlay olarak uygulanır. Bu nedenle gerçek `next build` kullanıcının yerel proje dizininde çalıştırılmalıdır.
