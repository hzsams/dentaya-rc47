npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify
> npm run verify:runtime && npm run verify:release && npm run verify:security && npm run verify:localization && npm run verify:aya && npm run verify:local-aya && npm run verify:aya-core && npm run verify:language-packs && npm run verify:desktop-language && npm run verify:experience && npm run verify:cad-display && npm run verify:performance && npm run verify:pilot && npm run lint -- --max-warnings=0 && npm run typecheck && npm run verify:cad && npm run verify:cad-setup && npm run verify:cad-interaction && npm run verify:cad-workflow && npm run verify:cad-panel && npm run verify:migrations && npm run verify:e2e && npm run verify:operations && npm run build

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:runtime
> node scripts/verify-runtime.mjs

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
PASS · Node.js 22+ · v24.19.0
PASS · npm 11+ · 11.9.0
Runtime verification PASS (2/2)
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:release
> node scripts/verify-release.mjs

PASS: package, lockfile, runtime release, client identifier and installer agree.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:security
> node scripts/verify-security.mjs

PASS · nosniff header
PASS · frame deny
PASS · HSTS
PASS · courier geolocation allowed only to self
PASS · camera remains disabled
PASS · request guard has rate budget
PASS · request guard checks JSON
PASS · request guard checks content length
PASS · AYA authenticated
PASS · AYA rate limited
PASS · AYA body capped
PASS · geocode authenticated
PASS · geocode admin restricted
PASS · geocode rate limited
PASS · routes authenticated
PASS · routes rate limited
PASS · health details auth-gated
PASS · health no-store
PASS · release env has no public service role assignment
PASS · release env has no public OpenAI key
PASS · server maps keys are not public
Security verification PASS (21/21)
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:localization
> node --import tsx scripts/verify-localization.ts

PASS: 31 locales / all 24 EU official locales; 220 existing strings×19 translations, 37 bootstrap strings×11 new EU locales; 4512 full-pack source keys; all 75 UI renderers connected (76 files total, including runtimes). Templates/entities/unknown user text safe. Full 31-language catalogs are NOT bundled.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:aya
> node --import tsx scripts/verify-aya-request.ts

PASS AYA request: declared and streamed body limits, malformed JSON, allowlisted language, unchanged diagnostic. Provider/auth mocked.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:local-aya
> node scripts/verify-local-aya.cjs

PASS local AYA: fixed loopback, no credentials, local-only model filtering, remote-model rejection, language, bounded history, empty response, owner cancellation, concurrency, download progress, missing runtime. Inference mocked.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:aya-core
> node scripts/verify-aya-core.cjs

PASS AYA Core: bounded role/style/options, relevant document retrieval, unknown-topic fallback, Unicode/CJK tokens, translated document search, explicit note opt-in, guide labelled separately. No inference performed.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:language-packs
> node scripts/verify-language-packs.cjs

PASS: 4512 complete source keys, resume/cancel/reload, model verification, fixed loopback, no live user data, JSON/placeholders/FDI-number validation, import integrity and corrections. Inference mocked; no translation quality claim.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:desktop-language
> node scripts/verify-desktop-language.cjs

PASS desktop language IPC: owner/top-frame/origin checks, cancel ownership, CAD window access, localized menu roles/accelerators and persistence, stale activation guard, chat/translation busy race. Electron windows and model inference mocked.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:experience
> node --import tsx scripts/verify-experience.ts

PASS: camera presets orbit outside model, exact endpoints, instant mode; 8 textures / 7 events, bounded levels/pitch, valid clock fallback, overnight/daytime/all-day quiet-hour boundaries.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:cad-display
> node --import tsx scripts/verify-cad-display.ts

PASS: per-layer visibility, opacity bounds/depth, geometry unchanged, shared jaw coordinates, context click threshold.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:performance
> node scripts/verify-performance.mjs

PASS · Next compression enabled
PASS · route cache avoids Google call storms
PASS · live GPS throttled to 15 seconds
PASS · stationary GPS writes suppressed
PASS · stationary GPS keeps heartbeat
PASS · network recovery refreshes logistics
PASS · CAD recovery remains enabled
PASS · CAD large mesh adaptation remains present
Performance verification PASS (8/8)
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:pilot
> node scripts/verify-pilot-candidate.mjs

PASS · package and lock release agree
PASS · feature freeze retained
PASS · RC19 QA retained
PASS · RC20 setup guide
PASS · RC20 final checklist
PASS · Windows one-click setup
PASS · 23+ migrations packaged
PASS · Operations Center route
PASS · Ops Health route
PASS · Pilot Check route
PASS · Release Check route
PASS · Health API
PASS · Maps Geocode API
PASS · Maps Routes API
PASS · AYA API
PASS · verify:env script wired
PASS · verify:runtime script wired
PASS · verify chain includes pilot candidate
PASS · final verification command wired
Pilot candidate verification PASS (19/19)
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 lint
> eslint . --max-warnings=0

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 typecheck
> tsc --noEmit

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:cad
> node --import tsx scripts/verify-cad-kernel.ts

{
  "status": "pass",
  "mesh": {
    "vertices": 34,
    "triangles": 64,
    "watertight": true
  },
  "bvh": {
    "nodes": 31,
    "testedTriangles": 32
  },
  "crownShell": {
    "triangles": 2104,
    "minimumWallMm": 0.8
  },
  "registration": {
    "pairs": 1053,
    "rms": 0
  }
}
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:cad-setup
> node --import tsx scripts/verify-cad-job-setup.ts

CAD job setup verification: PASS
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:cad-interaction
> node scripts/verify-cad-interaction.mjs

✓ pointerdown sculpt başlangıcı
✓ pointermove sürekli sculpt
✓ pointerup sculpt bitişi
✓ pointer cancel güvenliği
✓ pointer capture
✓ basılı tutma tekrar motoru
✓ tek stroke undo snapshot
✓ kalem basınç desteği
✓ Ekle kısayolu
✓ Çıkar kısayolu
✓ Yumuşat kısayolu
✓ Düzleştir kısayolu
✓ Space geçici orbit
✓ fırça yarıçap kısayolları
✓ undo redo kısayolları
✓ kısayol yardım paneli
✓ 3D dairesel fırça imleci
✓ fırça imleci gerçek radius ölçeği
✓ mouse wheel radius
✓ shift wheel strength
✓ shift alt geçici ters sculpt
✓ ekle çıkar yön takası
✓ sculpt OS cursor gizleme
✓ wheel yardım metni
✓ sağ mouse orbit
✓ orta mouse pan
✓ sculpt hızlı zoom
✓ context menu engeli
✓ brush hardness
✓ brush falloff
✓ fırça presetleri
✓ X Y sculpt symmetry
✓ mirror brush cursor
✓ simetri kısayolu
✓ kullanıcı özel kısayollar
✓ kısayol çakışma kontrolü

CAD interaction verify PASS (36/36).
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:cad-workflow
> node scripts/verify-cad-workflow.mjs

✓ IndexedDB recovery store
✓ Recovery draft geometry
✓ Recovery capture API
✓ Recovery restore API
✓ Recovery banner
✓ Recovery discard action
✓ Debounced recovery autosave
✓ Undo history state
✓ Undo/redo counters UI
✓ Continuous margin drawing
✓ Margin surface projection
✓ Delete last margin point
✓ Delete last measurement
✓ Delete last connector
✓ Cancel pending CAD action
✓ Large scan adaptive mode
✓ Performance telemetry badge
✓ Geometry commit tracking
CAD workflow verify PASS (18/18)
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:cad-panel
> node scripts/verify-cad-panel.mjs

PASS: professional scene, object tree, manual tool bindings, vector glyphs, accessible state, real panel bounds, shortcuts and responsive layout.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:migrations
> node --import tsx scripts/verify-migrations.ts

{
  "status": "pass",
  "migrations": 26,
  "publicTables": 42,
  "tablesWithoutRls": [],
  "insecureSecurityDefiners": [],
  "privateStorageBucket": true,
  "workflowFunctions": [
    "dentaya_assign_courier",
    "dentaya_complete_delivery",
    "dentaya_create_case_shipment",
    "dentaya_log_operational_event",
    "dentaya_record_route_snapshot",
    "dentaya_review_design",
    "dentaya_shipment_actual_distance_meters",
    "dentaya_submit_design_version",
    "dentaya_transition_case",
    "guard_case_status_transition",
    "guard_courier_location_insert",
    "guard_design_review_decision",
    "guard_shipment_transition",
    "notify_shipment_eta_threshold",
    "organization_route_address",
    "require_delivery_proof_before_delivered",
    "sync_open_shipments_from_org_address"
  ],
  "workflowTriggers": [
    "case_design_reviews_guard_decision",
    "cases_guard_status_transition",
    "courier_locations_guard_insert",
    "shipments_guard_transition",
    "shipments_require_delivery_proof",
    "trg_notify_shipment_eta_threshold",
    "trg_sync_case_status_from_shipment",
    "trg_sync_open_shipments_from_org_address"
  ],
  "activeShipmentUniqueIndex": true,
  "routeAddressColumns": [
    "address_city",
    "address_formatted",
    "address_lat",
    "address_line1",
    "address_lng",
    "address_place_id",
    "address_verified_at",
    "dropoff_address_text",
    "pickup_address_text"
  ],
  "courierOpsColumns": [
    "actual_distance_meters",
    "actual_duration_seconds",
    "eta_at",
    "planned_distance_meters",
    "planned_duration_seconds",
    "remaining_distance_meters",
    "remaining_duration_seconds",
    "route_calculated_at",
    "route_polyline"
  ],
  "deliveryProofTableWithRls": true,
  "operationalEventsTableWithRls": true,
  "operationalEventsAdminPolicy": true,
  "operationsSettingsTableWithRls": true,
  "operationsSettingsPolicies": 3,
  "operationsSettingsUpdatedAtTrigger": true
}
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:e2e
> node --import tsx scripts/verify-e2e-workflow.ts

{
  "status": "pass",
  "scenario": "clinic → lab → CAD → ready → route → live courier → ETA alert → delivery proof → delivered",
  "migrations": 26,
  "finalCaseStatus": "delivered",
  "finalShipmentStatus": "delivered",
  "designVersions": 2,
  "designReviews": 2,
  "caseEvents": 10,
  "guardsVerified": [
    "clinic cannot accept lab case",
    "illegal case transition rejected",
    "review decision is final",
    "stale design submission rejected",
    "organization route address snapshotted",
    "second active shipment rejected",
    "pickup without driver rejected",
    "cross-organization courier location rejected",
    "route metrics persisted",
    "15-minute ETA notification emitted once",
    "delivery without proof rejected",
    "delivery proof recorded",
    "shipment regression rejected",
    "delivered case regression rejected"
  ]
}
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 verify:operations
> node --import tsx scripts/verify-operations-center.ts

{
  "status": "pass",
  "metrics": {
    "activeCases": 4,
    "overdueCases": 1,
    "urgentCases": 2,
    "newCases": 0,
    "acceptedCases": 0,
    "designCases": 1,
    "revisionCases": 1,
    "approvalCases": 1,
    "productionCases": 1,
    "qcCases": 1,
    "readyCases": 0,
    "shippedCases": 0,
    "deliveredToday": 1,
    "activeShipments": 2,
    "lateShipments": 1,
    "pickupWaiting": 1,
    "inTransit": 1,
    "capacityLoad": 4,
    "capacityPercent": 100
  },
  "attention": [
    "overdue-c1",
    "late-shipment-s1",
    "revision-c2",
    "capacity-warning",
    "approval-c3",
    "qc-c4",
    "pickup-s2"
  ]
}
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> dentaya-production-rc@1.0.0-rc.30 build
> next build

▲ Next.js 16.3.5 (Turbopack)
✓ Running next.config.ts took 22ms
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry


  Creating an optimized production build ...
✓ Compiled successfully in 5.1s
  Running TypeScript ...
  Finished TypeScript in 9.9s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/36) ...
  Generating static pages using 8 workers (9/36) 
  Generating static pages using 8 workers (18/36) 
  Generating static pages using 8 workers (27/36) 
✓ Generating static pages using 8 workers (36/36) in 550ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /ai
├ ƒ /api/ai-assistant
├ ƒ /api/health
├ ƒ /api/maps/geocode
├ ƒ /api/maps/route
├ ƒ /api/pre-register
├ ○ /appointments
├ ○ /cases
├ ƒ /cases/[id]
├ ○ /clinic
├ ƒ /community
├ ƒ /community/post/[id]
├ ƒ /community/profile/[handle]
├ ○ /design
├ ○ /finance
├ ○ /invite
├ ○ /lab
├ ○ /labs
├ ○ /logistics
├ ○ /manifest.webmanifest
├ ○ /messages
├ ○ /notifications
├ ○ /operations
├ ○ /ops-health
├ ○ /patients
├ ○ /pilot-check
├ ○ /pilot-flow
├ ○ /release-check
├ ○ /robots.txt
├ ○ /scan-studio
├ ○ /scans
├ ○ /settings
├ ○ /start
├ ○ /team
├ ○ /training
├ ○ /twin
└ ○ /workspace


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

