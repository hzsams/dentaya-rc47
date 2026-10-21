import * as THREE from 'three';
import type {CadToothForm,CadMorphologyStyle,CadRestorationDesignType} from './cad-job-setup';

// The six existing technician forms remain; cancelled RC38 families are not used.
export function toothProfileFromFdi(code: string | undefined) {
    const normalized = String(code ?? "");
    const quadrant = Number(normalized[0]);
    const digit = Number(normalized[1]);
    const upper = quadrant === 1 || quadrant === 2;
    const anteriorUpper: Record<number, {
        width: number;
        depth: number;
        height: number;
        cusps: number;
        cusp: number;
        ridge: number;
    }> = {
        1: { width: 0.62, depth: 0.41, height: 1.24, cusps: 2, cusp: 0.018, ridge: 0.032 },
        2: { width: 0.55, depth: 0.39, height: 1.17, cusps: 2, cusp: 0.020, ridge: 0.028 },
        3: { width: 0.61, depth: 0.49, height: 1.26, cusps: 1, cusp: 0.095, ridge: 0.044 },
    };
    const anteriorLower: Record<number, {
        width: number;
        depth: number;
        height: number;
        cusps: number;
        cusp: number;
        ridge: number;
    }> = {
        1: { width: 0.49, depth: 0.35, height: 1.13, cusps: 2, cusp: 0.014, ridge: 0.022 },
        2: { width: 0.52, depth: 0.37, height: 1.15, cusps: 2, cusp: 0.016, ridge: 0.024 },
        3: { width: 0.56, depth: 0.44, height: 1.20, cusps: 1, cusp: 0.082, ridge: 0.036 },
    };
    if (digit >= 1 && digit <= 3)
        return (upper ? anteriorUpper : anteriorLower)[digit];
    if (digit === 4) {
        return upper
            ? { width: 0.69, depth: 0.61, height: 1.02, cusps: 2, cusp: 0.095, ridge: 0.032 }
            : { width: 0.63, depth: 0.57, height: 0.98, cusps: 2, cusp: 0.082, ridge: 0.028 };
    }
    if (digit === 5) {
        return upper
            ? { width: 0.67, depth: 0.62, height: 0.98, cusps: 2, cusp: 0.080, ridge: 0.028 }
            : { width: 0.65, depth: 0.60, height: 0.94, cusps: 2, cusp: 0.070, ridge: 0.024 };
    }
    if (digit === 6) {
        return upper
            ? { width: 0.79, depth: 0.74, height: 0.95, cusps: 4, cusp: 0.092, ridge: 0.048 }
            : { width: 0.82, depth: 0.70, height: 0.93, cusps: 5, cusp: 0.092, ridge: 0.046 };
    }
    if (digit === 7) {
        return upper
            ? { width: 0.75, depth: 0.71, height: 0.91, cusps: 4, cusp: 0.080, ridge: 0.040 }
            : { width: 0.78, depth: 0.68, height: 0.90, cusps: 4, cusp: 0.080, ridge: 0.038 };
    }
    return upper
        ? { width: 0.72, depth: 0.68, height: 0.88, cusps: 4, cusp: 0.068, ridge: 0.034 }
        : { width: 0.74, depth: 0.66, height: 0.87, cusps: 4, cusp: 0.068, ridge: 0.032 };
}
function toothFormFactors(form: CadToothForm) {
    return {
        natural: { width: 1, depth: 1, height: 1, cervical: 1, cusp: 1, ridge: 1, flatten: 0 },
        square: { width: 1.10, depth: 1.04, height: 0.98, cervical: 1.06, cusp: 0.94, ridge: 1.03, flatten: 0.02 },
        oval: { width: 0.97, depth: 1.06, height: 1.01, cervical: 1.02, cusp: 0.88, ridge: 0.88, flatten: 0.015 },
        triangular: { width: 1.05, depth: 0.98, height: 1.04, cervical: 0.86, cusp: 1.06, ridge: 1.08, flatten: 0 },
        youthful: { width: 1.01, depth: 1.01, height: 1.05, cervical: 0.98, cusp: 1.28, ridge: 1.22, flatten: 0 },
        worn: { width: 1.03, depth: 1.02, height: 0.92, cervical: 1.02, cusp: 0.48, ridge: 0.52, flatten: 0.09 },
    }[form] ?? { width: 1, depth: 1, height: 1, cervical: 1, cusp: 1, ridge: 1, flatten: 0 };
}
/** Crown-only anatomy: +Z runs from its flat cervical rim to the occlusal surface.
 * The explicit shared rings avoid a sphere pole at the margin and a single dome
 * where real teeth need several cusps, fossae and a bounded incisal edge.
 * This is a deterministic starting form, not patient-specific clinical anatomy.
 */
export function createRestorationGeometry(radius: number, anatomyCode: string | undefined, designType: CadRestorationDesignType, toothForm: CadToothForm, morphologyStyle: CadMorphologyStyle) {
    const profile=toothProfileFromFdi(anatomyCode),form=toothFormFactors(toothForm);
    const digit=Number(anatomyCode?.slice(-1))||6,quadrant=Number(anatomyCode?.[0])||4;
    const upper=quadrant===1||quadrant===2||quadrant===5||quadrant===6;
    const anterior=digit<=3,canine=digit===3,premolar=digit===4||digit===5;
    const mirror=quadrant===2||quadrant===3||quadrant===6||quadrant===7?-1:1;
    const baseSize=THREE.MathUtils.clamp((Number.isFinite(radius)?radius:6)*.48,3.2,6.4);
    const style=morphologyStyle==='soft'?.72:morphologyStyle==='strong'?1.22:1;
    const coping=designType==='coping',framework=designType==='framework';
    const cutback=designType==='cutback_crown'||designType==='reduced_pontic';
    const telescope=designType==='primary_telescope'||designType==='secondary_telescope';
    const secondary=designType==='secondary_telescope';
    const temporary=designType==='temporary_crown'||designType==='temporary_pontic';
    const veneer=designType==='veneer',inlay=designType==='inlay_onlay';
    const widthScale=coping?.90:framework?.84:cutback?.89:secondary?1.06:1;
    const heightScale=coping?.80:framework?.82:cutback?.87:telescope?(secondary?.90:.86):inlay?.48:temporary?.985:1;
    const halfWidth=baseSize*profile.width*form.width*widthScale*(temporary?1.012:1)*(inlay?.88:1);
    const halfDepth=baseSize*profile.depth*form.depth*widthScale*(temporary?1.012:1)*(inlay?.88:1);
    const height=baseSize*profile.height*form.height*1.15*heightScale;
    const relief=style*form.cusp*(coping?.34:framework?.28:cutback?.68:1);
    const gaussian=(x:number,y:number,cx:number,cy:number,sx:number,sy=sx)=>Math.exp(-.5*((x-cx)**2/sx**2+(y-cy)**2/sy**2));
    function surface(x:number,y:number){
        x*=mirror;
        const radial=Math.hypot(x,y);
        if(telescope)return .94+.035*(1-radial*radial);
        let z:number;
        if(canine){
            z=.66+relief*(.31*gaussian(x,y,0,-.08,.43,.37)+.045*gaussian(x,y,0,.53,.33,.22));
        }else if(anterior){
            // An incisal edge spans mesial/distal; it is never a central cone.
            const edge=Math.exp(-.5*((y+.08)/.24)**2)*(1-.16*x*x);
            z=.65+relief*(.31*edge+.045*gaussian(x,y,0,.57,.36,.21));
            z+=.009*relief*Math.cos(x*Math.PI*3)*edge;
        }else{
            z=.72+.06*Math.exp(-.5*((radial-.84)/.14)**2);
            if(premolar){
                z+=relief*.27*gaussian(x,y,0,-.47,.28,.25);
                if(!upper&&digit===5){
                    z+=relief*.205*(gaussian(x,y,-.31,.43,.22,.25)+gaussian(x,y,.31,.43,.22,.25));
                }else z+=relief*(upper?.24:.15)*gaussian(x,y,0,.47,.29,.25);
                z-=relief*.045*gaussian(x,y,0,0,.57,.09);
            }else if(!upper&&digit===6){
                // Mandibular first molar: three buccal and two lingual cusps.
                for(const cx of [-.57,0,.57])z+=relief*.225*gaussian(x,y,cx,-.46,.205,.24);
                for(const cx of [-.38,.38])z+=relief*.265*gaussian(x,y,cx,.46,.25,.25);
                z-=relief*.042*gaussian(x,y,0,0,.63,.085);
            }else{
                for(const cx of [-.48,.48])for(const cy of [-.46,.46])z+=relief*(cy>0?.265:.235)*gaussian(x,y,cx,cy,.255,.255);
                z-=relief*.035*(gaussian(x,y,0,0,.65,.085)+gaussian(x,y,0,0,.085,.65));
            }
            z-=relief*.035*gaussian(x,y,0,0,.24,.24);
        }
        // Rounded ridge/cusp heights are bounded even for the strong/youthful form.
        z=THREE.MathUtils.clamp(z,.53,1.06);
        if(form.flatten>0)z=THREE.MathUtils.lerp(z,Math.min(z,.84-form.flatten),Math.min(.7,form.flatten*5));
        return z;
    }
    const segments=84,wallRows=20,tableRows=32;
    const positions:number[]=[0,0,0],indices:number[]=[];
    function addRing(radial:number,u:number|null){
        for(let j=0;j<segments;j++){
            const theta=j/segments*Math.PI*2,cos=Math.cos(theta),sin=Math.sin(theta);
            const exponent=anterior?.94:.83;
            let x=Math.sign(cos)*Math.abs(cos)**exponent*radial;
            let y=Math.sign(sin)*Math.abs(sin)**exponent*radial;
            if(!anterior&&upper&&!premolar)x+=.075*mirror*y;
            const z=(u===null?surface(cos*radial,sin*radial):u*surface(cos,sin))*height;
            if(veneer)y*=sin>0?.52:.28;
            positions.push(x*halfWidth,y*halfDepth,z);
        }
    }
    const cervical=THREE.MathUtils.clamp(.79*form.cervical,.68,.87);
    // One flat neck ring + a single center fan cap; no radial cap rows can be
    // collapsed onto the margin by cervical registration.
    for(let row=0;row<=wallRows;row++){
        const u=row/wallRows;
        const r=telescope?THREE.MathUtils.lerp(.80,.94,u):cervical+(.985-cervical)*Math.sin(u*Math.PI*.82);
        addRing(r,u);
    }
    const shoulder=telescope?.94:cervical+(.985-cervical)*Math.sin(Math.PI*.82);
    // Continue the same boundary rather than duplicating vertices at its seam.
    for(let row=1;row<tableRows;row++){
        const r=shoulder*(1-row/tableRows);
        // Surface coordinates stay in the common 0..1 occlusal-table domain.
        for(let j=0;j<segments;j++){
            const theta=j/segments*Math.PI*2,cos=Math.cos(theta),sin=Math.sin(theta),t=r/shoulder;
            const exponent=anterior?.94:.83;
            let x=Math.sign(cos)*Math.abs(cos)**exponent*r,y=Math.sign(sin)*Math.abs(sin)**exponent*r;
            if(!anterior&&upper&&!premolar)x+=.075*mirror*y;
            if(veneer)y*=sin>0?.52:.28;
            positions.push(x*halfWidth,y*halfDepth,surface(cos*t,sin*t)*height);
        }
    }
    const rings=wallRows+tableRows,top=positions.length/3;
    positions.push(0,0,surface(0,0)*height);
    for(let j=0;j<segments;j++)indices.push(0,1+(j+1)%segments,1+j);
    for(let ring=0;ring<rings-1;ring++)for(let j=0;j<segments;j++){
        const a=1+ring*segments+j,b=1+ring*segments+(j+1)%segments,c=a+segments,d=b+segments;
        indices.push(a,b,c,b,d,c);
    }
    const last=1+(rings-1)*segments;
    for(let j=0;j<segments;j++)indices.push(last+j,last+(j+1)%segments,top);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return geometry;
}
