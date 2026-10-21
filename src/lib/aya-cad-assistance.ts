import type {AyaCadTool} from '../../electron/aya/agent.cjs';
export type AyaCadEvidence={dataToken:string;triangles?:number;boundaryEdges?:number;nonManifoldEdges?:number;components?:number;degenerateTriangles?:number;watertight?:boolean;collisionSamples?:number;contactSamples?:number;samples?:number;minimumSignedDistanceMm?:number;minimumWallEstimateMm?:number;targetWallMm?:number;undercutRatio?:number;marginPoints?:number;marginClosureGapMm?:number;marginProjectedRatio?:number;connectors?:number;connectorWarnings?:number;warnings:string[];contactReference:'antagonist'|'unavailable';wallMethod?:'shell-offset-estimate'};
export type AyaCadContext={inspectionFlashlight?:boolean;inspectionFlashlightTarget?:'camera'|'pointer';unit:string;restoration:string;stage:string;task?:string;upperReady?:boolean;lowerReady?:boolean;antagonistReady?:boolean;openingMm?:number;setupComplete:boolean;sourceReady:boolean;modelReady:boolean;marginPoints:number;placed:boolean;visible:boolean;unsaved:boolean;saveFailed:boolean;isSaving?:boolean;scope?:string;snapshot?:string;dataToken?:string;availableTools?:AyaCadTool[];tool?:string;view?:string;material?:string;undoCount?:number;redoCount?:number;measurementsMm?:number[];designSettings?:{cementGapMm:number;minimumThicknessMm:number;brushRadiusMm:number};report?:AyaCadEvidence|null;recentActions?:{tool:AyaCadTool;ok:boolean;result:string}[]};
/** Answers are based on supplied workspace metadata, never inferred scan measurements. */
export function ayaCadHelp(question:string,context:AyaCadContext,t:(s:string)=>string){
 const q=question.toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
 const normalized=(s:string)=>s.toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
 const contains=(sources:string[])=>sources.some(s=>{const word=normalized(t(s)).split(/\s/)[0].slice(0,4);return word.length>=2&&q.includes(word);});
 if(/tork|torque|surgical|cerrahi|bone|kemik|ila[cç]|dosage|doz|diagnos|tedavi/.test(q))return null;
 if(/nedir|ne demek|ne anlama|what is|what are|definition/.test(q))return null;
 const placement=contains(['Marjin','Anatomi','Diş formu'])||/kole|marjin|margin|implant|dis.*gel|crown|abutment|tooth/.test(q),save=contains(['Kaydet','Çıkış'])||/kaydet|kayit|cik|save|exit|close|reopen|yeniden/.test(q);
 if(!placement&&!save)return null;
 const rows=[`${t('Çalışma ünitesi')}: ${context.unit||'—'}`,`${t('Restorasyon / altyapı')}: ${t(context.restoration)}`,`${t('Marjin çizgisi')}: ${context.marginPoints}`];
 if(save){rows.push(t(context.isSaving?'Kaydediliyor…':context.saveFailed?'CAD projesi kaydedilemedi.':context.unsaved?'Kaydet ve çık':'CAD projesi kaydedildi.'));if(context.saveFailed)rows.push(t('Yerel kaydet ve çık'));}
 else if(!context.setupComplete)rows.push(t('İş tanımını tamamlayın'));
 else if(!context.sourceReady)rows.push(t('Kaynak seçilmedi'));
 else if(!context.modelReady)rows.push(t('Modelin yüklenmesini bekleyin.'));
 else if(context.marginPoints<3)rows.push(t('Geçerli bir kole çizgisi çizin.'));
 else if(!context.visible)rows.push(t('Tümünü göster'));
 else rows.push(t(context.placed?'Model üzerinde basılı tutup sürükleyin. Shift ile ekleme / çıkarma yönünü ters çevirin.':'Koleye yerleştir'));
 return rows.join('\n');
}
