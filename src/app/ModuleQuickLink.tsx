'use client';
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import Link from "@/lib/i18n/UiLink";
import DentayaIcon, { type DentayaIconName } from './DentayaIcon';
export default function ModuleQuickLink({ icon, title, detail, href }: {
    icon: DentayaIconName;
    title: string;
    detail: string;
    href: string;
}) {
    const { t } = useTranslation();
    return <Link href={href} className="module-quick-link"><DentayaIcon name={icon} size={22}/><UiNode data-dy-copy-stack as="span" className="dy-title-detail"><UiNode as="strong">{t(title)}</UiNode><UiNode as="span">{t(detail)}</UiNode></UiNode><UiNode as="span" aria-hidden="true">→</UiNode></Link>;
}
