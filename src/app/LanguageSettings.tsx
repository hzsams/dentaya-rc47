'use client';
import LanguagePackSettings from "./LanguagePackSettings";
import UiNode from "@/lib/i18n/UiNode";
import { useId, useState } from 'react';
import { LANGUAGES, languageInfo, changeLocale, useTranslation } from '@/lib/i18n';
export function LanguageSelect({ compact = false }: {
    compact?: boolean;
}) {
    const { t, locale } = useTranslation(), id = useId();
    const [failed, setFailed] = useState(false), [loading,setLoading]=useState(false);
    async function select(value:string){setLoading(true);setFailed(false);try{setFailed(!await changeLocale(value));}catch{setFailed(true);}finally{setLoading(false);}}
    return <UiNode as="div" className={compact ? 'language-select language-select--compact' : 'language-select'}>
  <UiNode as="label" htmlFor={id}>{t('Arayüz dili')}</UiNode>
  <UiNode as="select" id={id} value={locale} disabled={loading} aria-busy={loading} aria-label="Arayüz dili" onChange={e => void select(e.target.value)}>
   {LANGUAGES.map(language => <UiNode as="option" key={language.id} value={language.id} lang={language.id} translateChildren={false}>{language.name}</UiNode>)}
  </UiNode>
  {failed && <UiNode as="small" role="status">Dil değiştirilemedi. Yeniden deneyin.</UiNode>}
 </UiNode>;
}
export default function LanguageSettings() {
    const { t, locale } = useTranslation(), tag = languageInfo(locale).tag;
    return <UiNode as="section" id="language-settings" className="language-settings"><UiNode as="h3">{t('Dil ve bölge')}</UiNode><LanguageSelect />
  <UiNode as="p">{t('Dil tercihi bu cihazda kaydedilir.')}</UiNode>
  <UiNode as="div" className="language-examples"><UiNode as="strong">{t('Tarih ve sayı örnekleri')}</UiNode>
   <UiNode as="span">{new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-10-03T12:00:00Z'))}</UiNode>
   <UiNode as="span" dir="auto">{new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(12345.67)}</UiNode>
   <UiNode as="span" dir="auto">{new Intl.NumberFormat(tag, { style: 'currency', currency: 'TRY' }).format(1250.5)}</UiNode>
  </UiNode>
  <UiNode as="p" className="language-scope">46 dil için bütün sabit arayüz metinleri uygulamayla birlikte gelir. Dil değişimi bütün modüllere uygulanır.</UiNode>
 <LanguagePackSettings key={locale}/></UiNode>;
}
export function SkipToContent() { const { t } = useTranslation(); return <UiNode as="a" className="skip-link" href="#main-content">{t('Ana içeriğe geç')}</UiNode>; }
