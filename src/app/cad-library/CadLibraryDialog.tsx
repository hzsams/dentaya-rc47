'use client';
import {useEffect,useRef} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import CadFormLibrary from './CadFormLibrary';
import type {CadLibraryForm} from '@/lib/cad-form-library';
export default function CadLibraryDialog({open,onClose,...props}:{open:boolean;onClose:()=>void;ownerId:string;anatomyCode?:string;projectForms?:CadLibraryForm[];onSelect?:(form:CadLibraryForm)=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open&&!ref.current?.open)ref.current?.showModal();else if(!open&&ref.current?.open)ref.current.close();},[open]);
 return <UiNode as="dialog" ref={ref} className="cad-library-dialog" aria-label="Form kütüphanesi" onCancel={event=>{event.preventDefault();if(!ref.current?.querySelector('[aria-busy=true]'))onClose();}}><UiNode as="header"><UiNode as="h2">Form kütüphanesi</UiNode><UiNode as="button" type="button" onClick={()=>{if(!ref.current?.querySelector('[aria-busy=true]'))onClose();}}>Kapat</UiNode></UiNode>{open&&<CadFormLibrary {...props}/>}</UiNode>;
}
