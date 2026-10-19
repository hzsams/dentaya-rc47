# RC14 CAD Speed Controls — QA

## Sculpt interaction

1. Open DentAYA Design on a case with an active design mesh.
2. Select `Ekle` and hold the primary mouse button on the model for ~1 second without moving. The surface should continue to build gradually.
3. Keep holding and drag across the model. The brush should follow continuously without requiring repeated clicks.
4. Repeat with `Çıkar`, `Yumuşat` and `Düzleştir`.
5. Release the pointer. The stroke must stop immediately.
6. Press Undo once. The entire previous continuous stroke should revert as one history action.
7. Press Redo once. The full stroke should return.

## Pointer safety

- Start a stroke and move the pointer outside the original hit region before releasing; pointer capture should keep the stroke lifecycle valid.
- Trigger browser pointer cancel/lost capture where possible; the tool must not remain stuck in an active stroke.
- Orbit must not rotate the model while sculpting, and must work again after release.

## Shortcuts

- `1`, `2`, `3`, `4` select Add, Remove, Smooth and Flatten.
- `F` also selects Flatten.
- Hold `Space`: temporary Orbit. Release: restore previous tool.
- `[` and `]`: change brush radius.
- `Shift + [` and `Shift + ]`: change brush strength.
- `Ctrl/Cmd + Z`: Undo.
- `Ctrl/Cmd + Y` and `Ctrl/Cmd + Shift + Z`: Redo.
- `M`, `R`, `C`, `O`: Margin, Measure, Connector, Orbit.
- `H` or `?`: open/close shortcut panel.
- Shortcuts must not fire while typing in form inputs.

## Pen input

If a pressure-sensitive pen is available, light and heavy pressure should scale sculpt strength while remaining bounded.

## Automated check

Run:

```powershell
npm.cmd run verify:cad-interaction
```

Expected result: `CAD interaction verify PASS (16/16)`.
