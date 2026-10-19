# DentAYA RC20 — Final QA Evidence

## Package state
- Version: `1.0.0-rc.20`
- Feature scope: RC18 feature freeze retained
- Phase 1: Clinic + Lab + CAD + Courier + AYA + Operations Center
- Patient module remains outside the Phase 1 release target.

## Static / dependency-free gates executed in the build workspace
- Release consistency: PASS 9/9
- Security: PASS 21/21
- Performance: PASS 8/8
- Pilot candidate structure: PASS 19/19
- CAD interaction: PASS 36/36
- CAD workflow: PASS 18/18
- CAD panel: PASS 12/12
- Environment verifier: PASS 10/10 against a temporary non-secret fixture
- New JavaScript verifier syntax: PASS
- `package.json` / `package-lock.json` JSON validation: PASS

## Full verify status in this workspace
`npm run verify` was invoked deliberately. It stopped at the first runtime gate because this workspace has npm `10.9.2`; RC20 requires npm `11+`. Node.js is `v22.16.0` and passes.

This is expected and intentional: the final chain must not continue on an unsupported package-manager version. Full lint/typecheck/dependency-backed migration/E2E/build verification must therefore be executed on the target workstation after the Windows setup script upgrades/confirms npm 11 and runs `npm ci`.

## Target workstation final commands

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
# fill .env.local
npm.cmd run verify:env
npm.cmd run verify:final
```

Do not promote the RC20 label to `DentAYA v1.0.0 Pilot` until `verify:final`, staging smoke tests, real role tests, backup/rollback checks, and the final pilot checklist pass.
