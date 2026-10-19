import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  client: fs.readFileSync(path.join(root, 'src/app/design/DesignStudioClient.tsx'), 'utf8'),
  viewport: fs.readFileSync(path.join(root, 'src/app/design/DesignViewport.tsx'), 'utf8'),
  recovery: fs.readFileSync(path.join(root, 'src/lib/cad-recovery.ts'), 'utf8'),
};

const checks = [
  ['IndexedDB recovery store', files.recovery.includes('indexedDB.open') && files.recovery.includes('dentaya-cad-recovery')],
  ['Recovery draft geometry', files.recovery.includes('geometry: Float32Array')],
  ['Recovery capture API', files.viewport.includes('captureRecoveryGeometry')],
  ['Recovery restore API', files.viewport.includes('restoreRecoveryGeometry')],
  ['Recovery banner', files.client.includes('Kurtarma kaydı bulundu')],
  ['Recovery discard action', files.client.includes('discardRecoveryDraft')],
  ['Debounced recovery autosave', files.client.includes('saveCadRecoveryDraft') && files.client.includes('650')],
  ['Undo history state', files.viewport.includes('CadHistoryState') && files.viewport.includes('lastHistoryActionRef')],
  ['Undo/redo counters UI', files.client.includes('historyState.undoCount') && files.client.includes('historyState.redoCount')],
  ['Continuous margin drawing', files.viewport.includes('activeMarginPointerId') && files.viewport.includes('addMarginPoint')],
  ['Margin surface projection', files.viewport.includes('projectPointToSpatialSurface')],
  ['Delete last margin point', files.viewport.includes('removeLastMarginPoint')],
  ['Delete last measurement', files.viewport.includes('removeLastMeasurement')],
  ['Delete last connector', files.viewport.includes('removeLastConnector')],
  ['Cancel pending CAD action', files.viewport.includes('cancelPendingAction')],
  ['Large scan adaptive mode', /sourceTriangles\s*>\s*520_?000/.test(files.viewport) && /sourceTriangles\s*>\s*220_?000/.test(files.viewport)],
  ['Performance telemetry badge', files.client.includes('performanceInfo.sourceTriangles')],
  ['Geometry commit tracking', files.viewport.includes('onGeometryCommit') && files.client.includes('setGeometryRevision')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`✓ ${name}`);
  else { console.error(`✗ ${name}`); failed += 1; }
}

if (failed) {
  console.error(`CAD workflow verify FAILED (${failed}/${checks.length})`);
  process.exit(1);
}
console.log(`CAD workflow verify PASS (${checks.length}/${checks.length})`);
