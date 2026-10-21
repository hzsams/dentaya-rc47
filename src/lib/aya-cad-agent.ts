import {TOOL_IDS,type AyaCadTool,type AyaProposal} from '../../electron/aya/agent.cjs';
import type {AyaCadContext,AyaCadEvidence} from './aya-cad-assistance';
import type {CadKernelReport} from '../app/design/DesignViewport';

export type AyaActionResult={ok:boolean;message:string};
export function cadStateToken(value:unknown){
 const s=JSON.stringify(value);let hash=14695981039346656037n;
 for(let i=0;i<s.length;i++)hash=BigInt.asUintN(64,(hash^BigInt(s.charCodeAt(i)))*1099511628211n);
 return 'rc47-'+hash.toString(16);
}
export function summarizeAyaReport(report:CadKernelReport,dataToken:string,antagonistReady:boolean,targetWallMm:number):AyaCadEvidence{
 const mesh=report.mesh,contact=antagonistReady?report.contact:null,margin=report.margin,shell=report.crownShell;
 return {dataToken,triangles:mesh?.triangleCount,boundaryEdges:mesh?.boundaryEdges,nonManifoldEdges:mesh?.nonManifoldEdges,components:mesh?.connectedComponents,degenerateTriangles:mesh?.degenerateTriangles,watertight:mesh?.watertight,collisionSamples:contact?.collisionCount,contactSamples:contact?.contactCount,samples:contact?.sampleCount,minimumSignedDistanceMm:contact?.minimumSignedDistanceMm,minimumWallEstimateMm:shell?.minimumWallEstimateMm,targetWallMm,undercutRatio:report.undercut?.undercutRatio,marginPoints:margin?.pointCount,marginClosureGapMm:margin?.closureGapMm,marginProjectedRatio:margin?.projectedRatio,connectors:report.connectorCount,connectorWarnings:report.connectorWarnings.length,warnings:[...(mesh?.warnings??[]),...report.connectorWarnings,...(shell?.warnings??[])].slice(0,8),contactReference:contact?'antagonist':'unavailable',wallMethod:'shell-offset-estimate'};
}
export function availableAyaTools(context:AyaCadContext,policy:{tools:readonly string[];views:readonly string[];internalFit:boolean;canNext:boolean;inspection?:boolean}):AyaCadTool[]{
 if(context.isSaving||!context.scope)return [];
 const result:AyaCadTool[]=['setup'];
 if(context.unit)result.push('library');
 if(context.sourceReady)result.push('save','save-exit');
 if(!context.modelReady)return result;
 result.push('inspect','fit-camera','show-all','isolate');
 if(policy.inspection)result.push('inspection',context.inspectionFlashlight?'flashlight-off':'flashlight-on');
 if(context.upperReady&&context.lowerReady)result.push('recorded-bite');
 if(context.setupComplete&&context.marginPoints>=3&&!context.placed)result.push('place');
 if((context.undoCount??0)>0)result.push('undo');
 if((context.redoCount??0)>0)result.push('redo');
 for(const view of ['natural','contact','thickness','undercut','section']){
  if(policy.views.includes(view)&&(view!=='contact'||context.antagonistReady===true))result.push(('view-'+view) as AyaCadTool);
 }
 for(const tool of ['margin','measure','add','reduce','smooth'])if(policy.tools.includes(tool))result.push(('tool-'+tool) as AyaCadTool);
 if(context.placed&&policy.internalFit)result.push('internal-fit');
 if(policy.canNext)result.push('next');
 return result;
}
export function ayaProposalBlock(proposal:AyaProposal,context:AyaCadContext):'stale'|'unavailable'|null{
 if(!context.scope||!context.snapshot||proposal.scope!==context.scope||proposal.snapshot!==context.snapshot)return 'stale';
 if(!TOOL_IDS.includes(proposal.tool)||!context.availableTools?.includes(proposal.tool)||context.isSaving)return 'unavailable';
 return null;
}
/** Dispatcher gets only typed host callbacks. The model never supplies code or numeric geometry parameters. */
export async function executeAyaProposal(proposal:AyaProposal,context:AyaCadContext,handlers:Partial<Record<AyaCadTool,()=>AyaActionResult|Promise<AyaActionResult>>>):Promise<AyaActionResult>{
 const blocked=ayaProposalBlock(proposal,context);
 if(blocked)return {ok:false,message:blocked==='stale'?'Çalışma değişti. Güncel durumla yeniden öneri isteyin.':'Bu işlem şu anda kullanılamıyor.'};
 const handler=handlers[proposal.tool];
 if(!handler)return {ok:false,message:'Bu işlem şu anda kullanılamıyor.'};
 try{const result=await handler();if(typeof result?.ok==='boolean'&&typeof result.message==='string'&&result.message.trim())return result;}catch{}
 return {ok:false,message:'İşlem tamamlanamadı. Çalışma durumunu kontrol edin.'};
}

/** One host-owned gate survives panel close/reopen and blocks concurrent/replayed clicks. */
export function createAyaActionDispatcher(){
 let busy=false,consumed='';
 return async(proposal:AyaProposal,getContext:()=>AyaCadContext|null,handlers:Partial<Record<AyaCadTool,()=>AyaActionResult|Promise<AyaActionResult>>>):Promise<AyaActionResult>=>{
  if(busy)return {ok:false,message:'Bu işlem şu anda kullanılamıyor.'};
  const context=getContext();
  if(!context||consumed===proposal.scope+'|'+proposal.snapshot)return {ok:false,message:'Çalışma değişti. Güncel durumla yeniden öneri isteyin.'};
  busy=true;
  try{
   const result=await executeAyaProposal(proposal,context,handlers);
   if(result.ok)consumed=proposal.scope+'|'+proposal.snapshot;
   return result;
  }finally{busy=false;}
 };
}
