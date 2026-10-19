import content from './i18n/dental-facts.json';
import { dentalFactLanguage } from './dental-language';
import type { DentalFact, DentalFactCatalog } from './dental-fact-schema';

export { dentalFactLanguage } from './dental-language';
export type { DentalFact } from './dental-fact-schema';
const catalogue: DentalFactCatalog = content;
/** The displayed count always comes from shipped entries, never the requested capacity. */
export const DENTAL_FACTS: readonly DentalFact[] = catalogue.facts;
export function dentalFactSource(fact: DentalFact) { return catalogue.sources[fact.source]; }

/** A compact index deck needs 120 KB at 30,000 entries; content is never duplicated into it. */
export function shuffleFacts(random: () => number = Math.random, count: number = DENTAL_FACTS.length): Uint32Array {
  if (!Number.isSafeInteger(count) || count < 1 || count > 30_000) throw new RangeError('Invalid fact count.');
  const values = Uint32Array.from({ length: count }, (_, index) => index);
  for (let i = values.length - 1; i > 0; i--) {
    const sample = random();
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(sample) ? sample : 0) * (i + 1))));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
const bags = new Map<string, { deck: Uint32Array; cursor: number; last: number }>();
export function nextDentalFact(locale: string): DentalFact {
  const language = dentalFactLanguage(locale);
  let bag = bags.get(language);
  if (!bag) { bag = { deck: new Uint32Array(), cursor: 0, last: -1 }; bags.set(language, bag); }
  if (bag.cursor === 0) {
    bag.deck = shuffleFacts(); bag.cursor = bag.deck.length;
    const last = bag.deck.length - 1;
    if (bag.deck[last] === bag.last && last > 0) [bag.deck[0], bag.deck[last]] = [bag.deck[last], bag.deck[0]];
  }
  const index = bag.deck[--bag.cursor]; bag.last = index;
  return DENTAL_FACTS[index];
}
