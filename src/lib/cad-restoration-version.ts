import type {CadRestorationDesignType} from './cad-job-setup';

/** Version only the built-in starting anatomy; technician library IDs stay independent. */
export const CAD_DEFAULT_ANATOMY_VERSION='anatomy-rc55';
const MANDIBULAR_FIRST_MOLAR_VERSION='anatomy-mandibular-molar-v2';

export function hasRefinedMolarAnatomy(code:string|undefined,type:CadRestorationDesignType){
 return type==='anatomic_crown'&&(code==='36'||code==='46');
}

export function cadDefaultAnatomyVersion(code:string|undefined,type:CadRestorationDesignType){
 return hasRefinedMolarAnatomy(code,type)?MANDIBULAR_FIRST_MOLAR_VERSION:CAD_DEFAULT_ANATOMY_VERSION;
}
type CachedRestoration={key:string;geometry:{positions:readonly number[]};base:readonly number[];shell?:unknown;anchor?:{placed:boolean}};
export function cadRestorationCacheAction(stored:CachedRestoration|undefined,expectedKey:string,options={marginReady:false}):'restore'|'upgrade'|'replace' {
 if(!stored)return 'replace';
 if(stored.key===expectedKey)return 'restore';
 const refined=expectedKey.endsWith(':'+MANDIBULAR_FIRST_MOLAR_VERSION);
 const suffix=':'+(refined?MANDIBULAR_FIRST_MOLAR_VERSION:CAD_DEFAULT_ANATOMY_VERSION);
 if(!expectedKey.endsWith(suffix))return 'replace';
 const prefix=expectedKey.slice(0,-suffix.length);
 const compatible=stored.key===prefix+':legacy-rc37'||(refined&&stored.key===prefix+':'+CAD_DEFAULT_ANATOMY_VERSION);
 if(!compatible)return 'replace';
 if(stored.anchor?.placed&&!options.marginReady)return 'restore';
 // Existing work is authoritative. Only a provably untouched default surface can
 // adopt the requested new anatomy automatically; sculpt/internal-fit/shell work stays intact.
 const positions=stored.geometry.positions;
 if(stored.shell!==undefined||positions.length<9||positions.length!==stored.base.length||positions.some((value,i)=>!Number.isFinite(value)||value!==stored.base[i]))return 'restore';
 return 'upgrade';
}
