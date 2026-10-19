import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const viewport = readFileSync(resolve(root, "src/app/design/DesignViewport.tsx"), "utf8");
const studio = readFileSync(resolve(root, "src/app/design/DesignStudioClient.tsx"), "utf8");

const checks = [
  ["pointerdown sculpt başlangıcı", viewport.includes('addEventListener("pointerdown", handlePointerDown)')],
  ["pointermove sürekli sculpt", viewport.includes('addEventListener("pointermove", handlePointerMove)')],
  ["pointerup sculpt bitişi", viewport.includes('addEventListener("pointerup", handlePointerUp)')],
  ["pointer cancel güvenliği", viewport.includes('addEventListener("pointercancel", handlePointerCancel)')],
  ["pointer capture", viewport.includes("setPointerCapture(event.pointerId)")],
  ["basılı tutma tekrar motoru", viewport.includes("window.setInterval(() =>") && viewport.includes("applySculptDab")],
  ["tek stroke undo snapshot", (viewport.includes("snapshotGeometry();") || viewport.includes("snapshotGeometry(cadToolInteractionLabel(activeTool))")) && viewport.includes("startSculptStroke")],
  ["kalem basınç desteği", viewport.includes("brushPressureScale") && viewport.includes('pointerType !== "pen"')],
  ["Ekle kısayolu", studio.includes("shortcutBindings.add") && studio.includes('selectToolFromShortcut("add"')],
  ["Çıkar kısayolu", studio.includes("shortcutBindings.reduce") && studio.includes('selectToolFromShortcut("reduce"')],
  ["Yumuşat kısayolu", studio.includes("shortcutBindings.smooth") && studio.includes('selectToolFromShortcut("smooth"')],
  ["Düzleştir kısayolu", studio.includes("shortcutBindings.flatten") && studio.includes('selectToolFromShortcut("flatten"')],
  ["Space geçici orbit", studio.includes('event.code === "Space"') && studio.includes("temporaryOrbitToolRef")],
  ["fırça yarıçap kısayolları", studio.includes('event.code === "BracketLeft"') && studio.includes('event.code === "BracketRight"')],
  ["undo redo kısayolları", studio.includes('mod && key === "z"') && studio.includes('mod && key === "y"')],
  ["kısayol yardım paneli", studio.includes("CAD_FIXED_SHORTCUTS") && studio.includes("shortcutHelpOpen")],
  ["3D dairesel fırça imleci", viewport.includes("RingGeometry(0.9, 1, 64)") && viewport.includes("updateBrushCursor")],
  ["fırça imleci gerçek radius ölçeği", viewport.includes("brushCursor.scale.setScalar(radius)")],
  ["mouse wheel radius", viewport.includes('addEventListener("wheel", handleWheel') && viewport.includes("onBrushRadiusChange?.(nextRadius)")],
  ["shift wheel strength", viewport.includes("event.shiftKey") && viewport.includes("onBrushStrengthChange?.(nextStrength)")],
  ["shift alt geçici ters sculpt", viewport.includes("modifierInvert = event.shiftKey || event.altKey") && viewport.includes("effectiveSculptTool")],
  ["ekle çıkar yön takası", viewport.includes('baseTool === "add"') && viewport.includes('return "reduce" as CadTool') && viewport.includes('baseTool === "reduce"')],
  ["sculpt OS cursor gizleme", viewport.includes('canvas.style.cursor = isSculpt ? "none"')],
  ["wheel yardım metni", studio.includes("Fare tekerleği") && studio.includes("Shift + tekerlek")],
  ["sağ mouse orbit", viewport.includes("controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE")],
  ["orta mouse pan", viewport.includes("controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN")],
  ["sculpt hızlı zoom", viewport.includes("event.ctrlKey || event.metaKey") && viewport.includes("Hızlı zoom")],
  ["context menu engeli", viewport.includes('addEventListener("contextmenu", handleContextMenu)')],
  ["brush hardness", viewport.includes("brush_hardness") && studio.includes('label="Fırça sertliği"')],
  ["brush falloff", viewport.includes("brush_falloff") && studio.includes('label="Falloff"')],
  ["fırça presetleri", studio.includes('applyBrushPreset("detail")') && studio.includes('applyBrushPreset("bulk")')],
  ["X Y sculpt symmetry", viewport.includes("symmetry_enabled") && viewport.includes("mirroredLocalPoint") && viewport.includes("symmetry_axis")],
  ["mirror brush cursor", viewport.includes("mirrorBrushCursor") && viewport.includes("mirrorBrushCursorRing")],
  ["simetri kısayolu", studio.includes("shortcutBindings.symmetry") && studio.includes("symmetry_enabled")],
  ["kullanıcı özel kısayollar", studio.includes("dentaya:cad-shortcuts:") && studio.includes("updateShortcutBinding")],
  ["kısayol çakışma kontrolü", studio.includes("duplicate") && studio.includes("zaten")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\nCAD interaction verify FAILED (${failed}/${checks.length}).`);
  process.exit(1);
}

console.log(`\nCAD interaction verify PASS (${checks.length}/${checks.length}).`);
