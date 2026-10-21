export type AyaReference = { id: string; title: string; href: string };

/** References are data, never executable URLs or model instructions. */
export function normalizeAyaReferences(value: unknown): AyaReference[] {
  if (!Array.isArray(value)) return [];
  const result: AyaReference[] = [], seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const reference = item as Partial<AyaReference>;
    if (typeof reference.id !== 'string' || typeof reference.title !== 'string' || typeof reference.href !== 'string') continue;
    const id = reference.id.trim().slice(0, 80), title = reference.title.trim().slice(0, 200), href = reference.href;
    if (!id || !title || href.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(href)) continue;
    let safe = false;
    try {
      if (/^\/(?!\/)/.test(href)) safe = new URL(href, 'https://dentaya.invalid').origin === 'https://dentaya.invalid';
      else {
        const url = new URL(href);
        safe = url.protocol === 'https:' && !url.username && !url.password && !url.port;
      }
    } catch { /* Ignore malformed reference data. */ }
    if (!safe || seen.has(id) || seen.has(href)) continue;
    seen.add(id); seen.add(href); result.push({ id, title, href });
    if (result.length === 8) break;
  }
  return result;
}
