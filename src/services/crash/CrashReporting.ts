// Crash reports (MV-SEC-2): sent only with the user's consent, and never with conversation content or
// API keys. The event is rebuilt from an allow-list — whatever the SDK or a library adds stays out.

interface StackFrame {
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
}

interface ExceptionValue {
  type?: string;
  // Error messages can quote what was said or typed: never sent.
  value?: string;
  mechanism?: { type?: string; handled?: boolean };
  stacktrace?: { frames?: StackFrame[] };
}

// The parts of a Sentry event this app knows about; the SDK's own type is wider.
export interface CrashEvent {
  event_id?: string;
  timestamp?: number;
  platform?: string;
  level?: string;
  release?: string;
  dist?: string;
  environment?: string;
  exception?: { values?: ExceptionValue[] };
  contexts?: Record<string, Record<string, unknown> | undefined>;
  [key: string]: unknown;
}

export interface CrashSdkOptions {
  dsn: string;
  beforeSend: (event: CrashEvent) => CrashEvent | null;
}

export interface CrashSdk {
  init(options: CrashSdkOptions): void;
  close(): Promise<void>;
}

const REDACTED = '[usunięto]';
// Context fields that describe the phone and the app, not the user or what they said.
const CONTEXT_FIELDS: Record<string, string[]> = {
  os: ['name', 'version', 'build'],
  device: ['family', 'model', 'arch', 'memory_size', 'simulator'],
  app: ['app_version', 'app_build'],
};

function pick<T extends object>(source: T | undefined, keys: (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};
  if (source === undefined) return result;
  for (const key of keys) if (source[key] !== undefined) result[key] = source[key];
  return result;
}

function scrubFrame(frame: StackFrame): StackFrame {
  return pick(frame, ['filename', 'function', 'lineno', 'colno', 'in_app']);
}

function scrubException(value: ExceptionValue): ExceptionValue {
  return {
    ...pick(value, ['type']),
    ...(value.mechanism === undefined ? {} : { mechanism: pick(value.mechanism, ['type', 'handled']) }),
    ...(value.stacktrace?.frames === undefined
      ? {}
      : { stacktrace: { frames: value.stacktrace.frames.map(scrubFrame) } }),
  };
}

function scrubContexts(contexts: CrashEvent['contexts']): CrashEvent['contexts'] {
  const result: NonNullable<CrashEvent['contexts']> = {};
  for (const [name, fields] of Object.entries(CONTEXT_FIELDS)) {
    const context = contexts?.[name];
    if (context !== undefined) result[name] = pick(context, fields);
  }
  return result;
}

// Only the crash itself: error type, stack, phone and app version. No message, breadcrumbs (they log
// UI text and network calls), extra data, request or user — and any saved API key is blanked out.
export function scrubEvent(event: CrashEvent, secrets: readonly string[]): CrashEvent {
  const scrubbed: CrashEvent = {
    ...pick(event, ['event_id', 'timestamp', 'platform', 'level', 'release', 'dist', 'environment']),
    ...(event.exception?.values === undefined
      ? {}
      : { exception: { values: event.exception.values.map(scrubException) } }),
    contexts: scrubContexts(event.contexts),
  };
  let json = JSON.stringify(scrubbed);
  for (const secret of secrets) {
    if (secret.length > 0) json = json.split(JSON.stringify(secret).slice(1, -1)).join(REDACTED);
  }
  return JSON.parse(json) as CrashEvent;
}

// Starts the SDK when the user agrees and the build has somewhere to send reports; stops it when the
// consent is withdrawn. Until then nothing is initialized, so nothing can be sent.
export class CrashReporting {
  private started = false;
  private consent = false;
  private secrets: string[] = [];

  constructor(
    private readonly sdk: CrashSdk,
    private readonly dsn: string | undefined,
    private readonly loadSecrets: () => Promise<(string | null)[]>,
  ) {}

  async apply(consent: boolean): Promise<void> {
    this.consent = consent;
    if (consent) this.secrets = (await this.loadSecrets()).filter((key): key is string => key !== null);
    if (consent && !this.started && this.dsn !== undefined && this.dsn.length > 0) {
      this.started = true;
      this.sdk.init({ dsn: this.dsn, beforeSend: (event) => this.beforeSend(event) });
    } else if (!consent && this.started) {
      this.started = false;
      await this.sdk.close();
    }
  }

  // Also the last gate: an event already queued when the consent was withdrawn is dropped.
  beforeSend(event: CrashEvent): CrashEvent | null {
    return this.consent ? scrubEvent(event, this.secrets) : null;
  }
}
