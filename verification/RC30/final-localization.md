npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:localization
> node --import tsx scripts/verify-localization.ts

PASS: 31 locales / all 24 EU official locales; 220 existing strings×19 translations, 37 bootstrap strings×11 new EU locales; 4513 full-pack source keys; all 75 UI renderers connected (76 files total, including runtimes). Templates/entities/unknown user text safe. Full 31-language catalogs are NOT bundled.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:language-packs
> node scripts/verify-language-packs.cjs

PASS: 4513 complete source keys, resume/cancel/reload, model verification, fixed loopback, no live user data, JSON/placeholders/FDI-number validation, import integrity and corrections. Inference mocked; no translation quality claim.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:desktop-language
> node scripts/verify-desktop-language.cjs

PASS desktop language IPC: owner/top-frame/origin checks, cancel ownership, CAD window access, localized menu roles/accelerators and persistence, stale activation guard, chat/translation busy race. Electron windows and model inference mocked.
