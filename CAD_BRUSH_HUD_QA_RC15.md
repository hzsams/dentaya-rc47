# RC15 CAD Brush HUD QA

## Automated contract

Run:

```bash
npm run verify:cad-interaction
```

Expected: `CAD interaction verify PASS (24/24)`.

## Manual viewport checks

1. Open DentAYA Design and select **Ekle**. Move the mouse over the design mesh. A circular 3D ring must follow the surface and the normal OS cursor must be hidden.
2. Scroll up/down over the viewport. Brush diameter in the HUD and ring size must change together; the page should not scroll while a sculpt tool is active.
3. Hold **Shift** and scroll. Brush strength must change while radius stays unchanged.
4. With **Ekle** active, hold **Shift** or **Alt** and sculpt. The same stroke must temporarily behave as **Çıkar**. Release the modifier and continue the stroke; behavior must return to **Ekle** without ending the stroke.
5. Repeat from **Çıkar**; modifier must temporarily behave as **Ekle**.
6. Verify **Yumuşat** and **Düzleştir** are not direction-inverted by Shift/Alt.
7. Hold and drag for a long stroke, then press Undo once. The whole stroke must revert as one history entry.
8. Hold **Space** for temporary Orbit, release, and verify the previous sculpt tool and circular cursor return.
9. Move off the viewport. The brush ring must hide when there is no active captured stroke.
10. On a pen device, verify pressure scaling still affects sculpt strength.

## Bounds

- Brush radius: `0.2–8.0 mm`
- Brush strength: `0.01–1.00 mm`
- Wheel radius step: `0.2 mm`
- Shift+wheel strength step: `0.02 mm`
