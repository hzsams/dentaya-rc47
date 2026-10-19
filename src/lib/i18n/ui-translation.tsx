'use client';
import { cloneElement, createContext, Fragment, isValidElement, useContext, type ReactNode } from 'react';
import { useTranslation } from './index';
import {formatUiMessage,type UiMessageSpec} from './message';
export type UiMessages=Partial<Record<'title'|'placeholder'|'aria-label'|'alt'|'aria-description',UiMessageSpec>>;
export const UserContentContext = createContext(false);
export function translateChildren(value:ReactNode,t:(source:string)=>string):ReactNode {
 if(typeof value==='string')return t(value);
 if(Array.isArray(value))return value.map(child=>translateChildren(child,t));
 if(isValidElement<{children?:ReactNode}>(value)&&value.type===Fragment){const children=translateChildren(value.props.children,t);return cloneElement(value,undefined,...(Array.isArray(children)?children:[children]));}
 return value;
}
export function useUiProps<P extends {children?:ReactNode;translateChildren?:boolean;uiMessages?:UiMessages;'data-user-content'?:unknown}>(props:P) {
 const {t}=useTranslation(),inherited=useContext(UserContentContext);
 const {translateChildren:enabled=true,uiMessages,...rest}=props;
 const protectedContent=inherited||rest['data-user-content']!==undefined,next={...rest} as Record<string,unknown>;
 if(!protectedContent){for(const name of ['title','placeholder','aria-label','alt','aria-description','label'])if(typeof next[name]==='string')next[name]=t(next[name] as string);if(enabled)next.children=translateChildren(next.children as ReactNode,t);}
 if(uiMessages)for(const [name,message] of Object.entries(uiMessages))if(message)next[name]=formatUiMessage(message,t,protectedContent);
 if(protectedContent&&!inherited)next.children=<UserContentContext.Provider value>{next.children as ReactNode}</UserContentContext.Provider>;
 return next;
}
