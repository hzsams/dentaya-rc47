import {experienceDuration} from './experience-preferences';
const active=new Set<Animation>();
export function cancelExperienceAnimations(){for(const animation of active)animation.cancel();active.clear();}
export function animateExperienceSurface(element:HTMLElement|null,kind:'page'|'panel'='panel'){
 const duration=experienceDuration(kind);if(!element||!duration||!element.animate)return;
 // Opacity only: never transform a CAD canvas, draggable panel or pointer coordinate space.
 const animation=element.animate([{opacity:.68},{opacity:1}],{duration,easing:'cubic-bezier(.16,1,.3,1)'});active.add(animation);const done=()=>active.delete(animation);animation.addEventListener('finish',done,{once:true});animation.addEventListener('cancel',done,{once:true});
}
