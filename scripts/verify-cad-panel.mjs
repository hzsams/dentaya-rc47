import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(`src/app/design/${name}`,'utf8');
const studio=read('DesignStudioClient.tsx'),css=read('cad-workspace.css'),panel=read('CadFloatingPanel.tsx'),scene=read('CadSceneControls.tsx'),menu=read('CadContextMenu.tsx'),palette=read('CadToolPalette.tsx'),icons=read('CadIcon.tsx');
assert.equal((studio.match(/<DesignViewport\b/g)||[]).length,1,'One working scene');
assert.equal((studio.match(/<CadSceneControls\b/g)||[]).length,1,'One object tree');
assert.equal((studio.match(/<CadFloatingPanel\b/g)||[]).length,1,'One tool window');
assert.ok(studio.includes('cad-professional')&&studio.includes('cad-object-panel')&&studio.includes('cad-view-toolbar'));
for(const tool of ['orbit','add','reduce','smooth','flatten','margin','measure','connector']){
 assert.ok(palette.includes(`${tool}:`),`Named manual tool ${tool}`);
 assert.match(icons,new RegExp(`\\b${tool}:`),`Vector icon ${tool}`);
}
assert.ok(studio.includes('selectManualTool')&&menu.includes('onTool(id)'),'Shared tool selection');
assert.ok(studio.includes('role="tablist"')&&studio.includes("'tabpanel'")&&studio.includes('aria-controls="cad-tool-content"'),'Accessible parameter groups');
assert.ok(palette.includes('aria-pressed={tool === id}')&&palette.includes('disabled={disabled}'),'Actual selected and disabled states');
assert.ok(!studio.includes('cadAyaHeadline')&&!studio.includes('ayaInspector'),'Manual CAD has no AI workflow card');
assert.ok(studio.includes('item.availability === "live"')&&studio.includes('Boolean(item.activation)'),'Catalog exposes implemented commands');
assert.ok(panel.includes('ResizeObserver')&&panel.includes('offsetWidth')&&panel.includes('offsetHeight'),'Panel bounds use real size');
assert.ok(panel.includes('setPointerCapture')&&panel.includes('onPointerCancel')&&panel.includes('onLostPointerCapture'),'Drag cancellation and capture');
assert.ok(panel.includes('ArrowRight')&&panel.includes('localStorage.setItem'),'Keyboard movement and position persistence');
assert.ok(scene.includes("cadLayerPatch(settings,layer.id,'visible'")&&scene.includes("cadLayerPatch(settings,layer.id,'isolate'"),'Object controls use the tested group restore/isolation helper');
assert.ok(menu.includes(':not(:disabled)')&&menu.includes("e.key === 'Escape'"),'Context keyboard skips disabled commands');
assert.ok(studio.includes('Numpad5')&&studio.includes('Numpad8')&&studio.includes("mod && key === 's'"),'Camera and save shortcuts');
assert.ok(css.includes('@media(max-width:1120px)')&&css.includes('@media(max-width:760px)'),'Responsive layout');
console.log('PASS: professional scene, object tree, manual tool bindings, vector glyphs, accessible state, real panel bounds, shortcuts and responsive layout.');
