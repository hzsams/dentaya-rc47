'use client';
import UiNode from '@/lib/i18n/UiNode';
import {useTranslation} from '@/lib/i18n';
import {useState} from 'react';
import {
 DEFAULT_TOOTH_APPEARANCE,TOOTH_STYLES,TOOTH_FORMS,TOOTH_VIEWS,TOOTH_SHADES,TOOTH_FINISHES,TOOTH_SHAPE_CONTROLS,
 saveToothAppearance,useToothAppearance,toothStylePatch,toothSurface,type ToothAppearance,
} from '@/lib/tooth-appearance';
import type {ToothPlan} from '@/lib/tooth-plan';
import ToothChart from './ToothChart';

export default function ToothAppearanceSettings(){
 const {t,intlLocale}=useTranslation(),preferences=useToothAppearance(),surface=toothSurface(preferences);
 const [message,setMessage]=useState(''),[preview,setPreview]=useState(true),[selected,setSelected]=useState<string[]>([]),[plan,setPlan]=useState<ToothPlan>({roles:{},links:[]});
 const update=(patch:Partial<ToothAppearance>)=>setMessage(saveToothAppearance(patch)?'Görünüm kaydedildi.':'Ayar kaydedilemedi. Tarayıcı depolama iznini kontrol edin.');
 const percent=(value:number)=>new Intl.NumberFormat(intlLocale(),{style:'percent',maximumFractionDigits:0}).format(value/100);
 return <UiNode as="div" className="tooth-appearance-settings">
  <UiNode as="p">Vaka, hasta ve CAD diş seçiminde aynı görünüm kullanılır. Tercihiniz bu cihazda otomatik kaydedilir.</UiNode>
  <UiNode as="details" className="tooth-live-preview" open={preview} onToggle={e=>setPreview(e.currentTarget.open)}>
   <UiNode as="summary">Canlı diş önizlemesi</UiNode>
   {preview&&<ToothChart selected={selected} plan={plan} onChange={(codes,next)=>{setSelected(codes);setPlan(next);}}/>}
  </UiNode>
  <UiNode as="details" className="tooth-preset-picker">
   <UiNode as="summary">Hazır diş görünümleri</UiNode>
   <UiNode as="p">Hazır görünüm, diş formunu ve yüzeyini birlikte değiştirir. Ardından ayrıntıları düzenleyebilirsiniz.</UiNode>
   <UiNode as="div" className="tooth-style-grid" role="group" aria-label="Diş görünüm tarzı">
    {TOOTH_STYLES.map(style=><UiNode as="button" key={style.id} type="button" data-tooth-preset={style.id} aria-pressed={preferences.style===style.id} onClick={()=>update(toothStylePatch(style.id))}>
     <UiNode as="span" className={`tooth-style-swatch swatch-${style.id}`} style={{background:style.background,color:style.tooth}} aria-hidden="true">
      <svg viewBox="0 0 100 56"><g transform={style.form==='broad'||style.form==='square'?'translate(-6 0) scale(1.12 1)':style.form==='slender'?'translate(8 0) scale(.84 1)':style.form==='compact'||style.form==='worn'?'translate(0 5) scale(1 .82)':style.form==='youthful'?'scale(1 1.07)':undefined}><path d="M30 7C20 2 12 10 15 25L21 49Q25 55 29 40L33 28Q36 25 38 39L42 49Q46 54 48 44L54 24C57 10 48 2 39 7Q35 10 30 7Z"/><path d="M69 8C59 4 56 15 58 27L63 48Q67 54 70 39L74 27Q77 27 80 42Q84 53 88 43L93 23C95 10 85 3 77 8Q73 10 69 8Z"/></g></svg>
     </UiNode>
     <UiNode as="strong">{style.name}</UiNode><UiNode as="small">{style.description}</UiNode>
     <UiNode as="span" className="tooth-style-state">{preferences.style===style.id?'✓ Seçili':'Bu görünümü kullan'}</UiNode>
    </UiNode>)}
   </UiNode>
  </UiNode>
  <UiNode as="div" className="tooth-control-sections">
   <UiNode as="section" aria-label="Form ve ölçüler">
    <UiNode as="h4">Form ve ölçüler</UiNode>
    <UiNode as="label" className="tooth-option">Diş formu<UiNode as="select" aria-label="Diş formu" value={preferences.form} onChange={e=>update({form:e.target.value as ToothAppearance['form']})}>{TOOTH_FORMS.map(f=><UiNode as="option" key={f.id} value={f.id}>{f.name}</UiNode>)}</UiNode></UiNode>
    {TOOTH_SHAPE_CONTROLS.map(control=><UiNode as="label" className="tooth-range" key={control.key}><UiNode as="span">{control.name}<UiNode as="output" translateChildren={false}>{percent(preferences[control.key])}</UiNode></UiNode><UiNode as="input" type="range" aria-label={t(control.name)} min={control.min} max={control.max} step={1} value={preferences[control.key]} onChange={e=>update({[control.key]:Number(e.target.value)})}/></UiNode>)}
    <UiNode as="button" type="button" onClick={()=>update({form:'natural',width:100,crownHeight:100,depth:100,cuspRelief:100,rootLength:100,wear:0})}>Form ayarlarını sıfırla</UiNode>
   </UiNode>
   <UiNode as="section" aria-label="Renk ve yüzey">
    <UiNode as="h4">Renk ve yüzey</UiNode>
    <UiNode as="label" className="tooth-option">Diş rengi<UiNode as="select" aria-label="Diş rengi" value={preferences.shade} onChange={e=>update({shade:e.target.value as ToothAppearance['shade'],color:null})}>{TOOTH_SHADES.map(shade=><UiNode as="option" key={shade.id} value={shade.id}>{shade.name}</UiNode>)}</UiNode></UiNode>
    <UiNode as="div" className="tooth-shade-row" role="group" aria-label="Diş renk örnekleri">{TOOTH_SHADES.filter(shade=>shade.color).map(shade=><UiNode as="button" type="button" key={shade.id} aria-pressed={preferences.shade===shade.id&&!preferences.color} title={shade.name} aria-label={shade.name} style={{background:shade.color!,color:'#17202b'}} onClick={()=>update({shade:shade.id,color:null})}>{shade.name}</UiNode>)}</UiNode>
    <UiNode as="label" className="tooth-option">Özel diş rengi<UiNode as="input" type="color" aria-label="Özel diş rengi" value={surface.color} onChange={e=>update({color:e.target.value})}/></UiNode>
    <UiNode as="label" className="tooth-option">Yüzey<UiNode as="select" aria-label="Diş yüzeyi" value={preferences.finish} onChange={e=>update({finish:e.target.value as ToothAppearance['finish'],gloss:null})}>{TOOTH_FINISHES.map(f=><UiNode as="option" key={f.id} value={f.id}>{f.name}</UiNode>)}</UiNode></UiNode>
    <UiNode as="label" className="tooth-range"><UiNode as="span">Parlaklık<UiNode as="output" translateChildren={false}>{percent(preferences.gloss??Math.round((.95-surface.roughness)/.87*100))}</UiNode></UiNode><UiNode as="input" type="range" aria-label="Diş parlaklığı" min={0} max={100} value={preferences.gloss??Math.round((.95-surface.roughness)/.87*100)} onChange={e=>update({gloss:Number(e.target.value)})}/></UiNode>
    <UiNode as="label" className="tooth-check"><UiNode as="input" type="checkbox" checked={preferences.rootTint} onChange={e=>update({rootTint:e.target.checked})}/> Kök rengini ayır</UiNode>
    <UiNode as="small">Renk örnekleri ekran önizlemesidir; klinik renk ölçümü değildir.</UiNode>
   </UiNode>
   <UiNode as="section" aria-label="Sahne ve görünüm">
    <UiNode as="h4">Sahne ve görünüm</UiNode>
    <UiNode as="label" className="tooth-option">Arka plan rengi<UiNode as="input" type="color" aria-label="Diş önizlemesi arka plan rengi" value={surface.background} onChange={e=>update({background:e.target.value})}/></UiNode>
    <UiNode as="label" className="tooth-range"><UiNode as="span">Işık düzeyi<UiNode as="output" translateChildren={false}>{percent(preferences.brightness)}</UiNode></UiNode><UiNode as="input" type="range" aria-label="Diş önizlemesi ışık düzeyi" min={70} max={150} value={preferences.brightness} onChange={e=>update({brightness:Number(e.target.value)})}/></UiNode>
    <UiNode as="label" className="tooth-check"><UiNode as="input" type="checkbox" checked={preferences.showRoots} onChange={e=>update({showRoots:e.target.checked})}/> Önden görünümde kökleri göster</UiNode>
    <UiNode as="label" className="tooth-option">İlk açılış görünümü<UiNode as="select" aria-label="İlk açılış görünümü" value={preferences.startView} onChange={e=>update({startView:e.target.value as ToothAppearance['startView']})}>{TOOTH_VIEWS.map(v=><UiNode as="option" key={v.id} value={v.id}>{v.name}</UiNode>)}</UiNode></UiNode>
    <UiNode as="button" type="button" onClick={()=>update({color:null,background:null,shade:'preset',finish:'preset',gloss:null,brightness:100})}>Tarz renklerine dön</UiNode>
   </UiNode>
  </UiNode>
  <UiNode as="div" className="tooth-appearance-options"><UiNode as="button" type="button" onClick={()=>update(DEFAULT_TOOTH_APPEARANCE)}>Varsayılana dön</UiNode></UiNode>
  <UiNode as="p" className="tooth-appearance-status" role="status">{message||'Formlar yalnızca seçim ekranını değiştirir; CAD restorasyonu ve hasta taraması değişmez.'}</UiNode>
 </UiNode>;
}
