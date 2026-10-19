/** Loading cards are authored in Turkish and English; other UI languages use English. */
export function dentalFactLanguage(locale: string): 'tr' | 'en' {
  return locale === 'tr' ? 'tr' : 'en';
}
