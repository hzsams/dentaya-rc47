# DentAYA RC47 — yerel AYA ve CAD araçları

RC46 üzerine başlanan AYA çalışmasının kaynak güncellemesidir. Sürüm: `1.0.0-rc.47`, AYA Core: `0.5.0`. Model hazırken normal konuşmalar modele gider; çalışma belleği hedefi ve kararları taşır. CAD paneli gerçek çalışma bağlamıyla mevcut araçları önerir; işlemler kullanıcı tıklaması ve güncel durum kontrolüyle çalışır. Manuel CAD modelden bağımsızdır.

Başlangıç: [KURULUM.txt](KURULUM.txt). Kullanım: [RC47_KULLANIM.md](RC47_KULLANIM.md). Test sonuçları ve açık sınırlar: [RC47_KONTROL_RAPORU.md](RC47_KONTROL_RAPORU.md).

Bu paket tam kaynak içerir; Windows Setup EXE'si, model ağırlıkları veya kişisel bağlantı ayarları içermez. Gerçek yerel model ve Windows paketleme durumunu test raporundan okuyun. Klinik/üretim onayı değildir.

Node.js 22.12+ ve npm 11+ gerekir. `npm ci` ve `npm run verify` temel kontrollerdir. `npm run verify:aya-conversation-browser` ve `npm run verify:cad-daily-browser` Playwright/Chromium gerektirir; harici kurulum `DENTAYA_PLAYWRIGHT_MODULE` ve `DENTAYA_CHROMIUM_PATH` ile seçilebilir. Bu kontrolleri sırayla çalıştırın; tarayıcı testi geçici bir route oluşturur. `npm run dev -- --hostname 127.0.0.1 --port 3010` web arayüzünü, `npm run desktop:dev` Electron köprüsünü başlatır. Yerel sohbet hesap veya bulut API anahtarı istemez; gerçek vaka ve sunucu kaydı için mevcut Supabase ayarları gerekir.

`CODEX_BASLANGIC_PROMPTU.md` ve `CODEX_DEVIR_NOTLARI.md` ilk RC46/WIP devir kayıtlarıdır. Eski RCxx raporları RC47 test sonucu olarak kullanılmaz. Web sitesi deposu ayrıdır.
