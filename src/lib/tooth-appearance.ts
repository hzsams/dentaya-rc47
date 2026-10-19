'use client';
import {useSyncExternalStore} from 'react';

export const TOOTH_FORMS=[
 {id:'natural',name:'Doğal anatomi'}, {id:'broad',name:'Geniş kron'},
 {id:'slender',name:'İnce kron'}, {id:'compact',name:'Kısa kron'},
 {id:'square',name:'Kare'}, {id:'oval',name:'Oval'}, {id:'triangular',name:'Üçgensel'},
 {id:'youthful',name:'Genç'}, {id:'worn',name:'Aşınmış'},
] as const;
export type ToothForm=typeof TOOTH_FORMS[number]['id'];
export const TOOTH_STYLES=[
 {id:'anatomical',name:'Anatomik',description:'Doğal mine, yumuşak ışık ve grafit zemin.',background:'#30343a',tooth:'#eee6cd',roughness:.48,metalness:0,form:'natural'},
 {id:'clinical',name:'Klinik Açık',description:'Açık çalışma alanı ve porselen beyazı dişler.',background:'#e4e9ed',tooth:'#fffaf0',roughness:.38,metalness:0,form:'oval'},
 {id:'cad',name:'Mat CAD',description:'Lacivert zemin, mat mavi model ve belirgin yüzeyler.',background:'#18232e',tooth:'#90b7cf',roughness:.82,metalness:.08,form:'broad'},
 {id:'contour',name:'Teknik Kontur',description:'Gri model üzerinde yüzey kenarlarını gösterir.',background:'#25292e',tooth:'#b9c1c7',roughness:.9,metalness:0,form:'square'},
 {id:'studio',name:'Stüdyo Krem',description:'Sıcak taş zemin ve doğal seramik yüzey.',background:'#d8d0c4',tooth:'#f6e7ca',roughness:.52,metalness:0,form:'oval'},
 {id:'titanium',name:'Titanyum',description:'Füme zemin ve metalik model yüzeyi.',background:'#292c32',tooth:'#bdc7d0',roughness:.3,metalness:.65,form:'compact'},
 {id:'night',name:'Gece Kontrast',description:'Koyu zemin, aydınlık mine ve net ayrıntılar.',background:'#10151d',tooth:'#e7eff9',roughness:.65,metalness:0,form:'slender'},
 {id:'opal',name:'Opal',description:'Soğuk beyaz yüzey ve sakin mavi gri zemin.',background:'#dce4e9',tooth:'#f5f6ef',roughness:.35,metalness:0,form:'youthful'},
 {id:'rose',name:'Rose Ceramic',description:'Gül taşı zemin ve sıcak seramik model.',background:'#e6d8d1',tooth:'#f5e3d5',roughness:.55,metalness:0,form:'triangular'},
 {id:'graphite',name:'Graphite Pro',description:'Nötr koyu zemin ve mat gri model.',background:'#191d22',tooth:'#c6cbd0',roughness:.88,metalness:.04,form:'square'},
 {id:'mint',name:'Mint Studio',description:'Açık adaçayı zemin ve net mine yüzeyi.',background:'#dbe7df',tooth:'#f2eedb',roughness:.48,metalness:0,form:'natural'},
 {id:'young-enamel',name:'Genç Mine',description:'Uzun kronlar, belirgin kusplar ve parlak mine.',background:'#273441',tooth:'#fff5dc',roughness:.22,metalness:0,form:'youthful'},
 {id:'worn-enamel',name:'Aşınmış Mine',description:'Kısa kronlar, yumuşak kusplar ve sıcak mine.',background:'#3b332d',tooth:'#dbc5a1',roughness:.68,metalness:0,form:'worn'},
 {id:'oval-porcelain',name:'Oval Porselen',description:'Yuvarlak hatlar ve parlak porselen yüzey.',background:'#cddadf',tooth:'#fef6e9',roughness:.2,metalness:0,form:'oval'},
 {id:'square-zirconia',name:'Kare Zirkonya',description:'Geniş, köşeli kronlar ve açık seramik yüzey.',background:'#272d36',tooth:'#f1f1e9',roughness:.4,metalness:0,form:'square'},
 {id:'triangular-enamel',name:'Üçgensel Mine',description:'Boyuna doğru daralan kronlar ve doğal mine.',background:'#e2dbce',tooth:'#eddfbf',roughness:.42,metalness:0,form:'triangular'},
] as const;
export type ToothStyle=typeof TOOTH_STYLES[number]['id'];
export const TOOTH_SHADES=[
 {id:'preset',name:'Tarz rengi',color:null}, {id:'bleach',name:'Beyaz',color:'#fffdf5'},
 {id:'a1',name:'A1',color:'#f4ead2'}, {id:'a2',name:'A2',color:'#eaddbd'},
 {id:'a3',name:'A3',color:'#d9c69f'}, {id:'b1',name:'B1',color:'#f7f0d9'},
 {id:'b2',name:'B2',color:'#e8ddb7'}, {id:'c1',name:'C1',color:'#e0dccd'},
 {id:'d2',name:'D2',color:'#d8ccbd'}, {id:'blue',name:'CAD Mavi',color:'#89b5d7'},
 {id:'grey',name:'Nötr Gri',color:'#c7cbd0'}, {id:'gold',name:'Altın',color:'#d6b46c'},
] as const;
export type ToothShade=typeof TOOTH_SHADES[number]['id'];
export const TOOTH_FINISHES=[
 {id:'preset',name:'Tarz yüzeyi'}, {id:'enamel',name:'Mine'}, {id:'matte',name:'Mat'},
 {id:'ceramic',name:'Parlak seramik'}, {id:'metal',name:'Metalik'}, {id:'contour',name:'Kontur'},
] as const;
export type ToothFinish=typeof TOOTH_FINISHES[number]['id'];
export const TOOTH_VIEWS=[{id:'front',name:'Önden'},{id:'occlusal',name:'Üstten'},{id:'right',name:'Sağ oblik'},{id:'left',name:'Sol oblik'}] as const;
export type ToothView=typeof TOOTH_VIEWS[number]['id'];
export type ToothAppearance={
 style:ToothStyle;form:ToothForm;showRoots:boolean;startView:ToothView;
 shade:ToothShade;finish:ToothFinish;color:string|null;background:string|null;
 width:number;crownHeight:number;depth:number;cuspRelief:number;rootLength:number;wear:number;
 gloss:number|null;brightness:number;rootTint:boolean;
};
export const DEFAULT_TOOTH_APPEARANCE:ToothAppearance={
 style:'anatomical',form:'natural',showRoots:true,startView:'front',shade:'preset',finish:'preset',
 color:null,background:null,width:100,crownHeight:100,depth:100,cuspRelief:100,rootLength:100,wear:0,
 gloss:null,brightness:100,rootTint:true,
};
export const TOOTH_SHAPE_CONTROLS=[
 {key:'width',name:'Kron genişliği',min:80,max:125},
 {key:'crownHeight',name:'Kron yüksekliği',min:75,max:125},
 {key:'depth',name:'Kron derinliği',min:80,max:120},
 {key:'cuspRelief',name:'Kusp belirginliği',min:60,max:140},
 {key:'rootLength',name:'Kök uzunluğu',min:60,max:140},
 {key:'wear',name:'Aşınma düzeyi',min:0,max:40},
] as const;
const color=(value:unknown)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value.toLowerCase():null;
const amount=(value:unknown,min:number,max:number,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.round(Math.min(max,Math.max(min,value))):fallback;
export function normalizeToothAppearance(value:unknown):ToothAppearance{
 const p=(value&&typeof value==='object'?value:{}) as Partial<ToothAppearance>;
 const numeric=Object.fromEntries(TOOTH_SHAPE_CONTROLS.map(c=>[c.key,amount(p[c.key],c.min,c.max,DEFAULT_TOOTH_APPEARANCE[c.key])]));
 return {...DEFAULT_TOOTH_APPEARANCE,...numeric,
  style:TOOTH_STYLES.some(s=>s.id===p.style)?p.style!:'anatomical',form:TOOTH_FORMS.some(f=>f.id===p.form)?p.form!:'natural',
  shade:TOOTH_SHADES.some(s=>s.id===p.shade)?p.shade!:'preset',finish:TOOTH_FINISHES.some(s=>s.id===p.finish)?p.finish!:'preset',
  showRoots:typeof p.showRoots==='boolean'?p.showRoots:true,startView:TOOTH_VIEWS.some(v=>v.id===p.startView)?p.startView!:'front',
  color:color(p.color),background:color(p.background),gloss:p.gloss===null||p.gloss===undefined?null:amount(p.gloss,0,100,52),
  brightness:amount(p.brightness,70,150,100),rootTint:typeof p.rootTint==='boolean'?p.rootTint:true,
 };
}
export function toothStylePatch(id:ToothStyle):Partial<ToothAppearance>{
 const style=TOOTH_STYLES.find(s=>s.id===id)??TOOTH_STYLES[0];
 const {showRoots,startView,...base}=DEFAULT_TOOTH_APPEARANCE;
 void showRoots;void startView;
 return {...base,style:style.id,form:style.form,rootTint:!['cad','contour','titanium','graphite'].includes(style.id)};
}
export function toothSurface(p:ToothAppearance){
 const style=TOOTH_STYLES.find(s=>s.id===p.style)??TOOTH_STYLES[0];
 const shade=TOOTH_SHADES.find(s=>s.id===p.shade);
 const roughness=p.finish==='matte'?.9:p.finish==='ceramic'?.2:p.finish==='enamel'?.38:p.finish==='metal'?.28:style.roughness;
 return {color:p.color??shade?.color??style.tooth,background:p.background??style.background,
  roughness:p.gloss===null?roughness:.08+.87*(1-p.gloss/100),metalness:p.finish==='metal'?.7:p.finish==='preset'?style.metalness:0,
  clearcoat:p.finish==='enamel'||p.finish==='ceramic'||p.finish==='preset'&&style.metalness===0?.35:0,
  contour:p.finish==='contour'||p.finish==='preset'&&style.id==='contour',exposure:.9*p.brightness/100,
 };
}
export function toothShapeKey(p:ToothAppearance){return [p.form,...TOOTH_SHAPE_CONTROLS.map(c=>p[c.key])].join(':');}
const KEY='dentaya:tooth-appearance:v1',EVENT='dentaya:tooth-appearance';
let cachedRaw:string|null|undefined,cached:ToothAppearance=DEFAULT_TOOTH_APPEARANCE;
function snapshot(){try{const raw=localStorage.getItem(KEY);if(raw!==cachedRaw){cachedRaw=raw;try{cached=normalizeToothAppearance(raw?JSON.parse(raw):null);}catch{cached=DEFAULT_TOOTH_APPEARANCE;}}}catch{return DEFAULT_TOOTH_APPEARANCE;}return cached;}
function subscribe(callback:()=>void){const storage=(event:StorageEvent)=>{if(event.key===KEY||event.key===null)callback();};window.addEventListener(EVENT,callback);window.addEventListener('storage',storage);return()=>{window.removeEventListener(EVENT,callback);window.removeEventListener('storage',storage);};}
export function useToothAppearance(){return useSyncExternalStore(subscribe,snapshot,()=>DEFAULT_TOOTH_APPEARANCE);}
export function saveToothAppearance(patch:Partial<ToothAppearance>){const next=normalizeToothAppearance({...snapshot(),...patch});try{localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event(EVENT));return true;}catch{return false;}}
