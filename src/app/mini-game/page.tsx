'use client';
import UiNode from '@/lib/i18n/UiNode';
import Link from '@/lib/i18n/UiLink';
import {useTranslation} from '@/lib/i18n';
import {dentalFactLanguage} from '@/lib/dental-facts';
import {LOADING_PLAY_TEXT} from '@/lib/i18n/loading-play';
import MiniGameHub from '../loading-play/MiniGameHub';
import {MINI_GAME_TEXT} from '@/lib/i18n/mini-games';
import DentalFacts from '../loading-play/DentalFacts';
export default function MiniGame(){const {locale}=useTranslation(),language=dentalFactLanguage(locale),copy=LOADING_PLAY_TEXT[language],games=MINI_GAME_TEXT[language];return <UiNode as="main" translateChildren={false} className="kusp-page" lang={language} dir="ltr"><UiNode as="header" translateChildren={false}><Link href="/workspace">← {copy.back}</Link><UiNode as="small" translateChildren={false}>{copy.tag}</UiNode><UiNode as="h1" translateChildren={false}>{games.hub}</UiNode></UiNode><UiNode as="div" translateChildren={false} className="kusp-page-grid"><MiniGameHub/><UiNode as="div" translateChildren={false}><DentalFacts showGame={false}/><UiNode as="p" translateChildren={false} className="kusp-language-note">{copy.footer}</UiNode></UiNode></UiNode></UiNode>;}
