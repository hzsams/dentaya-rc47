# RC19 QA — Security / Performance / Release

## Automated checks executed in this package
- Release consistency: PASS 9/9
- Security gates: PASS 21/21
- Performance gates: PASS 8/8
- CAD interaction contract: PASS 36/36
- CAD workflow/recovery contract: PASS 18/18
- CAD panel contract: PASS 12/12
- TypeScript/TSX syntax transpilation for the 10 RC19-modified TS/TSX/config files: PASS 10/10

## Important findings closed
1. The previous global `Permissions-Policy` disabled geolocation for every page while Logistics uses `navigator.geolocation`. RC19 changes that permission to `geolocation=(self)` so courier live location can work on the DentAYA origin without opening geolocation to embedded third-party origins.
2. Public `/api/health` previously exposed which Maps/Supabase/AI integrations were configured. RC19 keeps a public readiness result but gates detailed integration flags behind a valid Supabase session.
3. AYA/Routes/Geocoding calls now have server-side request size/content-type guards and best-effort per-instance request budgets to reduce accidental abuse and third-party API cost spikes.
4. Courier GPS writes previously occurred every 15 seconds even while stationary. RC19 suppresses <8 m jitter for up to 60 seconds while retaining a heartbeat.
5. Release metadata had stale RC11/RC12/RC14 labels in multiple files. RC19 aligns package, lock file, runtime release metadata, Supabase client info and environment examples.

## Not executed in this environment
The complete dependency-based `npm run verify` was not executed because this working environment has npm 10.9.2 while the project intentionally requires npm >=11 and the package dependencies are not installed here. RC20 setup should run the complete pipeline on the target machine after npm 11 installation.

## RC20 gate
RC20 should not add features. It should install the final toolchain, run the complete verify/build pipeline, connect real staging services, perform role-based smoke tests and then package the pilot release.
