import { DomainError, isDomainError } from '../errors';

describe('DomainError', () => {
  it('carries a code and a Polish message for the user', () => {
    const error = new DomainError('invalid_api_key', 'HTTP 401 from provider');
    expect(error.code).toBe('invalid_api_key');
    expect(error.userMessage).toBe('Nieprawidłowy klucz API');
    expect(error.message).toBe('HTTP 401 from provider');
  });

  it('keeps the original cause for diagnostics', () => {
    const cause = new Error('socket hang up');
    const error = new DomainError('network_unavailable', undefined, { cause });
    expect((error as { cause?: unknown }).cause).toBe(cause);
    expect(error.message).toBe('network_unavailable');
  });

  it('is recognised by the type guard, plain errors are not', () => {
    expect(isDomainError(new DomainError('rate_limited'))).toBe(true);
    expect(isDomainError(new Error('x'))).toBe(false);
  });
});
