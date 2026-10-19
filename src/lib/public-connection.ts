type PublicConnectionInput = { url?: string; publishableKey?: string; anonKey?: string };

/** Public configuration is optional for local tools. Empty template values are absent. */
export function resolvePublicConnection(input: PublicConnectionInput) {
  const url = input.url?.trim() || null;
  const publishable = input.publishableKey?.trim() || null;
  const anon = input.anonKey?.trim() || null;
  const key = publishable || anon;
  let validUrl = false;
  if (url) {
    try {
      const parsed = new URL(url);
      validUrl = ['https:', 'http:'].includes(parsed.protocol) && Boolean(parsed.hostname) &&
        !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
    } catch { /* Keep the local application usable while setup is corrected. */ }
  }
  const isConfigured = Boolean(validUrl && key);
  return {
    isConfigured,
    status: url && !validUrl ? 'invalid' as const : isConfigured ? 'configured' as const : 'missing' as const,
    url,
    keySource: publishable ? 'publishable' as const : anon ? 'anon' as const : null,
    clientUrl: isConfigured ? url! : 'http://127.0.0.1:54321',
    clientKey: isConfigured ? key! : 'dentaya-public-key-not-configured',
  };
}
