# RC17 CAD Workflow Polish QA

## Recovery
1. Open a design project and make a visible sculpt edit.
2. Wait at least one second.
3. Reload/close and reopen the same project + source.
4. Confirm the recovery banner is shown.
5. Choose **Geri yükle** and confirm geometry/settings/margin/measurements return.
6. Repeat and choose **Mevcut çalışmayla devam et**; confirm the local recovery draft is discarded.

## History
- Perform three sculpt strokes; undo count should increase.
- Undo once; redo count should increase.
- Redo once; geometry should return.
- One continuous held stroke must remain one undo action.

## Margin / measurement / connector
- Margin tool: hold and drag to draw multiple projected points continuously.
- Delete/Backspace removes the latest margin point.
- Measure tool: Delete/Backspace removes latest completed measurement.
- Connector tool: Delete/Backspace removes latest connector.
- Escape cancels the pending first point of measure/connector creation.

## Dense mesh
- Load a high-triangle STL/PLY.
- Confirm viewport remains interactive.
- If adaptive mode is triggered, confirm source→render triangle badge is visible.
- Verify kernel QC can still run against the dedicated kernel geometry.

## Automated static check
```powershell
npm.cmd run verify:cad-workflow
```
Expected:
`CAD workflow verify PASS (18/18)`
