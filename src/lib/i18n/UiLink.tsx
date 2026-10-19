'use client';
import Link from 'next/link';
import {createElement,type ComponentProps,type ReactNode} from 'react';
import {useUiProps,type UiMessages} from './ui-translation';
type Props=ComponentProps<typeof Link>&{translateChildren?:boolean;uiMessages?:UiMessages;'data-user-content'?:unknown};
export default function UiLink(props:Props){const {children,...rest}=useUiProps(props);return createElement(Link,rest as unknown as ComponentProps<typeof Link>,...(Array.isArray(children)?children:[children as ReactNode]));}
