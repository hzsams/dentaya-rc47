# DentAYA 1.0.0-rc.14 — CAD Speed Controls

RC14 is focused on making the DentAYA Design sculpt workflow materially faster without changing the Phase 1 scope.

## Continuous sculpt strokes

`Ekle`, `Çıkar`, `Yumuşat` and `Düzleştir` are no longer single-click-only actions. A left-button / pen-down starts one sculpt stroke, pointer movement continues applying the brush, and holding the pointer stationary continues applying controlled dabs until release.

The viewport captures the active pointer so a stroke does not unexpectedly stop when the cursor leaves a small model region. Pointer cancel and lost-capture paths safely end the stroke.

Each continuous stroke creates one undo snapshot instead of one snapshot per brush dab. This keeps Undo useful and avoids polluting the history stack during long sculpt passes.

## Input and performance

- Mouse and touch-style pointer events use the same stroke lifecycle.
- Pen input scales brush strength from pointer pressure.
- OrbitControls are disabled only while a sculpt stroke is active and restored immediately on release.
- Expensive analysis view refreshes are deferred until stroke completion rather than recalculated after every brush dab.

## Keyboard-first CAD

New or completed shortcuts:

- `1`: Ekle
- `2`: Çıkar
- `3`: Yumuşat
- `4` or `F`: Düzleştir
- Hold `Space`: temporary Orbit; releasing Space restores the previous tool
- `[` / `]`: brush radius down / up
- `Shift + [` / `Shift + ]`: brush strength down / up
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: Redo
- `M`: Margin
- `R`: Measure
- `C`: Connector
- `O`: Orbit
- `H` or `?`: shortcut help

The shortcut system ignores text inputs, textareas, selects and content-editable controls so CAD shortcuts do not interfere with typing.

## UI feedback

The viewport now shows a compact `BASILI TUT + SÜRÜKLE` hint while a sculpt tool is active. A dedicated keyboard button opens an in-product shortcut panel.

## Verification

Added `npm run verify:cad-interaction`, which statically checks the continuous-pointer lifecycle, pointer capture, hold-repeat engine, pen pressure path and core keyboard shortcuts. It is also included in the main `npm run verify` chain.
