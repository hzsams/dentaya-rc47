'use client';
import UiNode from "@/lib/i18n/UiNode";
import Link from '@/lib/i18n/UiLink';
import {useTranslation} from '@/lib/i18n';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import {dentalFactLanguage} from '@/lib/dental-language';
import AyaChat from './AyaChat';
export default function AyaPage() { const {locale}=useTranslation(),language=dentalFactLanguage(locale);return <UiNode as="main" className="aya-page"><AyaChat /><UiNode as="div" translateChildren={false} className="aya-mini-game-link" lang={language}><Link href="/mini-game">{MINI_GAME_TEXT[language].hub} ↗</Link></UiNode></UiNode>; }
