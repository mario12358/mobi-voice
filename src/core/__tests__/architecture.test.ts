import { listSourceFiles, readSource } from './sourceScan';

const ACCOUNT_FLOW_PATTERN =
  /\b(login|log_in|logIn|signIn|sign_in|signUp|sign_up|signup|password|logowanie|rejestracja|zaloguj|zarejestruj)\b/i;

describe('architecture: device-only app without accounts', () => {
  it('scans a non-empty set of production files', () => {
    expect(listSourceFiles()).toContain('core/networkPolicy.ts');
  });

  // specky: crit 01M4TPSAXFSFAKMYTR66T2XE10
  it('production code contains no login, registration or password flow', () => {
    const offending = listSourceFiles().filter(
      (file) => ACCOUNT_FLOW_PATTERN.test(file) || ACCOUNT_FLOW_PATTERN.test(readSource(file)),
    );
    expect(offending).toEqual([]);
  });
});
