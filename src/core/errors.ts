export type DomainErrorCode =
  | 'invalid_api_key'
  | 'rate_limited'
  | 'network_unavailable'
  | 'provider_error'
  | 'model_missing'
  | 'model_download_failed'
  | 'checksum_mismatch'
  | 'microphone_denied'
  | 'host_not_allowed'
  | 'storage_error'
  | 'empty_title'
  | 'topic_not_found';

const USER_MESSAGES: Record<DomainErrorCode, string> = {
  invalid_api_key: 'Nieprawidłowy klucz API',
  rate_limited: 'Przekroczony limit',
  network_unavailable: 'Brak połączenia z siecią',
  provider_error: 'Dostawca modelu zwrócił błąd',
  model_missing: 'Model nie jest pobrany na urządzenie',
  model_download_failed: 'Nie udało się pobrać modelu',
  checksum_mismatch: 'Pobrany plik jest uszkodzony',
  microphone_denied: 'Brak dostępu do mikrofonu',
  host_not_allowed: 'Połączenie z tym adresem jest zablokowane',
  storage_error: 'Błąd zapisu danych na urządzeniu',
  empty_title: 'Nazwa tematu nie może być pusta',
  topic_not_found: 'Temat nie istnieje',
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly userMessage: string;

  constructor(code: DomainErrorCode, detail?: string, options?: { cause?: unknown }) {
    super(detail ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
