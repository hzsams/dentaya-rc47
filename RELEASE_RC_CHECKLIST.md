# DentAYA 1.0.0-rc.20 — Final Pilot Release Checklist

## Build

```powershell
npm.cmd run verify:env
npm.cmd run verify:final
```

- [ ] Node.js 22+ / npm 11+
- [ ] environment gate green
- [ ] final pilot candidate gate green
- [ ] lint green
- [ ] strict TypeScript green
- [ ] CAD verifier green
- [ ] CAD interaction verifier green
- [ ] CAD workflow verifier green
- [ ] CAD panel verifier green
- [ ] migration verifier green
- [ ] automated E2E workflow verifier green
- [ ] operations-center verifier green
- [ ] production build green

## Environment

- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY veya PUBLISHABLE_KEY
- [ ] service-role hiçbir NEXT_PUBLIC env içinde değil
- [ ] staging release channel
- [ ] staging noindex
- [ ] NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY domain-restricted
- [ ] GOOGLE_MAPS_GEOCODING_KEY server-only
- [ ] GOOGLE_MAPS_ROUTES_KEY server-only

## Runtime

- [ ] /operations loads for clinic/lab/courier
- [ ] overdue/revision/approval/production-QC/shipment metrics match live data
- [ ] lab owner/admin capacity save works and non-admin write is denied
- [ ] AYA daily priority matches the highest operational risk
- [ ] /api/health ready
- [ ] /pilot-check reports Maps Routes + Geocoding ready
- [ ] ETA threshold notification reaches the correct destination organization once
- [ ] AYA workspace summary reports overdue cases / late shipments

- [ ] /release-check
- [ ] /pilot-check
- [ ] /pilot-flow
- [ ] /settings
- [ ] /team

## CAD

- [ ] STL source açılır
- [ ] PLY source açılır
- [ ] margin point
- [ ] smooth margin line
- [ ] insertion axis from view
- [ ] undercut
- [ ] contact map
- [ ] thickness/clearance proxy
- [ ] section
- [ ] wireframe
- [ ] freeform
- [ ] circular brush cursor follows surface and matches brush radius
- [ ] mouse wheel changes brush radius without page scroll
- [ ] Shift + wheel changes brush strength
- [ ] Shift/Alt temporarily inverts Add ↔ Remove
- [ ] undo/redo
- [ ] STL export
- [ ] clinic review handoff
- [ ] sol CAD paneli masaüstünde geniş dikdörtgen olarak kenarlara oturur
- [ ] workflow ve model araçlarında SVG semboller görünür
- [ ] aktif araç sol vurgu çizgisi ve alt sabit aktif-araç satırıyla görünür
- [ ] kısayol rozetleri panelde doğru tuşları gösterir

## Scan

- [ ] valid STL
- [ ] valid PLY
- [ ] degenerate mesh warning
- [ ] suspicious scale warning
- [ ] unit confirmation required
- [ ] metrics persisted
- [ ] compare overlay
- [ ] ICP heatmap
- [ ] ICP RMS displayed

## Truth labels

- [ ] contact = geometric preview, not clinical occlusion
- [ ] thickness = clearance/thickness proxy
- [ ] ICP = not clinically validated registration
- [ ] CAD = not Exocad/manufacturing parity yet


## E2E Workflow

- [ ] lab accepts new case
- [ ] design v1 enters clinic review
- [ ] clinic revision returns case to design
- [ ] design v2 approval enters production
- [ ] production → qc → ready enforced
- [ ] one active shipment per case
- [ ] courier assignment required before pickup
- [ ] valid driver required before pickup
- [ ] pickup synchronizes case to shipped
- [ ] delivery synchronizes case to delivered
- [ ] planned route distance/duration calculated
- [ ] live courier ETA targets pickup before pickup
- [ ] live courier ETA targets clinic after pickup
- [ ] wrong-org courier location is rejected
- [ ] Google Maps navigation opens next stop
- [ ] delivery cannot complete without proof
- [ ] recipient / optional PIN-note-photo proof persists
- [ ] actual delivery metrics are stored
- [ ] illegal status regressions are rejected


## RC17
- [ ] `npm run verify:cad-workflow` PASS
- [ ] Recovery restore/discard elle test edildi
- [ ] Sürekli margin draw ve Delete/Backspace araç davranışı test edildi
- [ ] Yüksek üçgenli STL adaptive mode test edildi
