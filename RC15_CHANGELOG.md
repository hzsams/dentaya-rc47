# DentAYA RC15 — CAD Brush HUD & Modifier Controls

## Added

- Surface-aware 3D circular brush cursor for Add, Remove, Smooth and Flatten.
- Cursor ring scales from `brush_radius_mm`, so its outer radius matches the active sculpt radius in model units.
- Mouse-wheel radius adjustment directly in the CAD viewport (`0.2–8.0 mm`).
- `Shift + mouse wheel` brush-strength adjustment (`0.01–1.00 mm`).
- Temporary Add ↔ Remove inversion while `Shift` or `Alt` is held. The modifier can be pressed/released during the same continuous stroke.
- Sculpt OS pointer hiding so the surface ring becomes the primary working cursor.
- Live CAD HUD now shows brush diameter and strength.
- RC15 shortcut/help copy and interaction verifier coverage.

## Preserved

- RC14 press-and-hold + drag sculpting.
- Pointer capture and stationary hold dabs.
- One undo snapshot per stroke.
- Pen-pressure strength scaling.
- Space temporary Orbit and existing keyboard shortcuts.
- RC13 Operations Center and the full Phase 1 clinic/lab/CAD/courier stack.

## Version

`1.0.0-rc.15`
