/** The database issues 24 random bytes encoded as a 48-character hex token. */
export function teamInviteToken(value: string): string | null {
  let token = value.trim();
  if (!/^[a-f0-9]{48}$/i.test(token)) {
    try { token = new URL(token).searchParams.get("token")?.trim() ?? ""; }
    catch { return null; }
  }
  return /^[a-f0-9]{48}$/i.test(token) ? token.toLowerCase() : null;
}
