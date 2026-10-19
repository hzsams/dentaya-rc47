/**
 * Validate a separately prepared TR/EN content pack and write a merged preview.
 * This performs structural/deduplication checks, not clinical or translation review.
 * node --import tsx scripts/import-dental-facts.ts --input /path/pack.json --output /tmp/preview.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDentalFactCatalog, type DentalFactCatalog } from '../src/lib/dental-fact-schema';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arguments_ = process.argv.slice(2);
function argument(name: string) {
  const index = arguments_.indexOf(name);
  return index < 0 ? undefined : arguments_[index + 1];
}
async function main() {
  const input = argument('--input');
  const output = argument('--output');
  if (!input || (!output && !arguments_.includes('--check'))) throw new Error('Use --input PACK.json with --output NEW.json or --check.');
  const basePath = resolve(root, 'src/lib/i18n/dental-facts.json');
  if (output && resolve(output) === basePath) throw new Error('Write a separate preview first; the shipped catalogue is protected from direct import.');
  const candidate: unknown = JSON.parse(await readFile(resolve(input), 'utf8'));
  const candidateCheck = validateDentalFactCatalog(candidate, { requireEvidence: true });
  if (!candidateCheck.valid) throw new Error(candidateCheck.errors.join('\n'));
  const pack = candidate as DentalFactCatalog;
  const base: DentalFactCatalog = JSON.parse(await readFile(basePath, 'utf8'));
  const baseCheck = validateDentalFactCatalog(base);
  if (!baseCheck.valid) throw new Error(`Existing catalogue is invalid:\n${baseCheck.errors.join('\n')}`);
  for (const [key, source] of Object.entries(pack.sources)) {
    if (Object.hasOwn(base.sources, key) && JSON.stringify(base.sources[key]) !== JSON.stringify(source)) throw new Error(`Source ${key} conflicts with an existing source; use a new source ID.`);
  }
  const merged: DentalFactCatalog = {
    schemaVersion: 1,
    contentUpdatedAt: new Date().toISOString().slice(0, 10),
    clinicalReviewStatus: 'not-recorded',
    sources: { ...base.sources, ...pack.sources },
    facts: [...base.facts, ...pack.facts],
  };
  const check = validateDentalFactCatalog(merged);
  if (!check.valid) throw new Error(check.errors.join('\n'));
  if (output) await writeFile(resolve(output), JSON.stringify(merged, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ valid: true, existing: base.facts.length, added: pack.facts.length, total: merged.facts.length, sources: check.sourceCount, output: output ? resolve(output) : null, clinicalAccuracyVerified: false }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Import failed.'); process.exitCode = 1; });
