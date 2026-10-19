# AYA Copilot QA

## Core
- [ ] /ai clinic hesabında açılır
- [ ] /ai lab hesabında açılır
- [ ] courier role logistics'e yönlendirilir / AYA klinik-lab odağı görünür
- [ ] vaka seçince context yeniden yüklenir
- [ ] risk skoru görünür
- [ ] next-best-action link doğru route'a gider

## Commands
- [ ] Şimdi Ne Yapmalıyım
- [ ] Risk Radarı
- [ ] Eksik Bilgi
- [ ] Tarama
- [ ] CAD
- [ ] Finance
- [ ] Delivery
- [ ] custom prompt

## Privacy
- [ ] lab context clinic_case_finance sorgulamaz
- [ ] cloud payload patient_reference içermez
- [ ] cloud payload clinical_notes/lab_notes/message body içermez
- [ ] API key client bundle'a girmez

## Cloud fallback
- [ ] DENTAYA_AI_CLOUD_ENABLED=false → AYA Core
- [ ] API key yok → AYA Core
- [ ] model timeout → AYA Core + notice
- [ ] configured → model badge

## Robot
- [ ] idle animation
- [ ] thinking state
- [ ] alert state high risk
- [ ] risk core score
- [ ] mobile layout

## Integration
- [ ] /cases/<id> → AYA Analiz
- [ ] /ai?case=<id> doğru vakayı seçer
- [ ] WorkspaceLauncher "AYA Copilot"
- [ ] Finance link "AYA Copilot"

## Voice
- [ ] AYA Okusun
- [ ] Sesi Durdur
