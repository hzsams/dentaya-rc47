import type {CadSectionInspection} from './cad-section-engine';
import type {AyaCadSectionEvidence} from './aya-cad-assistance';

/** A viewport receipt identifies the applied scene, never merely the latest React props. */
export type CadSectionInspectionReceipt={
    key:string;
    plane:{normal:[number,number,number];constantMm:number};
    sourceSimplified:boolean;
    inspection:CadSectionInspection;
};

export function summarizeAyaSection(receipt:CadSectionInspectionReceipt|null,context:{key:string;dataToken:string;ready:boolean;view:string}):AyaCadSectionEvidence|null{
    if(!receipt||!context.ready||context.view!=='section'||!context.dataToken||receipt.key!==context.key)return null;
    // The shared normalizer applies numeric/issue limits and withholds unreliable area.
    return {key:receipt.key,dataToken:context.dataToken,plane:receipt.plane,sourceSimplified:receipt.sourceSimplified,
        restoration:contour(receipt.inspection.restoration),source:contour(receipt.inspection.source)};
}
function contour(value:CadSectionInspection['restoration']){
    if(!value)return null;
    return {lengthMm:value.perimeterMm,areaMm2:value.areaMm2,closedLoops:value.closedLoops,
        issues:[...value.warnings,...(value.truncated?['truncated']:[]),...(value.openChains?['open']:[])]};
}
