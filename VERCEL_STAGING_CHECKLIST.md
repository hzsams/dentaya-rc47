# Vercel Staging Checklist

1. Vercel'de DentAYA projesinde bir Preview/Staging deployment oluştur.
2. Preview environment variables içinde mevcut Supabase public URL/key ayarlarını doğrula.
3. Secret veya service-role key'i browser environment'a koyma.
4. Build command mevcut projedeki `npm run build` olarak kalsın.
5. Deployment sonrası önce `/pilot-check` aç.
6. Klinik, Lab ve Kurye test hesaplarıyla ayrı oturumlarda smoke test yap.
7. Browser console ve Vercel runtime/build loglarında yeni hata olmadığını kontrol et.
8. Production domain'e geçmeden önce preview URL'de `PILOT_SMOKE_TEST.md` listesini tamamla.

Not: Bu sohbetin Vercel bağlantısında erişilebilir team/project görünmediği için deployment otomatik başlatılmadı. Paket staging'e hazırlandı; Vercel bağlantısı erişilebilir olduğunda deployment doğrudan yapılabilir.
