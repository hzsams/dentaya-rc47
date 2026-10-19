# DentAYA Production RC19 — Full QA / Security / Performance

RC19 is the post-feature-freeze hardening release. No patient-phase features were opened and no new Phase 1 workflow was added. The release focuses on security boundaries, API cost protection, courier reliability, release consistency and automated quality gates.

## Security hardening
- Fixed the global Permissions-Policy so the courier page may use browser geolocation only from the DentAYA origin (`geolocation=(self)`). Camera, microphone, payment and USB stay disabled by default.
- Added `X-DNS-Prefetch-Control: off` while retaining HSTS, `X-Frame-Options: DENY`, `nosniff` and strict referrer policy.
- Added a shared server request guard for JSON content-type validation, request-size limits and bounded per-instance request budgets.
- AYA cloud requests now require an authenticated Supabase user, accept only JSON, cap request size and allow 12 requests/minute per authenticated user per server instance.
- Google Geocoding remains owner/admin only and is now additionally body-capped and limited to 20 requests/5 minutes per authenticated user per server instance.
- Google Routes remains authenticated/RLS scoped and is now body-capped and limited to 90 requests/minute per authenticated user per server instance.
- `/api/health` keeps the public readiness signal but exposes detailed service configuration only to an authenticated session. Detailed responses are no-store/noindex.
- Release environment examples continue to keep OpenAI, Routes and Geocoding secrets server-only.

## Performance / reliability hardening
- Courier live tracking keeps the existing 15-second write throttle.
- Stationary GPS jitter no longer creates a database row every interval: movement under 8 m is suppressed for up to 60 seconds, while a periodic heartbeat is still retained.
- Existing 20-second Google Routes cache, reconnect refresh, CAD recovery and large-mesh adaptive workflow remain enforced by RC19 performance gates.

## Release consistency
- Package, lock file, release metadata, Supabase client-info and environment build labels now all report `1.0.0-rc.19`.
- Manual release gate storage was moved to an RC19-specific namespace so old sign-offs are not accidentally reused.
- Added `verify:release`, `verify:security` and `verify:performance` and placed them at the beginning of the aggregate `verify` pipeline.

## Scope
RC18 feature freeze remains active. RC19 changes are hardening and QA only. Next release is RC20 Final Pilot Candidate / setup.
