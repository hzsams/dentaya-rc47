'use client';
import UiNode from '@/lib/i18n/UiNode';
import Link from '@/lib/i18n/UiLink';
import UserText from '@/lib/i18n/UserText';
import { useTranslation } from '@/lib/i18n';
import { ayaExperienceText } from '@/lib/i18n/aya-experience';
import { normalizeAyaReferences } from '@/lib/aya-references';
import './aya-sources.css';

export default function AyaSources({ references, onInternalReference }: {
  references: unknown;
  onInternalReference?: (href: string) => void;
}) {
  const { locale } = useTranslation(), copy = ayaExperienceText(locale);
  const sources = normalizeAyaReferences(references);
  if (!sources.length) return null;
  return <UiNode as="details" className="aya-sources" translateChildren={false}>
    <UiNode as="summary" translateChildren={false}><UiNode as="span">{copy.selectedSources}</UiNode><UiNode as="span">{sources.length}</UiNode></UiNode>
    <UiNode as="ul" translateChildren={false}>{sources.map(source => <UiNode as="li" key={source.id} translateChildren={false}>
      {/^(?:https):/i.test(source.href) ? <UiNode as="a" href={source.href} target="_blank" rel="noopener noreferrer" translateChildren={false}>
        <UserText>{source.title}</UserText><UiNode as="small" translateChildren={false}><UserText>{new URL(source.href).hostname}</UserText><UiNode as="span" className="sr-only"> · {copy.externalSource}</UiNode> ↗</UiNode>
      </UiNode> : <Link href={source.href} translateChildren={false} onClick={() => onInternalReference?.(source.href)}><UserText>{source.title}</UserText> →</Link>}
    </UiNode>)}</UiNode>
  </UiNode>;
}
