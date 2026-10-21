type StyleSurface={roughness:number;metalness:number;clearcoat:number};
/** Optical finish only. Technical distance/contact maps keep a neutral, uncoated material. */
export function cadRestorationSurface(naturalPalette:boolean,naturalView:boolean,style?:StyleSurface) {
 const surface=style??(naturalPalette?{roughness:.32,metalness:0,clearcoat:.24}:{roughness:.42,metalness:.03,clearcoat:0});
 return {roughness:surface.roughness,metalness:surface.metalness,clearcoat:naturalPalette&&naturalView?surface.clearcoat:0,clearcoatRoughness:Math.max(.12,surface.roughness*.55)};
}
