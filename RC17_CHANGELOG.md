# DentAYA RC17 — CAD Workflow Polish

RC17 focuses on day-to-day CAD reliability and speed rather than adding a new product module.

## Added
- IndexedDB-backed local CAD crash recovery per project + source model.
- Recovery banner with explicit restore/discard actions.
- Local recovery snapshots preserve sculpt geometry, CAD settings, margin points, measurements, workflow stage and project status.
- Recovery snapshots are pruned after 7 days.
- Geometry revision tracking so sculpt edits trigger local recovery even when normal project JSON settings did not change.
- Visible undo/redo depth and last geometry action.
- Continuous margin drawing while pointer/pen is held and dragged.
- Surface projection for drawn margin points.
- Delete/Backspace context actions for the last margin point, measurement or connector.
- Escape cancels pending measurement/connector selection.
- Adaptive handling for very dense scan meshes: source, rendering and kernel triangle counts are tracked separately and the viewport can use reduced working geometry for large files.
- A small performance badge appears when adaptive scan mode is active.
- `npm run verify:cad-workflow` static RC17 verification.

## Preserved
- RC14 hold-and-drag sculpting and grouped undo strokes.
- RC15 brush HUD, wheel controls and temporary add/reduce inversion.
- RC16 brush presets, hardness/falloff, mouse navigation, symmetry and custom shortcuts.

## Release
- Version: `1.0.0-rc.17`
- Next milestone: RC18 Feature Freeze.
