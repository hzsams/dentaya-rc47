'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {RealtimeChannel} from '@supabase/supabase-js';
import UiNode from '@/lib/i18n/UiNode';
import UiLink from '@/lib/i18n/UiLink';
import UserText from '@/lib/i18n/UserText';
import {useTranslation} from '@/lib/i18n';
import {supabase} from '@/lib/supabase';
import {dueLabel,homeStatus,localDay,type HomeCounts} from '@/lib/home-dashboard';
import {LAB_PAGE_SIZE,LAB_QUEUE_FILTERS,createLabLoadGate,labNextAction,searchLabPage,type LabCase,type LabCounts,type LabQueueFilter,type HomeLabQueue} from '@/lib/lab-workspace';
import {loadLabWorkspacePage} from '@/lib/load-lab-workspace';
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import DentayaIcon from '@/app/DentayaIcon';
import LabManagerPanel from '@/app/LabManagerPanel';
import {useDentayaThemeRuntime} from '@/app/dentaya-theme';
import '@/app/workspace-desktop.css';
type Org={id:string;name:string;org_type:'clinic'|'laboratory'|'courier'};
type Snapshot={cases:LabCase[];total:number;counts:LabCounts;filter:LabQueueFilter;page:number;updatedAt:string};
export default function LaboratoryWorkspacePage(){
 useDentayaThemeRuntime();
 const router=useRouter(),{locale,intlLocale,t:uiText}=useTranslation(),tr=locale==='tr';
 const [org,setOrg]=useState<Org|null>(null),[role,setRole]=useState('member'),[booting,setBooting]=useState(true),[loading,setLoading]=useState(false),[error,setFailure]=useState<''|'boot'|'load'>('');
 const [filter,setFilter]=useState<LabQueueFilter>('active'),[page,setPage]=useState(0),[search,setSearch]=useState(''),[snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const loadGate=useRef(createLabLoadGate()),requestRef=useRef({filter,page}),orgScopeRef=useRef('');
 useEffect(()=>{requestRef.current={filter,page};},[filter,page]);
 const copy=tr?{title:'Lab Yöneticisi',refresh:'Yenile',refreshing:'Güncelleniyor…',queue:'Laboratuvar iş kuyruğu',search:'Bu sayfada vaka ara',case:'Vaka / Hasta Ref',job:'İş ve materyal',status:'Aşama',due:'Termin',action:'Sıradaki işlem',empty:'Bu görünümde kayıt bulunmuyor.',noMatch:'Bu sayfada arama sonucu bulunamadı.',next:'Sonraki sayfa',previous:'Önceki sayfa',page:'Sayfa',total:'Toplam kayıt',preview:'Arama yalnız açık sayfayı tarar. Diğer kayıtlara sayfa kontrolleriyle ulaşabilirsiniz.',loadFail:'Laboratuvar kuyruğu güncellenemedi.',last:'Son başarılı kayıtlar korunuyor.',retry:'Tekrar dene',workspace:'İş yöneticisine dön',noOrg:'Laboratuvar çalışma alanı açılamadı.',updated:'Son güncelleme',loading:'İş kuyruğu yükleniyor…',filters:'Kuyruk görünümü',filterNames:{active:'Açık işler',priority:'Öncelikli',overdue:'Geciken',today:'Bugün teslim',new:'Yeni işler',design:'Tasarım',approval:'Onay bekleyen',production:'Üretim / QC',all:'Açık ve tamamlanan'}}:{title:'Lab Manager',refresh:'Refresh',refreshing:'Refreshing…',queue:'Laboratory work queue',search:'Search cases on this page',case:'Case / Patient ref',job:'Job and material',status:'Stage',due:'Due',action:'Next action',empty:'There are no records in this view.',noMatch:'No matching records on this page.',next:'Next page',previous:'Previous page',page:'Page',total:'Total records',preview:'Search covers this page only. Use the page controls to reach other records.',loadFail:'The laboratory queue could not be refreshed.',last:'The last successfully loaded records are retained.',retry:'Try again',workspace:'Back to job manager',noOrg:'The laboratory workspace could not be opened.',updated:'Last updated',loading:'Loading work queue…',filters:'Queue view',filterNames:{active:'Open jobs',priority:'Priority',overdue:'Overdue',today:'Due today',new:'New jobs',design:'Design',approval:'Awaiting approval',production:'Production / QC',all:'Open and completed'}};
 const load=useCallback(async(orgId:string,nextFilter:LabQueueFilter,nextPage:number)=>{
  if(orgScopeRef.current!==orgId)return;
  const ticket=loadGate.current.begin();setLoading(true);setFailure('');
  try{const result=await loadLabWorkspacePage(orgId,nextFilter,nextPage);if(!loadGate.current.isCurrent(ticket))return;const last=Math.max(0,Math.ceil(result.total/LAB_PAGE_SIZE)-1);if(nextPage>last){setPage(last);return;}setSnapshot({...result,filter:nextFilter,page:nextPage,updatedAt:new Date().toISOString()});}
  catch{if(loadGate.current.isCurrent(ticket))setFailure('load');}
  finally{if(loadGate.current.isCurrent(ticket))setLoading(false);}
 },[]);
 useEffect(()=>{
  let active=true,revision=0;let authUserId:string|null|undefined;const gate=loadGate.current;
  function leaveWorkspace(){
   revision++;orgScopeRef.current='';gate.invalidate();requestRef.current={filter:'active',page:0};setOrg(null);setRole('member');setSnapshot(null);setFilter('active');setPage(0);setSearch('');setLoading(false);setFailure('');setBooting(false);router.replace('/workspace');
  }
  const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
   if(!active)return;const nextUserId=session?.user.id??null;
   if(event==='SIGNED_OUT'||(authUserId!==undefined&&authUserId!==nextUserId))leaveWorkspace();
   authUserId=nextUserId;
  });
  async function boot(){
   const started=revision;const current=()=>active&&started===revision;
   try{
    const {data:session,error:sessionError}=await supabase.auth.getSession();if(!current())return;
    if(sessionError)throw sessionError;if(!session.session?.user){router.replace('/workspace');return;}
    if(authUserId!==undefined&&authUserId!==session.session.user.id){leaveWorkspace();return;}authUserId=session.session.user.id;
    const {data:member,error:memberError}=await supabase.from('memberships').select('organization_id,role').eq('user_id',session.session.user.id).eq('status','active').limit(1).maybeSingle();if(!current())return;if(memberError||!member)throw memberError??new Error('LAB_MEMBERSHIP_MISSING');
    const {data:organization,error:orgError}=await supabase.from('organizations').select('id,name,org_type').eq('id',member.organization_id).maybeSingle();if(!current())return;if(orgError||!organization)throw orgError??new Error('LAB_ORGANIZATION_MISSING');
    const currentOrg=organization as Org;if(currentOrg.org_type!=='laboratory'){router.replace(currentOrg.org_type==='clinic'?'/clinic':'/logistics');return;}
    orgScopeRef.current=currentOrg.id;setRole(member.role??'member');setOrg(currentOrg);
   }catch{if(current())setFailure('boot');}finally{if(current())setBooting(false);}
  }
  void boot();return()=>{active=false;revision++;orgScopeRef.current='';gate.invalidate();listener.subscription.unsubscribe();};
 },[router]);
 useEffect(()=>{
  if(!org)return;const gate=loadGate.current;void load(org.id,filter,page);return()=>gate.invalidate();
 },[org,filter,page,load]);
 useEffect(()=>{
  if(!org)return;let active=true;let channel:RealtimeChannel|null=null;let timer:ReturnType<typeof setTimeout>|undefined;
  channel=supabase.channel('lab-queue-'+org.id).on('postgres_changes',{event:'*',schema:'public',table:'cases',filter:'lab_org_id=eq.'+org.id},()=>{if(!active)return;clearTimeout(timer);timer=setTimeout(()=>{if(!active)return;const current=requestRef.current;void load(org.id,current.filter,current.page);},180);}).subscribe();
  return()=>{active=false;clearTimeout(timer);if(channel)void supabase.removeChannel(channel);};
 },[org,load]);
 function navigateQueue(next:LabQueueFilter,nextPage:number){
  if(next===filter&&nextPage===page){if(error==='load'&&org)void load(org.id,next,nextPage);return;}
  loadGate.current.invalidate();requestRef.current={filter:next,page:nextPage};setFilter(next);setPage(nextPage);setSearch('');
 }
 function choose(next:LabQueueFilter){navigateQueue(next,0);}
 if(booting)return <LoadingExperience title={tr?'Laboratuvar çalışma alanı hazırlanıyor…':'Preparing laboratory workspace…'}/>;
 if(!org)return <UiNode as="main" className="desktop-workspace-home lab-queue-unavailable" translateChildren={false}><DentayaIcon name="lab" size={34}/><UiNode as="h1">{copy.noOrg}</UiNode><UiLink href="/workspace" translateChildren={false}>{copy.workspace}</UiLink></UiNode>;
 const rows=snapshot?searchLabPage(snapshot.cases,search,intlLocale()):[],shownFilter=snapshot?.filter??filter,shownPage=snapshot?.page??page,counts=snapshot?.counts;
 const homeCounts:HomeCounts|null=counts?{active:counts.active,urgent:counts.priority,approval:counts.approval,overdue:counts.overdue,today:counts.today,pickup:0,inTransit:0,pickedUp:0}:null;
 const leftQueue:HomeLabQueue=(['active','approval','overdue','today'] as string[]).includes(shownFilter)?shownFilter as HomeLabQueue:'priority';
 const refresh=()=>void load(org.id,filter,page),pages=Math.max(1,Math.ceil((snapshot?.total??0)/LAB_PAGE_SIZE));
 return <UiNode as="main" className="desktop-workspace-home laboratory-workspace" aria-busy={loading} translateChildren={false}>
  <UiNode as="header" className="desktop-home-toolbar lab-header" translateChildren={false}><UiNode as="div" className="desktop-home-heading" translateChildren={false}><DentayaIcon name="lab" size={22}/><UiNode as="h1">{copy.title}</UiNode><UiNode as="span" className="desktop-home-divider"/><UserText>{org.name}</UserText></UiNode><UiNode as="div" className="desktop-home-toolbar-actions" translateChildren={false}><UiLink href="/workspace" className="desktop-home-button" translateChildren={false}>{copy.workspace}</UiLink><UiNode as="button" type="button" className="desktop-home-button" disabled={loading} onClick={refresh} translateChildren={false}>{loading?copy.refreshing:copy.refresh}</UiNode></UiNode></UiNode>
  {error&&<UiNode as="div" className="desktop-home-error" role="alert" translateChildren={false}><DentayaIcon name="notification" size={20}/><UiNode as="div" translateChildren={false}><UiNode as="strong">{copy.loadFail}</UiNode>{snapshot&&<UiNode as="span">{copy.last}</UiNode>}</UiNode><UiNode as="button" type="button" onClick={refresh} disabled={loading} translateChildren={false}>{copy.retry}</UiNode></UiNode>}
  <UiNode as="div" className="lab-queue-workbench" translateChildren={false}><LabManagerPanel queuePage targetId="lab-queue-records" counts={homeCounts} queue={leftQueue} role={role} onQueue={next=>choose(next==='recent'?'all':next)}/>
   <UiNode as="section" className="desktop-home-records lab-queue-records" id="lab-queue-records" aria-label={copy.queue} translateChildren={false}>
    <UiNode as="div" className="desktop-home-panel-heading" translateChildren={false}><DentayaIcon name="case" size={18}/><UiNode as="h2">{copy.queue}</UiNode><UiNode as="span" className="desktop-home-tag">{snapshot?String(snapshot.total):'—'}</UiNode></UiNode>
    <UiNode as="div" className="desktop-home-records-toolbar" translateChildren={false}><UiNode as="div" className="desktop-home-view-buttons" role="group" aria-label={copy.filters} translateChildren={false}>{LAB_QUEUE_FILTERS.map(kind=><UiNode as="button" key={kind} type="button" aria-pressed={shownFilter===kind} disabled={loading} onClick={()=>choose(kind)} translateChildren={false}>{copy.filterNames[kind]}{kind!=='all'&&counts&&<UiNode as="b">{counts[kind]}</UiNode>}</UiNode>)}</UiNode><UiNode as="label" className="desktop-home-record-search" translateChildren={false}><DentayaIcon name="guide" size={16}/><UiNode as="input" type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={e=>setSearch(e.target.value)} translateChildren={false}/></UiNode></UiNode>
    <UiNode as="div" className="desktop-home-table-scroll" translateChildren={false}><UiNode as="table" className="desktop-home-table lab-queue-table" translateChildren={false}><UiNode as="thead"><UiNode as="tr"><UiNode as="th" scope="col">{copy.case}</UiNode><UiNode as="th" scope="col">{copy.job}</UiNode><UiNode as="th" scope="col">{copy.status}</UiNode><UiNode as="th" scope="col">{copy.due}</UiNode><UiNode as="th" scope="col">{copy.action}</UiNode></UiNode></UiNode><UiNode as="tbody">{rows.map(item=>{const action=labNextAction(item),late=item.due_date&&item.due_date<localDay()&&!['delivered','cancelled'].includes(item.status);return <UiNode as="tr" key={item.id} data-lab-case={item.id}><UiNode as="td"><UiLink href={'/cases/'+encodeURIComponent(item.id)} className="lab-queue-case"><UiNode as="strong"><UserText>{item.case_number}</UserText></UiNode><UiNode as="small"><UserText>{item.patient_reference||'—'}</UserText></UiNode></UiLink></UiNode><UiNode as="td"><UserText>{item.title||item.case_type}</UserText><UiNode as="small" className="lab-queue-material"><UserText>{[item.material,item.shade,item.tooth_codes.join(', ')].filter(Boolean).join(' · ')||'—'}</UserText></UiNode></UiNode><UiNode as="td"><UiNode as="span" className="desktop-home-status">{uiText(homeStatus(item.status))}</UiNode>{['urgent','high'].includes(item.priority)&&<UiNode as="small" className="lab-queue-priority">{uiText(item.priority==='urgent'?'Acil':'Yüksek öncelik')}</UiNode>}</UiNode><UiNode as="td"><UiNode as="span" className={late?'desktop-home-danger':undefined}>{dueLabel(item.due_date,intlLocale())}</UiNode></UiNode><UiNode as="td"><UiLink href={action.href} className="desktop-home-button lab-queue-action"><DentayaIcon name={action.icon} size={16}/>{uiText(action.label)}</UiLink></UiNode></UiNode>;})}</UiNode></UiNode></UiNode>
    {!rows.length&&<UiNode as="div" className="desktop-home-empty" role="status" translateChildren={false}><DentayaIcon name="lab" size={32}/><UiNode as="strong">{!snapshot?loading?copy.loading:error?copy.loadFail:copy.empty:search?copy.noMatch:copy.empty}</UiNode></UiNode>}
    <UiNode as="div" className="lab-queue-pagination" translateChildren={false}><UiNode as="span">{copy.page} {shownPage+1} / {pages} · {copy.total}: {snapshot?.total??'—'}</UiNode><UiNode as="button" type="button" className="desktop-home-button" disabled={loading||!snapshot||shownPage===0} onClick={()=>navigateQueue(shownFilter,shownPage-1)} translateChildren={false}>{copy.previous}</UiNode><UiNode as="button" type="button" className="desktop-home-button" disabled={loading||!snapshot||shownPage+1>=pages} onClick={()=>navigateQueue(shownFilter,shownPage+1)} translateChildren={false}>{copy.next}</UiNode></UiNode>
    <UiNode as="div" className="desktop-home-records-note lab-queue-footer" translateChildren={false}><DentayaIcon name="guide" size={15}/><UiNode as="span">{copy.preview}{snapshot&&' '+copy.updated+': '+new Date(snapshot.updatedAt).toLocaleTimeString(intlLocale(),{hour:'2-digit',minute:'2-digit'})}</UiNode></UiNode>
   </UiNode>
  </UiNode>
 </UiNode>;
}
