'use client';
import UiNode from "@/lib/i18n/UiNode";
import Link from '@/lib/i18n/UiLink';
import {useTranslation} from '@/lib/i18n';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import {dentalFactLanguage} from '@/lib/dental-language';
import {ayaModuleFromParam} from '@/lib/aya-module-navigation';
import {useSearchParams} from 'next/navigation';
import {Suspense} from 'react';
import AyaChat from './AyaChat';

function ModuleAwareChat() {
    const moduleIds = useSearchParams().getAll('module');
    const sourceModule = ayaModuleFromParam(moduleIds.length === 1 ? moduleIds[0] : null);
    return <AyaChat key={sourceModule?.id ?? 'general'} sourceModule={sourceModule} />;
}

export default function AyaPage() { const {locale}=useTranslation(),language=dentalFactLanguage(locale);return <UiNode as="main" className="aya-page"><Suspense><ModuleAwareChat /></Suspense><UiNode as="div" translateChildren={false} className="aya-mini-game-link" lang={language}><Link href="/mini-game">{MINI_GAME_TEXT[language].hub} ↗</Link></UiNode></UiNode>; }
