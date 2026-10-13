import { DomainError } from '../errors';
import { assertAllowedOutboundUrl, isAllowedOutboundUrl } from '../networkPolicy';
import { listSourceFiles, readSource } from './sourceScan';

describe('networkPolicy', () => {
  it.each([
    'https://api.openai.com/v1/chat/completions',
    'https://api.anthropic.com/v1/messages',
    'https://generativelanguage.googleapis.com/v1beta/models',
    'https://api.llama.com/v1/chat/completions',
    'https://huggingface.co/Qwen/model.gguf',
    'https://cdn-lfs.huggingface.co/repos/abc',
    'https://o123.ingest.sentry.io/api/1/envelope/',
  ])('allows declared outbound host %s', (url) => {
    expect(isAllowedOutboundUrl(url)).toBe(true);
  });

  it.each([
    'https://example.com/collect',
    'https://evilhuggingface.co/model.gguf',
    'https://api.openai.com.attacker.net/v1',
    'https://eu.api.openai.com/v1',
    'http://api.openai.com/v1/chat/completions',
    'not a url',
  ])('rejects undeclared or insecure target %s', (url) => {
    expect(isAllowedOutboundUrl(url)).toBe(false);
  });

  it('rejects an allowed host used for a different purpose', () => {
    expect(() => assertAllowedOutboundUrl('https://sentry.io/api', 'llm_provider')).toThrow(DomainError);
    expect(() => assertAllowedOutboundUrl('https://api.openai.com/v1', 'llm_provider')).not.toThrow();
  });

  // specky: crit 01M4TPSAXFZS7QFASVK9MH6MTT
  it('every URL literal in production code points to a declared outbound host', () => {
    const urlPattern = /https?:\/\/[^\s'"`)]+/g;
    const offending = listSourceFiles().flatMap((file) =>
      (readSource(file).match(urlPattern) ?? [])
        .filter((url) => !isAllowedOutboundUrl(url))
        .map((url) => `${file}: ${url}`),
    );
    expect(offending).toEqual([]);
  });
});
