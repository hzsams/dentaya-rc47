'use client';
import {createElement,type JSX,type ReactNode,type ComponentPropsWithRef} from 'react';
import LocalizedFileInput from './LocalizedFileInput';
import {useUiProps,type UiMessages} from './ui-translation';
type Props<K extends keyof JSX.IntrinsicElements>={as:K;translateChildren?:boolean;uiMessages?:UiMessages;'data-user-content'?:unknown}&JSX.IntrinsicElements[K];
export default function UiNode<K extends keyof JSX.IntrinsicElements>({as,...props}:Props<K>){const {children,...rest}=useUiProps(props);if(as==='input'&&rest.type==='file')return <LocalizedFileInput {...rest as ComponentPropsWithRef<'input'>}/>;return createElement(as,rest,...(Array.isArray(children)?children:[children as ReactNode]));}
