export type CadColorRole='working'|'antagonist'|'restoration'|'margin';
export const CAD_COLOR_GROUPS=[
 {id:'technical',name:'Teknik',working:'#83827e',antagonist:'#ff4800',restoration:'#f2d56b',margin:'#65bd55'},
 {id:'natural',name:'Doğal',working:'#d1c9b8',antagonist:'#b9b6b0',restoration:'#f0e8d2',margin:'#5bbf9d'},
 {id:'studio',name:'Studio',working:'#b2bac4',antagonist:'#8fbdd0',restoration:'#f2d7a3',margin:'#70d7b4'},
 {id:'contrast',name:'Contrast',working:'#c7c7c7',antagonist:'#609cdb',restoration:'#f6cf63',margin:'#d3a8ef'},
 {id:'ceramic',name:'Ceramic',working:'#c6bfb0',antagonist:'#b8a4a0',restoration:'#fff0d6',margin:'#6abca0'},
 {id:'slate',name:'Slate',working:'#9da8b4',antagonist:'#b6a1ce',restoration:'#d9e6db',margin:'#e3bb79'},
] as const;
export type CadColorPreset=typeof CAD_COLOR_GROUPS[number]['id'];
export type CadColorSettings={render_palette?:CadColorPreset;render_colors?:Partial<Record<CadColorRole,string>>};
export function cadColorGroup(settings:CadColorSettings){return CAD_COLOR_GROUPS.find(p=>p.id===settings.render_palette)??CAD_COLOR_GROUPS[0];}
export function cadRoleColor(settings:CadColorSettings,role:CadColorRole,naturalRestoration?:string){
 const override=settings.render_colors?.[role];if(typeof override==='string'&&/^#[a-f0-9]{6}$/i.test(override))return override.toLowerCase();
 if(role==='restoration'&&settings.render_palette==='natural'&&naturalRestoration&&/^#[a-f0-9]{6}$/i.test(naturalRestoration))return naturalRestoration;
 return cadColorGroup(settings)[role];
}
