import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { DENTAL_FACTS, dentalFactSource, shuffleFacts } from '../src/lib/dental-facts';
import { DENTAL_FACT_CAPACITY, dentalFactFingerprint, validateDentalFactCatalog, type DentalFactCatalog } from '../src/lib/dental-fact-schema';

const content: DentalFactCatalog = JSON.parse(readFileSync(new URL('../src/lib/i18n/dental-facts.json', import.meta.url), 'utf8'));
const result = validateDentalFactCatalog(content);
assert.deepEqual(result.errors, []);
assert.equal(result.count, 220);
assert.equal(result.sourceCount, 28);
assert.equal(content.clinicalReviewStatus, 'not-recorded');
const additions = { ...content, facts: content.facts.slice(200), sources: Object.fromEntries(Object.entries(content.sources).filter(([id]) => ['jaw-overview', 'cleft-overview', 'salivary-overview'].includes(id))) };
assert.deepEqual(validateDentalFactCatalog(additions, { requireEvidence: true }).errors, []);
assert.equal(DENTAL_FACTS.length, content.facts.length);
for (const fact of DENTAL_FACTS) assert.equal(dentalFactSource(fact).name, content.sources[fact.source].name);

const base = {
  sources: { reference: { name: 'Test reference only', url: 'https://example.org/source', license: 'CC0-1.0', licenseUrl: 'https://example.org/license', attribution: 'Synthetic test fixture, not dental information.' } },
  facts: [{ id: 'fixture-base', source: 'reference', tr: 'Bu sentetik veri yalnız birim testi için kullanılır.', en: 'This synthetic record is used only for unit testing.', evidence: { url: 'https://example.org/source', excerpt: 'Synthetic test excerpt, not a clinical source.' } }],
};
function rejected(value: unknown, expected: RegExp) {
  const validation = validateDentalFactCatalog(value, { requireEvidence: true });
  assert.equal(validation.valid, false); assert.match(validation.errors.join('\n'), expected);
}
assert.equal(validateDentalFactCatalog(base, { requireEvidence: true }).valid, true);
rejected({}, /requires/);
rejected({ ...base, sources: { reference: { ...base.sources.reference, url: 'javascript:alert(1)' } } }, /URL/);
rejected({ ...base, sources: { reference: { ...base.sources.reference, url: 'https://user:password@example.org/' } } }, /URL/);
rejected({ ...base, sources: { reference: { ...base.sources.reference, attribution: '' } } }, /attribution/);
rejected({ ...base, sources: { reference: { ...base.sources.reference, licenseUrl: undefined } } }, /license/);
rejected({ ...base, facts: [{ ...base.facts[0], source: 'missing' }] }, /Unknown source/);
rejected({ ...base, facts: [{ ...base.facts[0], tr: undefined }] }, /single-sentence tr/);
rejected({ ...base, facts: [{ ...base.facts[0], evidence: undefined }] }, /source passage/);
rejected({ ...base, facts: [base.facts[0], base.facts[0]] }, /Duplicate fact ID/);
rejected({ ...base, facts: [base.facts[0], { ...base.facts[0], id: 'fixture-other', tr: base.facts[0].tr.replace('sentetik', 'SENTETİK') }] }, /Duplicate/);
const numberFact = { ...base.facts[0], tr: 'Sentetik test tablosunda 30 ayrı satır bulunmaktadır.', en: 'The synthetic test table contains 30 separate rows.' };
rejected({ ...base, facts: [numberFact, { ...numberFact, id: 'fixture-numeric', tr: numberFact.tr.replace('30', '31'), en: numberFact.en.replace('30', '31') }] }, /numeric-variant/);
assert.equal(dentalFactFingerprint('DİŞLER   ve ２３ numara.', 'tr'), dentalFactFingerprint('dişler ve 45 numara.', 'tr'));

// These are explicitly synthetic fixtures. They never enter the shipped catalogue or its count.
const letters = (n: number) => { let value = ''; do { value = String.fromCharCode(97 + n % 26) + value; n = Math.floor(n / 26) - 1; } while (n >= 0); return value; };
const start = performance.now();
const capacityFixture = { ...base, facts: Array.from({ length: DENTAL_FACT_CAPACITY }, (_, index) => ({ ...base.facts[0], id: `fixture-${letters(index)}`, tr: `Bu sentetik test kaydı ${letters(index)} anahtarını sınar.`, en: `This synthetic test record checks the key ${letters(index)}.` })) };
assert.equal(validateDentalFactCatalog(capacityFixture, { requireEvidence: true }).valid, true);
const validationMs = performance.now() - start;
const deck = shuffleFacts(() => 0.371, DENTAL_FACT_CAPACITY);
assert.equal(deck.length, DENTAL_FACT_CAPACITY);
assert.equal(new Set(deck).size, DENTAL_FACT_CAPACITY);
assert.equal(deck.byteLength, 120_000);
assert.ok(deck.every(value => value < DENTAL_FACT_CAPACITY));
assert.throws(() => shuffleFacts(Math.random, DENTAL_FACT_CAPACITY + 1), /Invalid fact count/);
assert.equal(new Set(shuffleFacts(() => Number.NaN)).size, DENTAL_FACTS.length);
rejected({ ...base, facts: [...capacityFixture.facts, { ...base.facts[0], id: 'fixture-over-capacity' }] }, /1–30000/);
const temporary = mkdtempSync(join(tmpdir(), 'dentaya-fact-import-'));
try {
  const input = join(temporary, 'synthetic-input.json');
  const output = join(temporary, 'synthetic-preview.json');
  writeFileSync(input, JSON.stringify(base));
  const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', new URL('./import-dental-facts.ts', import.meta.url).pathname, '--input', input, ...args], { encoding: 'utf8' });
  const imported = run('--output', output);
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).facts.length, DENTAL_FACTS.length + 1);
  assert.equal(run('--output', output).status, 1, 'Existing user previews cannot be overwritten.');
  assert.equal(run('--output', new URL('../src/lib/i18n/dental-facts.json', import.meta.url).pathname).status, 1, 'An importer cannot replace the shipped catalogue.');
  assert.equal(run('--check').status, 0);
  writeFileSync(input, JSON.stringify({ ...base, facts: [{ ...base.facts[0], tr: DENTAL_FACTS[0].tr, en: DENTAL_FACTS[0].en }] }));
  assert.equal(run('--check').status, 1, 'An incoming pack cannot duplicate an inherited entry.');
} finally { rmSync(temporary, { recursive: true, force: true }); }
console.log(JSON.stringify({ pass: true, shippedDistinctFacts: result.count, shippedSources: result.sourceCount, newSourceBackedFacts: additions.facts.length, clinicallyReviewed: false, syntheticCapacityOnly: DENTAL_FACT_CAPACITY, capacityValidationMs: Math.round(validationMs), indexDeckBytesAtCapacity: deck.byteLength, requestedCountReached: false }, null, 2));
