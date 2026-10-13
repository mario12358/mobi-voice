import { DomainError } from './errors';

export type OutboundPurpose = 'llm_provider' | 'model_download' | 'crash_reports';

interface AllowedHost {
  domain: string;
  purpose: OutboundPurpose;
  includeSubdomains: boolean;
}

// Mirrors ralph/BEZPIECZENSTWO.md → Wyjścia; the app has no backend of its own (MV-PLAT-2).
export const ALLOWED_HOSTS: readonly AllowedHost[] = [
  { domain: 'api.openai.com', purpose: 'llm_provider', includeSubdomains: false },
  { domain: 'api.anthropic.com', purpose: 'llm_provider', includeSubdomains: false },
  { domain: 'generativelanguage.googleapis.com', purpose: 'llm_provider', includeSubdomains: false },
  { domain: 'api.llama.com', purpose: 'llm_provider', includeSubdomains: false },
  // Hugging Face serves large files through CDN subdomains after a redirect.
  { domain: 'huggingface.co', purpose: 'model_download', includeSubdomains: true },
  // ...and redirects downloads to its CDN (e.g. us.aws.cdn.hf.co).
  { domain: 'hf.co', purpose: 'model_download', includeSubdomains: true },
  { domain: 'sentry.io', purpose: 'crash_reports', includeSubdomains: true },
];

function matchesHost(hostname: string, allowed: AllowedHost): boolean {
  if (hostname === allowed.domain) return true;
  return allowed.includeSubdomains && hostname.endsWith(`.${allowed.domain}`);
}

export function findAllowedHost(url: string): AllowedHost | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:') return undefined;
  const hostname = parsed.hostname.toLowerCase();
  return ALLOWED_HOSTS.find((allowed) => matchesHost(hostname, allowed));
}

export function isAllowedOutboundUrl(url: string): boolean {
  return findAllowedHost(url) !== undefined;
}

export function assertAllowedOutboundUrl(url: string, purpose: OutboundPurpose): void {
  const allowed = findAllowedHost(url);
  if (allowed?.purpose === purpose) return;
  throw new DomainError('host_not_allowed', `Outbound ${purpose} request blocked: ${url}`);
}
