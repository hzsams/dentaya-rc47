'use client';
import {useEffect,useImperativeHandle,useRef,useState,type ComponentPropsWithRef} from 'react';
import {useTranslation} from './index';
export default function LocalizedFileInput({ref,style,className,onChange,...props}:ComponentPropsWithRef<'input'>){
 const {t,intlLocale,locale}=useTranslation(),input=useRef<HTMLInputElement>(null),[names,setNames]=useState<string[]>([]);
 useImperativeHandle(ref,()=>input.current!,[]);
 useEffect(()=>{const form=input.current?.form;if(!form)return;const reset=(event:Event)=>{queueMicrotask(()=>{if(!event.defaultPrevented)setNames([]);});};form.addEventListener('reset',reset);return()=>form.removeEventListener('reset',reset);},[]);
 const caption=names.length===0?t('Dosya seçilmedi'):names.length===1?names[0]:t('{0} dosya seçildi').replace('{0}',new Intl.NumberFormat(intlLocale()).format(names.length));
 return <span hidden={props.hidden} className={`localized-file-input ${className||''}`} style={style}>
 <input {...props} lang={locale} ref={input} type="file" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:props.disabled?'default':'pointer'}} onChange={event=>{onChange?.(event);setNames(Array.from(event.target.files||[],file=>file.name));}}/>
 <span aria-hidden="true" className="localized-file-input-action">{t(props.multiple?'Dosyaları seç':'Dosya seç')}</span><span aria-hidden="true" dir="auto" className="localized-file-input-name" title={names.join(', ')}>{caption}</span></span>;
}
