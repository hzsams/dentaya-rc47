'use client';
import {useContext} from 'react';
import {useTranslation} from './index';
import {UserContentContext} from './ui-translation';
import {formatUiMessage,type UiMessageSpec} from './message';
export default function UiMessage(props:UiMessageSpec) {
 const {t}=useTranslation(),protectedContent=useContext(UserContentContext);
 return formatUiMessage(props,t,protectedContent);
}
