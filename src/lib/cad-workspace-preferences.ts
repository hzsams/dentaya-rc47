'use client';
import {useSyncExternalStore} from 'react';
export type CadWorkspacePreferences={followToothStyle:boolean;grid:boolean;axes:boolean;background:'studio'|'theme'|'graphite'|'slate'|'paper';rotateSpeed:number;zoomSpeed:number;panSpeed:number;damping:boolean};
export const DEFAULT_CAD_WORKSPACE:CadWorkspacePreferences={followToothStyle:false,grid:false,axes:false,background:'studio',rotateSpeed:1,zoomSpeed:1,panSpeed:1,damping:true};
export function normalizeCadWorkspace(input:unknown):CadWorkspacePreferences {
 const v=input&&typeof input==='object'?input as Partial<CadWorkspacePreferences>:{};
 const speed=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.max(.25,Math.min(2,n)):1;
 return {followToothStyle:v.followToothStyle===true,grid:v.grid===true,axes:v.axes===true,background:['studio','graphite','slate','paper'].includes(v.background??'')?v.background!:v.background==='theme'?'theme':'studio',rotateSpeed:speed(v.rotateSpeed),zoomSpeed:speed(v.zoomSpeed),panSpeed:speed(v.panSpeed),damping:v.damping!==false};
}
const KEY='dentaya:cad-workspace:v1',listeners=new Set<()=>void>();let state=DEFAULT_CAD_WORKSPACE,loaded=false;
function read(){try{return normalizeCadWorkspace(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return DEFAULT_CAD_WORKSPACE;}}
function get(){if(!loaded&&typeof window!=='undefined'){state=read();loaded=true;}return state;}
function storage(e:StorageEvent){if(e.key!==KEY&&e.key!==null)return;state=read();listeners.forEach(fn=>fn());}
function subscribe(fn:()=>void){listeners.add(fn);if(listeners.size===1)window.addEventListener('storage',storage);return()=>{listeners.delete(fn);if(!listeners.size)window.removeEventListener('storage',storage);};}
export function useCadWorkspace(){return useSyncExternalStore(subscribe,get,()=>DEFAULT_CAD_WORKSPACE);}
export function updateCadWorkspace(patch:Partial<CadWorkspacePreferences>){state=normalizeCadWorkspace({...get(),...patch});let saved=true;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{saved=false;}listeners.forEach(fn=>fn());return saved;}
