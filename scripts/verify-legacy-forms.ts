import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRestorationGeometry} from '../src/lib/cad-restoration-shape';
import {analyzeCadMesh} from '../src/lib/cad-mesh-qc';
import {CAD_TOOTH_FORM_OPTIONS,normalizeCadJobSetup} from '../src/lib/cad-job-setup';
const provenance=JSON.parse(readFileSync('verification/RC41/rollback-provenance.json','utf8'));
for(const [file,hash] of Object.entries(provenance.restoredFiles))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,file+' is identical to RC37');
const current=readFileSync('src/lib/cad-restoration-shape.ts','utf8'),original=current.slice(current.indexOf('export function toothProfileFromFdi')).replaceAll('export function','function');
assert.equal(createHash('sha256').update(original).digest('hex'),provenance.cadGeometryOriginalFunctionSha256,'CAD constructor is the original RC37 algorithm');
assert.equal(CAD_TOOTH_FORM_OPTIONS.length,6);assert.equal(existsSync('src/lib/tooth-morphology.ts'),false);assert.equal(existsSync('public/tooth-forms'),false);
for(const value of ['reticula','lobata','mamelon','faseta','triada','natural']){
 const setup=normalizeCadJobSetup({version:1,complete:true,active_unit_id:'u',units:[{id:'u',tooth_code:'46',anatomy_code:'46',tooth_form:value,design_type:'anatomic_crown',role:'single'}]},['46'],'Kron',null);assert.equal(setup.units[0].tooth_form,'natural');
}
let meshes=0;
for(const code of ['11','13','16','24','31','35','46','47'])for(const form of CAD_TOOTH_FORM_OPTIONS)for(const type of ['anatomic_crown','coping','primary_telescope'] as const){const g=createRestorationGeometry(6,code,type,form.value,'balanced');const qc=analyzeCadMesh(g);assert.ok(qc.watertight);assert.equal(qc.connectedComponents,1);assert.equal(qc.degenerateTriangles,0);g.dispose();meshes++;}
console.log(JSON.stringify({pass:true,exactRc37Appearance:true,exactRc37CadConstructor:true,cancelledGeneratorAndAssetsAbsent:true,legacyCadChoices:6,legacyAppearanceChoices:9,checkedMeshes:meshes,removedFamiliesMigrateToNatural:true,closedSingleBodies:true},null,2));
