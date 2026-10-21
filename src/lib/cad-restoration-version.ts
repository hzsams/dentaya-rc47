/** Version only the built-in starting anatomy; technician library IDs stay independent. */
export const CAD_DEFAULT_ANATOMY_VERSION='anatomy-rc55';
type CachedRestoration={key:string;geometry:{positions:readonly number[]};base:readonly number[];shell?:unknown;anchor?:{placed:boolean}};
export function cadRestorationCacheAction(stored:CachedRestoration|undefined,expectedKey:string,options={marginReady:false}):'restore'|'upgrade'|'replace' {
 if(!stored)return 'replace';
 if(stored.key===expectedKey)return 'restore';
 const suffix=':'+CAD_DEFAULT_ANATOMY_VERSION;
 const legacyKey=expectedKey.endsWith(suffix)?expectedKey.slice(0,-suffix.length)+':legacy-rc37':null;
 if(stored.key!==legacyKey)return 'replace';
 if(stored.anchor?.placed&&!options.marginReady)return 'restore';
 // Existing work is authoritative. Only a provably untouched default surface can
 // adopt the requested new anatomy automatically; sculpt/internal-fit/shell work stays intact.
 const positions=stored.geometry.positions;
 if(stored.shell!==undefined||positions.length<9||positions.length!==stored.base.length||positions.some((value,i)=>!Number.isFinite(value)||value!==stored.base[i]))return 'restore';
 return 'upgrade';
}
