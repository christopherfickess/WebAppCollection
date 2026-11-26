// Patterns for keys and tokens that must never be committed or published. Used by the repo scan and the built-site scan.
export const SECRET_PATTERNS = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ["Stripe live or restricted key", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/],
  ["Stripe test secret key", /\bsk_test_[A-Za-z0-9]{20,}/],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{20,}/],
  ["Resend API key", /\bre_[A-Za-z0-9]{20,}/],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Netlify personal access token", /\bnfp_[A-Za-z0-9]{30,}/],
  ["Bearer token in code", /Authorization["']?\s*[:=]\s*["'`]Bearer\s+[A-Za-z0-9._-]{24,}/i],
];
export function findSecrets(text) {
  const hits = [];
  for (const [name, re] of SECRET_PATTERNS) if (re.test(text)) hits.push(name);
  return hits;
}
