/** Structural validation never establishes the clinical accuracy of a source or translation. */
export const DENTAL_FACT_CAPACITY = 30_000;
export type DentalFactLanguage = 'tr' | 'en';
export type DentalFact = {
  id: string;
  source: string;
  tr: string;
  en: string;
  evidence?: { url: string; excerpt: string };
};
export type DentalFactSource = {
  name: string;
  url: string;
  attribution?: string;
  license?: string;
  licenseUrl?: string;
  originalUrl?: string;
};
export type DentalFactCatalog = {
  schemaVersion?: number;
  contentUpdatedAt?: string;
  clinicalReviewStatus?: string;
  sources: Record<string, DentalFactSource>;
  facts: DentalFact[];
};
export type DentalFactValidation = { valid: boolean; errors: string[]; count: number; sourceCount: number };

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function httpsURL(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443');
  } catch { return false; }
}

/** Ignore punctuation, Unicode width, whitespace and numeric substitutions when finding duplicates. */
export function dentalFactFingerprint(text: string, language: DentalFactLanguage): string {
  return text.normalize('NFKC').toLocaleLowerCase(language).replace(/\p{N}+/gu, '#').replace(/[^\p{L}#]+/gu, ' ').trim();
}

/** requireEvidence applies to new imported entries, not to the inherited source-linked catalogue. */
export function validateDentalFactCatalog(value: unknown, options: { requireEvidence?: boolean; maxFacts?: number } = {}): DentalFactValidation {
  const errors: string[] = [];
  const fail = (message: string) => { if (errors.length < 100) errors.push(message); };
  if (!record(value) || !record(value.sources) || !Array.isArray(value.facts)) {
    return { valid: false, errors: ['Catalogue requires sources and facts.'], count: 0, sourceCount: 0 };
  }
  const sourceKeys = Object.keys(value.sources);
  const maxFacts = options.maxFacts ?? DENTAL_FACT_CAPACITY;
  if (value.facts.length < 1 || value.facts.length > maxFacts) fail(`Catalogue must contain 1–${maxFacts} entries.`);
  if (sourceKeys.length < 1 || sourceKeys.length > 3000) fail('Catalogue must contain 1–3000 sources.');
  for (const [key, source] of Object.entries(value.sources)) {
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(key) || !record(source)) { fail(`Invalid source ${key}.`); continue; }
    if (typeof source.name !== 'string' || source.name.trim().length < 4 || source.name.length > 240) fail(`Invalid source name: ${key}.`);
    if (!httpsURL(source.url)) fail(`Invalid source URL: ${key}.`);
    if (source.originalUrl !== undefined && !httpsURL(source.originalUrl)) fail(`Invalid original URL: ${key}.`);
    if (options.requireEvidence) {
      if (typeof source.attribution !== 'string' || source.attribution.trim().length < 8) fail(`Missing attribution: ${key}.`);
      if (typeof source.license !== 'string' || source.license.trim().length < 3) fail(`Missing reuse terms: ${key}.`);
      if (!httpsURL(source.licenseUrl)) fail(`Missing license evidence: ${key}.`);
    }
  }
  const ids = new Set<string>();
  const texts = { tr: new Set<string>(), en: new Set<string>() };
  for (const [index, fact] of value.facts.entries()) {
    const label = record(fact) && typeof fact.id === 'string' ? fact.id : `row ${index + 1}`;
    if (!record(fact)) { fail(`Invalid fact ${label}.`); continue; }
    if (typeof fact.id !== 'string' || !/^[a-z][a-z0-9-]{2,95}$/.test(fact.id)) fail(`Invalid fact ID: ${label}.`);
    else if (ids.has(fact.id)) fail(`Duplicate fact ID: ${label}.`);
    else ids.add(fact.id);
    if (typeof fact.source !== 'string' || !Object.hasOwn(value.sources, fact.source)) fail(`Unknown source: ${label}.`);
    for (const language of ['tr', 'en'] as const) {
      const text = fact[language];
      if (typeof text !== 'string' || text.trim() !== text || text.length < 24 || text.length > 210 || !/^[^.!?\n\r]+\.$/u.test(text)) {
        fail(`Invalid single-sentence ${language} text: ${label}.`); continue;
      }
      const fingerprint = dentalFactFingerprint(text, language);
      if (texts[language].has(fingerprint)) fail(`Duplicate or numeric-variant ${language} text: ${label}.`);
      texts[language].add(fingerprint);
    }
    if (fact.evidence !== undefined || options.requireEvidence) {
      if (!record(fact.evidence) || !httpsURL(fact.evidence.url) || typeof fact.evidence.excerpt !== 'string' || fact.evidence.excerpt.trim().length < 20 || fact.evidence.excerpt.length > 2000) {
        fail(`Missing source passage: ${label}.`);
      }
    }
  }
  return { valid: errors.length === 0, errors, count: value.facts.length, sourceCount: sourceKeys.length };
}
