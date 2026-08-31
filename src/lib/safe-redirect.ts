/**
 * Restricts a caller-supplied redirect target to this origin.
 *
 * The `next` parameter on the auth callback is attacker-controlled: a sign-in
 * link could carry `next=https://evil.example` and bounce a freshly
 * authenticated user off-site, which is a credible phishing step.
 *
 * Anything that is not a plain same-origin absolute path falls back to the
 * locale home.
 */
export function safeNextPath(
  next: string | null | undefined,
  locale: string,
): string {
  const fallback = `/${locale}`;
  if (!next) return fallback;

  // Must be an absolute path on this origin.
  if (!next.startsWith("/")) return fallback;

  // "//host" and "/\\host" start with a slash but browsers resolve both to a
  // different origin — the classic protocol-relative bypass.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;

  // Backslashes are normalised to "/" by some browsers, and whitespace or
  // control characters can be used to smuggle one past a naive check.
  if (/[\\\s\u0000-\u001f\u007f]/.test(next)) return fallback;

  return next;
}
