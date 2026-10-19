'use client';
import {useRef,useState} from 'react';
import UiNode from '@/lib/i18n/UiNode';
import UserText from '@/lib/i18n/UserText';
import {useAyaKnowledge,saveAyaKnowledge,addAyaMemory,exportAyaKnowledge,importAyaKnowledgeFile} from '@/lib/aya-knowledge';
export default function AyaKnowledgePanel(){
 const {items,enabled}=useAyaKnowledge(),[title,setTitle]=useState(''),[content,setContent]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),input=useRef<HTMLInputElement>(null);
 function add(){if(addAyaMemory(title,content)){setTitle('');setContent('');setStatus('Kaydedildi');}else setStatus('Bu cihazda kaydedilemedi.');}
 async function load(file:File){setBusy(true);try{await importAyaKnowledgeFile(file);setStatus('Kaydedildi');}catch{setStatus('Dosya okunamadı.');}finally{setBusy(false);}}
 function download(){const url=URL.createObjectURL(new Blob([exportAyaKnowledge()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='AYA_Bilgi_Defteri.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <UiNode as="details" className="aya-knowledge aya-local-setup" id="knowledge"><UiNode as="summary">AYA bilgi defteri</UiNode><UiNode as="div">
  <UiNode as="label"><UiNode as="input" type="checkbox" checked={enabled} onChange={e=>{if(!saveAyaKnowledge(items,e.target.checked))setStatus('Bu cihazda kaydedilemedi.');}}/>Bilgi defterini yanıtlarda kullan</UiNode>
  <UiNode as="label">Başlık<UiNode as="input" aria-label="Başlık" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></UiNode>
  <UiNode as="label">Çalışma notu<UiNode as="textarea" aria-label="Çalışma notu" maxLength={12000} rows={3} value={content} onChange={e=>setContent(e.target.value)}/></UiNode>
  <UiNode as="div" className="aya-knowledge-actions"><UiNode as="button" type="button" disabled={!title.trim()||!content.trim()||busy||items.length>=64} onClick={add}>Hatırla</UiNode><UiNode as="button" type="button" disabled={busy} onClick={()=>input.current?.click()}>Dosya seç</UiNode><UiNode as="button" type="button" disabled={!items.length||busy} onClick={download}>Dışa aktar</UiNode></UiNode>
  <UiNode as="input" ref={input} type="file" hidden accept=".txt,.md,.json" aria-label="AYA bilgi dosyası" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void load(file);}}/>
  {items.map(item=><UiNode as="article" key={item.id} className="aya-knowledge-item"><UiNode as="strong"><UserText>{item.title}</UserText></UiNode><UiNode as="p"><UserText>{item.content.slice(0,280)}</UserText></UiNode><UiNode as="button" type="button" onClick={()=>{if(!saveAyaKnowledge(items.filter(d=>d.id!==item.id)))setStatus('Bu cihazda kaydedilemedi.');}}>Sil</UiNode></UiNode>)}
  <UiNode as="p" className="aya-knowledge-note">Bu bilgiler bu cihazda saklanır.</UiNode>{status&&<UiNode as="p" role="status">{status}</UiNode>}
 </UiNode></UiNode>;
}
